import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { z } from 'zod';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { DraftsService, type SaveResult, type Tx } from '../drafts/drafts.service';
import type { SessionAdmin } from '../../common/types/session-admin';
import { sameSnapshot } from '../../common/utils/snapshot';
import { SURFACES, type CreateEntryDto, type Surface, type UpdateEntryDto } from './dto/app-content.dto';

/**
 * App Content (guide §22, PRODUCT_SPEC §21; API_REQUESTS #24): Terms, Privacy, Help / enquiry and
 * page FAQs. Two steps:
 * 1. Entry edits change the working draft (`AppContentEntry`) directly, with no approval — parents
 *    never see it — and every edit is audited.
 * 2. "Publish new version" goes through the draft workflow (`AppContentVersion`) and freezes the
 *    working draft as version n+1. Versions are immutable; parent sessions keep the one they started with.
 *
 * Decisions 2026-10-16:
 * 1. Base seed fills the working draft only; the demo seed also publishes version 1.
 * 2. One pending publish at a time: publishing again updates it (same draftId); a direct publish closes it.
 * 3. Approving a request after another version was published → 409 (its `before` is the latest version).
 * 4. Nothing changed since the latest version → refused.
 * 5. Keys are fixed; `page` only for Page FAQs; a PATCH that changes nothing isn't audited.
 * 6. GET `pending` = { draftId, status, entries, authorName, createdAt }.
 * 7. `publishedById` = the admin who asked for the publish (the approver is in Draft approvals / audit).
 * 8. History: version, publishedAt, entryCount, publishedByName — newest first.
 */

export const VERSION_ENTITY = 'AppContentVersion';
const ENTRY_ENTITY = 'AppContentEntry';
const SECTION = 'App Content';
/** The draft's entityId: a publish request is checked against whatever version is latest. */
const LATEST = 'latest';
const PAGE = 'Enter the parent page route for this FAQ.';
const KEY = 'Use a unique key with letters, numbers, dots, underscores or hyphens.';
const SURFACE_ORDER = new Map(SURFACES.map((s, i) => [s, i]));

const entrySchema = z.object({ surface: z.enum(SURFACES), page: z.string().nullable(), title: z.string(), body: z.string() });
const entriesSchema = z.record(entrySchema);
type VersionEntries = z.infer<typeof entriesSchema>;

const payloadSchema = z.object({
  /** The working draft when submitted: approval publishes exactly this. */
  entries: entriesSchema,
  /** Who asked for the publish (decision 7). */
  authorId: z.string(),
  /** 'draft' = "Save in draft"; 'publish' = waiting for approval. */
  requested: z.enum(['publish', 'draft']),
});
type PublishPayload = z.infer<typeof payloadSchema>;

/** `latest` → the newest version (version 0, no entries, before the first publish); a number → that version. */
async function snapshot(tx: Tx, id: string) {
  const row =
    id === LATEST
      ? await tx.appContentVersion.findFirst({ orderBy: { version: 'desc' } })
      : await tx.appContentVersion.findUnique({ where: { version: Number(id) || -1 } });
  if (!row) return id === LATEST ? { version: 0, entries: {} } : null;
  return { version: row.version, entries: row.entries as VersionEntries };
}

/** What a version stores per key. */
const toVersionEntries = (rows: { key: string; surface: Surface; page: string | null; title: string; body: string }[]): VersionEntries =>
  Object.fromEntries(rows.map((r) => [r.key, { surface: r.surface, page: r.page, title: r.title, body: r.body }]));

@Injectable()
export class AppContentService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly drafts: DraftsService,
    private readonly audit: AuditService,
  ) {}

  onModuleInit() {
    this.drafts.register<PublishPayload>(VERSION_ENTITY, {
      snapshot,
      apply: async (tx, _id, raw) => {
        const p = payloadSchema.parse(raw);
        // Numbered latest + 1 (not the column's sequence, which skips numbers after a rollback).
        const latest = await tx.appContentVersion.findFirst({ orderBy: { version: 'desc' }, select: { version: true } });
        const created = await tx.appContentVersion.create({ data: { version: (latest?.version ?? 0) + 1, entries: p.entries, publishedById: p.authorId } });
        return String(created.version);
      },
    });
  }

  private async workingDraft(db: Tx = this.prisma) {
    const rows = await db.appContentEntry.findMany();
    return rows.sort(
      (a, b) =>
        SURFACE_ORDER.get(a.surface)! - SURFACE_ORDER.get(b.surface)! ||
        (a.page ?? '').localeCompare(b.page ?? '') ||
        a.key.localeCompare(b.key, undefined, { numeric: true }),
    );
  }

  private pendingPublish() {
    return this.prisma.draftApproval.findFirst({
      where: { entityType: VERSION_ENTITY, status: 'PENDING' },
      include: { author: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get() {
    const [entries, versions, pending] = await Promise.all([
      this.workingDraft(),
      this.prisma.appContentVersion.findMany({ orderBy: { version: 'desc' } }),
      this.pendingPublish(),
    ]);
    const publisherIds = [...new Set(versions.map((v) => v.publishedById).filter((id): id is string => Boolean(id)))];
    const publishers = new Map((await this.prisma.adminUser.findMany({ where: { id: { in: publisherIds } }, select: { id: true, name: true } })).map((a) => [a.id, a.name]));
    const latest = versions[0];
    const pendingContent = pending ? payloadSchema.safeParse(pending.after) : null;

    return {
      entries: entries.map(({ key, surface, page, title, body }) => ({ key, surface, page, title, body })),
      versions: versions.map((v) => ({
        version: v.version,
        publishedAt: v.publishedAt.toISOString(),
        entryCount: Object.keys(v.entries as object).length,
        publishedByName: v.publishedById ? (publishers.get(v.publishedById) ?? null) : null,
      })),
      latest: latest ? { version: latest.version, entries: latest.entries as VersionEntries } : null,
      pending:
        pending && pendingContent?.success
          ? {
              draftId: pending.id,
              status: pendingContent.data.requested === 'draft' ? ('DRAFT' as const) : ('PENDING_APPROVAL' as const),
              entries: pendingContent.data.entries,
              authorName: pending.author.name,
              createdAt: pending.createdAt.toISOString(),
            }
          : null,
    };
  }

  /** `page` is kept only for Page FAQs, and must look like a parent-app route. */
  private clean(dto: UpdateEntryDto) {
    let page: string | null = null;
    if (dto.surface === 'PAGE_FAQ') {
      if (typeof dto.page !== 'string' || !/^[a-zA-Z][\w-]*$/.test(dto.page)) throw new BadRequestException(PAGE);
      page = dto.page;
    }
    return { surface: dto.surface, page, title: dto.title, body: dto.body };
  }

  private entryRow(e: { key: string; surface: Surface; page: string | null; title: string; body: string }) {
    return { key: e.key, surface: e.surface, page: e.page, title: e.title, body: e.body };
  }

  async createEntry(admin: SessionAdmin, dto: CreateEntryDto) {
    const data = { key: dto.key, ...this.clean(dto) };
    return this.prisma.$transaction(async (tx) => {
      if (await tx.appContentEntry.findUnique({ where: { key: dto.key } })) throw new BadRequestException(KEY);
      const created = await tx.appContentEntry.create({ data });
      await this.audit.write(admin, { action: `Added App Content entry: ${created.key}`, section: SECTION, entityType: ENTRY_ENTITY, entityId: created.key, after: this.entryRow(created) }, tx);
      return this.entryRow(created);
    });
  }

  async updateEntry(admin: SessionAdmin, key: string, dto: UpdateEntryDto) {
    const data = this.clean(dto);
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.appContentEntry.findUnique({ where: { key } });
      if (!existing) throw new NotFoundException('Entry not found.');
      const before = this.entryRow(existing);
      if (sameSnapshot(before, { key, ...data })) return before; // nothing changed: no audit (decision 5)
      const updated = await tx.appContentEntry.update({ where: { key }, data });
      await this.audit.write(admin, { action: `Updated App Content entry: ${key}`, section: SECTION, entityType: ENTRY_ENTITY, entityId: key, before, after: this.entryRow(updated) }, tx);
      return this.entryRow(updated);
    });
  }

  /** Removes the entry from the next version only: published versions keep it. */
  async deleteEntry(admin: SessionAdmin, key: string) {
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.appContentEntry.findUnique({ where: { key } });
      if (!existing) throw new NotFoundException('Entry not found.');
      await tx.appContentEntry.delete({ where: { key } });
      await this.audit.write(admin, { action: `Deleted App Content entry: ${key}`, section: SECTION, entityType: ENTRY_ENTITY, entityId: key, before: this.entryRow(existing) }, tx);
    });
    return { ok: true as const };
  }

  /** "Publish new version": the working draft as version n+1, now or after approval (decisions 2–4). */
  async publish(admin: SessionAdmin, mode: 'publish' | 'draft'): Promise<SaveResult> {
    const [draft, latest, pending] = await Promise.all([this.workingDraft(), snapshot(this.prisma, LATEST), this.pendingPublish()]);
    const entries = toVersionEntries(draft);
    if (sameSnapshot(entries, latest!.entries)) {
      throw new BadRequestException(latest!.version ? `Nothing has changed since version ${latest!.version}.` : 'Add some entries before publishing.');
    }
    return this.drafts.saveOrDraft<PublishPayload>({
      admin,
      mode,
      section: SECTION,
      entityType: VERSION_ENTITY,
      entityId: LATEST,
      payload: { entries, authorId: admin.id, requested: mode },
      label: `App Content version ${latest!.version + 1}`,
      pendingDraftId: pending?.id ?? null,
    });
  }
}
