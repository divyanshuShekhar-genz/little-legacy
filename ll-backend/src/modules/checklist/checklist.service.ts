import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { z } from 'zod';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { DraftsService, type SaveResult, type Tx } from '../drafts/drafts.service';
import { SETTING_ENTITY, SettingsService } from '../settings/settings.service';
import { isSuperAdmin, type SessionAdmin } from '../../common/types/session-admin';
import { REGION, type ChecklistItemDto, type ChecklistLimitDto } from './dto/checklist.dto';

/**
 * Parent Checklist (guide §22, PRODUCT_SPEC §21; API_REQUESTS #25). Helpful tasks for parents in
 * Week 1, Week 2 and Later-weeks lists (Q7). Ticks are per child and never award points.
 *
 * Decisions 2026-10-16:
 * 1. Each regional learning category has its own checklist (Q27, client 15 Oct): `regionId` on the item.
 * 2. One pending change per item (as Stories / Products). A never-published item lives only in Draft
 *    approvals and its id is the draft's id; GET returns `isNew` and `pending` (with `draftId`).
 * 3. Reject goes through Draft approvals (`POST /api/drafts/:draftId/reject`, with a reason).
 * 4. Deleting a live item is a removal through drafts (the item and its ticks go; scores untouched).
 *    Deleting a never-published item discards its draft (its author or a Super Admin).
 * 5. An item stays in its category.
 * 6. Visible limit per category: Setting `checklist.visibleLimit:{regionId}`, default 5.
 * 7. "Display order" as given; ties by creation time.
 */

export const CHECKLIST_ENTITY = 'ChecklistItem';
const SECTION = 'Parent checklist';
export const DEFAULT_VISIBLE_LIMIT = 5;
export const limitKey = (regionId: string) => `checklist.visibleLimit:${regionId}`;

const contentSchema = z.object({
  regionId: z.string(),
  week: z.number().int().min(1).max(3),
  title: z.string(),
  description: z.string(),
  position: z.number().int().min(1),
  status: z.enum(['DRAFT', 'PUBLISHED']),
});
type ChecklistContent = z.infer<typeof contentSchema>;

const payloadSchema = z.union([
  /** A removal. */
  z.object({ delete: z.literal(true), requested: z.enum(['publish', 'draft']) }),
  contentSchema.extend({ delete: z.undefined().optional(), requested: z.enum(['publish', 'draft']) }),
]);
type ChecklistPayload = z.infer<typeof payloadSchema>;

const snapshot = (tx: Tx, id: string) =>
  tx.checklistItem.findUnique({ where: { id }, select: { id: true, regionId: true, week: true, title: true, description: true, position: true, status: true } });

const contentOf = (p: ChecklistPayload): ChecklistContent | null =>
  p.delete ? null : { regionId: p.regionId, week: p.week, title: p.title, description: p.description, position: p.position, status: p.status };

const pendingStatus = (requested: 'publish' | 'draft') => (requested === 'draft' ? ('DRAFT' as const) : ('PENDING_APPROVAL' as const));

@Injectable()
export class ChecklistService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly drafts: DraftsService,
    private readonly settings: SettingsService,
    private readonly audit: AuditService,
  ) {}

  onModuleInit() {
    this.drafts.register<ChecklistPayload>(CHECKLIST_ENTITY, {
      snapshot,
      apply: async (tx, id, raw) => {
        const p = payloadSchema.parse(raw);
        if (p.delete) {
          if (!id) throw new BadRequestException('Checklist item not found.');
          // Its ticks cascade; checklist ticks never award points, so scores are untouched.
          await tx.checklistItem.delete({ where: { id } });
          return id;
        }
        const data = { week: p.week, title: p.title, description: p.description, position: p.position, status: p.status };
        if (id) {
          const item = await tx.checklistItem.findUnique({ where: { id } });
          if (!item) throw new NotFoundException('Checklist item not found.');
          if (item.regionId !== p.regionId) throw new BadRequestException('An item stays in its regional learning category.');
          await tx.checklistItem.update({ where: { id }, data });
          return id;
        }
        if (!(await tx.learningRegion.count({ where: { id: p.regionId } }))) throw new BadRequestException(REGION);
        return (await tx.checklistItem.create({ data: { ...data, regionId: p.regionId } })).id;
      },
    });
  }

  private async region(regionId: string) {
    const region = await this.prisma.learningRegion.findUnique({ where: { id: regionId } });
    if (!region) throw new BadRequestException(REGION);
    return region;
  }

  private pendingFor(id: string) {
    return this.prisma.draftApproval.findFirst({ where: { entityType: CHECKLIST_ENTITY, entityId: id, status: 'PENDING' }, orderBy: { createdAt: 'desc' } });
  }

  /** A never-published item: a pending draft that creates an item. */
  private unpublished(id: string) {
    return this.prisma.draftApproval.findFirst({ where: { id, entityType: CHECKLIST_ENTITY, entityId: null, status: 'PENDING' }, include: { author: { select: { name: true } } } });
  }

  /** One category's checklist: live items and never-published ones, by week, order, then creation (decision 7). */
  async list(regionId: string) {
    await this.region(regionId);
    const [items, drafts, limitDraft] = await Promise.all([
      this.prisma.checklistItem.findMany({ where: { regionId } }),
      this.prisma.draftApproval.findMany({
        where: { entityType: CHECKLIST_ENTITY, status: 'PENDING', regionId },
        include: { author: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.draftApproval.findFirst({
        where: { entityType: SETTING_ENTITY, entityId: limitKey(regionId), status: 'PENDING' },
        include: { author: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const pending = (d: (typeof drafts)[number], p: ChecklistPayload) => ({
      status: pendingStatus(p.requested),
      content: contentOf(p),
      authorName: d.author.name,
      draftId: d.id,
    });

    const rows = [
      ...items.map((i) => {
        const d = drafts.find((x) => x.entityId === i.id);
        const p = d ? payloadSchema.safeParse(d.after) : null;
        return {
          id: i.id,
          regionId: i.regionId,
          week: i.week,
          title: i.title,
          description: i.description,
          position: i.position,
          status: i.status as 'DRAFT' | 'PUBLISHED',
          isNew: false,
          pending: d && p?.success ? pending(d, p.data) : null,
          createdAt: i.createdAt,
        };
      }),
      ...drafts.flatMap((d) => {
        if (d.entityId) return [];
        const p = payloadSchema.safeParse(d.after);
        if (!p.success || p.data.delete) return [];
        return [{ id: d.id, ...contentOf(p.data)!, isNew: true, pending: pending(d, p.data), createdAt: d.createdAt }];
      }),
    ].sort((a, b) => a.week - b.week || a.position - b.position || a.createdAt.getTime() - b.createdAt.getTime());

    const limitValue = (limitDraft?.after as { value?: unknown; requested?: string } | undefined) ?? undefined;
    return {
      items: rows.map(({ createdAt: _createdAt, ...row }) => row),
      visibleLimit: await this.settings.get<number>(limitKey(regionId), DEFAULT_VISIBLE_LIMIT),
      visibleLimitPending:
        limitDraft && typeof limitValue?.value === 'number'
          ? {
              status: limitValue.requested === 'draft' ? ('DRAFT' as const) : ('PENDING_APPROVAL' as const),
              value: limitValue.value,
              authorName: limitDraft.author.name,
              draftId: limitDraft.id,
            }
          : null,
    };
  }

  /**
   * Add (`id` null), edit a live item, or edit a never-published one (its id is its draft's id).
   * One pending change per item (decision 2).
   */
  async save(admin: SessionAdmin, id: string | null, dto: ChecklistItemDto): Promise<SaveResult> {
    const region = await this.region(dto.regionId);
    const payload: ChecklistPayload = {
      regionId: dto.regionId,
      week: dto.week,
      title: dto.title,
      description: dto.description,
      position: dto.position,
      status: dto.status,
      requested: dto.mode,
    };
    const base = { admin, mode: dto.mode, section: SECTION, entityType: CHECKLIST_ENTITY, payload, label: dto.title, regionId: region.id };

    if (!id) return this.drafts.saveOrDraft<ChecklistPayload>({ ...base, entityId: null });

    const live = await this.prisma.checklistItem.findUnique({ where: { id } });
    if (live) {
      if (live.regionId !== dto.regionId) throw new BadRequestException('An item stays in its regional learning category.');
      const pending = await this.pendingFor(id);
      return this.drafts.saveOrDraft<ChecklistPayload>({ ...base, entityId: id, pendingDraftId: pending?.id ?? null });
    }

    const draft = await this.unpublished(id);
    if (!draft) throw new NotFoundException('Checklist item not found.');
    const content = payloadSchema.safeParse(draft.after);
    if (content.success && !content.data.delete && content.data.regionId !== dto.regionId) {
      throw new BadRequestException('An item stays in its regional learning category.');
    }
    return this.drafts.saveOrDraft<ChecklistPayload>({ ...base, entityId: null, pendingDraftId: draft.id });
  }

  /** Decision 4: a live item → a removal through drafts; a never-published one → its draft is discarded. */
  async remove(admin: SessionAdmin, id: string, mode: 'publish' | 'draft'): Promise<SaveResult | { status: 'discarded'; draftId: string }> {
    const live = await this.prisma.checklistItem.findUnique({ where: { id } });
    if (live) {
      const pending = await this.pendingFor(id);
      return this.drafts.saveOrDraft<ChecklistPayload>({
        admin,
        mode,
        section: SECTION,
        entityType: CHECKLIST_ENTITY,
        entityId: id,
        payload: { delete: true, requested: mode },
        label: `Removed ${live.title}`,
        regionId: live.regionId,
        pendingDraftId: pending?.id ?? null,
      });
    }

    const draft = await this.unpublished(id);
    if (!draft) throw new NotFoundException('Checklist item not found.');
    if (!isSuperAdmin(admin) && draft.authorId !== admin.id) throw new ForbiddenException('You can only edit your own drafts.');
    const title = draft.label ?? 'checklist item';
    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.draftApproval.updateMany({
        where: { id: draft.id, status: 'PENDING' },
        data: { status: 'REJECTED', reason: 'Deleted before it was published.', reviewedById: admin.id, reviewedAt: new Date() },
      });
      if (!count) throw new ConflictException('This change was already reviewed. Reopen the item and try again.');
      await this.audit.write(admin, { action: `Deleted draft: ${SECTION} · ${title}`, section: SECTION, entityType: CHECKLIST_ENTITY, entityId: null }, tx);
    });
    return { status: 'discarded', draftId: draft.id };
  }

  /** "Maximum items visible at once" for one category (decision 6); one pending change per category. */
  async saveLimit(admin: SessionAdmin, dto: ChecklistLimitDto): Promise<SaveResult> {
    const region = await this.region(dto.regionId);
    const key = limitKey(region.id);
    const pending = await this.prisma.draftApproval.findFirst({ where: { entityType: SETTING_ENTITY, entityId: key, status: 'PENDING' }, orderBy: { createdAt: 'desc' } });
    return this.drafts.saveOrDraft({
      admin,
      mode: dto.mode,
      section: SECTION,
      entityType: SETTING_ENTITY,
      entityId: key,
      // `requested` only tells "Save in draft" from "waiting for approval"; the setting handler reads `value`.
      payload: { value: dto.visibleLimit, requested: dto.mode },
      label: `Parent checklist items visible at once (${region.name}): ${dto.visibleLimit}`,
      regionId: region.id,
      pendingDraftId: pending?.id ?? null,
    });
  }
}
