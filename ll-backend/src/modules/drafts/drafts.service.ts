import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { sameSnapshot } from '../../common/utils/snapshot';
import { toJson } from '../../common/utils/json';
import { collectRefs } from '../../common/utils/draft-refs';
import { draftContexts, resolveNames } from './draft-names';
import { canPublish, isSuperAdmin, type SessionAdmin } from '../../common/types/session-admin';

/**
 * The draft-approval workflow (guide §2), enforced server-side for every publishable entity.
 *
 * A module registers a DraftHandler per entity type (in its service's onModuleInit), then calls
 * `saveOrDraft()`:
 *  - mode 'publish' by an admin who may publish → applied immediately + audited.
 *  - otherwise → stored as a DraftApproval; published data is untouched.
 * Approving re-checks that the published snapshot still equals the draft's `before`
 * (optimistic concurrency), then applies it through the same handler.
 */

export type Tx = Prisma.TransactionClient;
export type SaveMode = 'publish' | 'draft';
export type SaveResult = { status: 'published'; id: string } | { status: 'draft'; draftId: string };

export interface DraftHandler<T = unknown> {
  /** Published snapshot of the entity (null if it does not exist yet). */
  snapshot(tx: Tx, entityId: string): Promise<unknown | null>;
  /** Apply a validated payload. Returns the entity id (new id when creating). */
  apply(tx: Tx, entityId: string | null, payload: T): Promise<string>;
}

@Injectable()
export class DraftsService {
  private readonly handlers = new Map<string, DraftHandler>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  register<T>(entityType: string, handler: DraftHandler<T>) {
    this.handlers.set(entityType, handler as DraftHandler);
  }

  private handler(entityType: string) {
    const handler = this.handlers.get(entityType);
    if (!handler) throw new BadRequestException(`No draft handler registered for ${entityType}`);
    return handler;
  }

  saveOrDraft<T>(opts: {
    admin: SessionAdmin;
    mode: SaveMode;
    section: string;
    entityType: string;
    entityId: string | null;
    payload: T;
    regionId?: string;
    /** Short label for the audit log, e.g. the story title. */
    label: string;
    /**
     * "One pending change per item" (Stories, Rhymes): the item's current PENDING draft, if any.
     * A draft save updates it in place (same id) instead of adding another; a direct publish
     * closes it, because the published change replaces it.
     */
    pendingDraftId?: string | null;
    /**
     * Run inside the caller's transaction instead of opening one, so several saves succeed or fail
     * together ("Edit prices": every plan and product change, or none).
     */
    tx?: Tx;
  }): Promise<SaveResult> {
    const handler = this.handler(opts.entityType);
    const run = async (tx: Tx): Promise<SaveResult> => {
      const before = opts.entityId ? await handler.snapshot(tx, opts.entityId) : null;
      if (opts.entityId && before === null) throw new NotFoundException();
      const pending = opts.pendingDraftId ? await tx.draftApproval.findUnique({ where: { id: opts.pendingDraftId } }) : null;
      if (opts.pendingDraftId && (!pending || pending.status !== 'PENDING' || pending.entityType !== opts.entityType)) {
        throw new ConflictException('This change was already reviewed. Reopen the item and try again.');
      }

      if (opts.mode === 'publish' && canPublish(opts.admin)) {
        const id = await handler.apply(tx, opts.entityId, opts.payload);
        if (pending) {
          await tx.draftApproval.update({
            where: { id: pending.id },
            data: { status: 'REJECTED', reason: 'Replaced by a published change.', reviewedById: opts.admin.id, reviewedAt: new Date(), entityId: id },
          });
        }
        const after = await handler.snapshot(tx, id);
        await this.audit.write(
          opts.admin,
          { action: `${opts.entityId ? 'Updated' : 'Created'} ${opts.entityType}: ${opts.label}`, section: opts.section, entityType: opts.entityType, entityId: id, before, after },
          tx,
        );
        return { status: 'published' as const, id };
      }

      if (pending) {
        // Same pending change, newer content. `before` stays the snapshot it was based on, so
        // approval is still refused if the published item changed in the meantime.
        await tx.draftApproval.update({ where: { id: pending.id }, data: { authorId: opts.admin.id, label: opts.label, after: toJson(opts.payload) ?? {} } });
        await this.audit.write(
          opts.admin,
          { action: `Updated draft: ${opts.section} · ${opts.label}`, section: opts.section, entityType: opts.entityType, entityId: opts.entityId },
          tx,
        );
        return { status: 'draft' as const, draftId: pending.id };
      }

      const draft = await tx.draftApproval.create({
        data: {
          authorId: opts.admin.id,
          section: opts.section,
          entityType: opts.entityType,
          entityId: opts.entityId,
          regionId: opts.regionId,
          label: opts.label,
          before: toJson(before),
          after: toJson(opts.payload) ?? {},
        },
      });
      await this.audit.write(
        opts.admin,
        { action: `Submitted draft for review: ${opts.section} · ${opts.label}`, section: opts.section, entityType: opts.entityType, entityId: opts.entityId },
        tx,
      );
      return { status: 'draft' as const, draftId: draft.id };
    };
    return opts.tx ? run(opts.tx) : this.prisma.$transaction(run);
  }

  /**
   * Super Admin sees every draft; a Sub Admin sees only their own. Readable extras (API_REQUESTS
   * #19): the stored `label`, `names` (id → current name for every reference in the draft),
   * `context` (what it answers), and who reviewed it, when.
   */
  async list(admin: SessionAdmin) {
    const drafts = await this.prisma.draftApproval.findMany({
      where: isSuperAdmin(admin) ? {} : { authorId: admin.id },
      include: { author: { select: { name: true } }, reviewedBy: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    // One scan and one batch of lookups for all drafts, then each draft gets the names it uses.
    const perDraft = drafts.map((d) => {
      const refs = collectRefs([d.before, d.after, d.regionId, d.entityId]);
      if (d.entityType === 'Country' && d.entityId) refs.countryCodes.add(d.entityId);
      return refs;
    });
    const all = { ids: new Set(perDraft.flatMap((r) => [...r.ids])), countryCodes: new Set(perDraft.flatMap((r) => [...r.countryCodes])) };
    const [names, context] = await Promise.all([resolveNames(this.prisma, all), draftContexts(this.prisma, drafts)]);

    return {
      drafts: drafts.map(({ author, reviewedBy, ...d }, i) => {
        const refs = perDraft[i]!;
        const own = Object.fromEntries([...refs.ids, ...refs.countryCodes].filter((k) => k in names).map((k) => [k, names[k]!]));
        return {
          ...d,
          authorName: author.name,
          label: d.label,
          names: own,
          context: context[d.id] ?? null,
          reviewerName: reviewedBy?.name ?? null,
          reviewedAt: d.reviewedAt,
        };
      }),
    };
  }

  approve(admin: SessionAdmin, draftId: string) {
    return this.prisma.$transaction(async (tx) => {
      const draft = await tx.draftApproval.findUnique({ where: { id: draftId }, include: { author: true } });
      if (!draft || draft.status !== 'PENDING') throw new NotFoundException('Draft not found or already reviewed');
      const handler = this.handler(draft.entityType);

      if (draft.entityId) {
        const current = await handler.snapshot(tx, draft.entityId);
        if (!sameSnapshot(current, draft.before)) {
          throw new ConflictException('Published content changed since this draft. Reject it and ask the author to submit an updated change.');
        }
      }

      const id = await handler.apply(tx, draft.entityId, draft.after);
      await tx.draftApproval.update({
        where: { id: draftId },
        data: { status: 'PUBLISHED', reviewedById: admin.id, reviewedAt: new Date(), entityId: id },
      });
      await this.audit.write(
        admin,
        { action: `Published draft by ${draft.author.name}: ${draft.section}`, section: draft.section, entityType: draft.entityType, entityId: id, before: draft.before, after: draft.after },
        tx,
      );
      return { id };
    });
  }

  async reject(admin: SessionAdmin, draftId: string, reason: string) {
    if (!reason.trim()) throw new BadRequestException('Give a reason for rejection.');
    await this.prisma.$transaction(async (tx) => {
      const draft = await tx.draftApproval.findUnique({ where: { id: draftId }, include: { author: true } });
      if (!draft || draft.status !== 'PENDING') throw new NotFoundException('Draft not found or already reviewed');
      await tx.draftApproval.update({
        where: { id: draftId },
        data: { status: 'REJECTED', reason, reviewedById: admin.id, reviewedAt: new Date() },
      });
      await this.audit.write(admin, { action: `Rejected draft by ${draft.author.name}: ${draft.section}`, section: draft.section }, tx);
    });
  }
}
