import { BadRequestException, ConflictException, ForbiddenException, Injectable, OnModuleInit } from '@nestjs/common';
import { z } from 'zod';
import { PrismaService } from '../../prisma/prisma.service';
import { DraftsService, type SaveResult, type Tx } from '../drafts/drafts.service';
import { NOTIFICATION_CHANNELS, PLAN_TIERS, type AudienceFilters } from '../../common/rules';
import { isSuperAdmin, type SessionAdmin } from '../../common/types/session-admin';
import { toJson } from '../../common/utils/json';
import { findAudience, normalizeFilters } from './audience';
import type { AudienceDto, SaveCampaignDto } from './dto/campaign.dto';

/**
 * Notification campaigns (guide §18, PRODUCT_SPEC §17; API_REQUESTS #23). Group announcements to
 * parents, separate from enquiry replies. Filters combine with AND; a parent gets one message
 * however many children match (`rules/audience.ts`).
 *
 * Decisions 2026-10-15:
 * 1. Child filters read the child's current plan (trial = Plus), level in the area (at least 1),
 *    content age and region; country is the parent's.
 * 2. No filters = every parent, including those without a child yet.
 * 3. One pending change per campaign: saving with `draftId` updates that draft. A sent campaign is
 *    final (no edit, no recall).
 * 4. GET /api/campaigns also lists campaigns waiting for approval (`pending`); a Sub Admin sees their own.
 * 5. Sending is `apply()`: the audience is counted again at that moment; nobody matching → refused,
 *    the draft stays pending.
 * 8. `parents` in the audience preview is capped at 50 names; `count` is exact.
 * Delivery by email / push waits on the adapters (OPEN_QUESTIONS Q12): sending records one
 * ANNOUNCEMENT notification per parent with the chosen channels.
 */

export const CAMPAIGN_ENTITY = 'Campaign';
const SECTION = 'Notifications';
const RECIPIENTS = 'Choose recipients and at least one channel.';
const PREVIEW_NAMES = 50;

const filtersSchema = z.object({
  regionIds: z.array(z.string()).optional(),
  countryCodes: z.array(z.string()).optional(),
  areaId: z.string().optional(),
  age: z.number().int().optional(),
  level: z.number().int().optional(),
  plan: z.enum(PLAN_TIERS).optional(),
  storyCategoryId: z.string().optional(),
  rhymeCategoryId: z.string().optional(),
});

const payloadSchema = z.object({
  title: z.string(),
  message: z.string(),
  channels: z.array(z.enum(NOTIFICATION_CHANNELS)).min(1),
  filters: filtersSchema,
  /** Matching parents when saved (shown in Draft approvals); recounted when sent. */
  recipientCount: z.number().int(),
  /** The author: `apply()` gets no admin, and the campaign is theirs even when approved later. */
  authorId: z.string(),
  /** 'draft' = "Save in draft"; 'publish' = waiting for approval. */
  requested: z.enum(['publish', 'draft']),
});
type CampaignPayload = z.infer<typeof payloadSchema>;

const snapshot = (tx: Tx, id: string) =>
  tx.campaign.findUnique({ where: { id }, select: { id: true, title: true, message: true, channels: true, filters: true, recipientCount: true, sentAt: true } });

@Injectable()
export class CampaignsService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly drafts: DraftsService,
  ) {}

  onModuleInit() {
    this.drafts.register<CampaignPayload>(CAMPAIGN_ENTITY, {
      snapshot,
      apply: async (tx, id, raw) => {
        // Decision 3: a sent campaign is final.
        if (id) throw new BadRequestException('This notification has already been sent.');
        const p = payloadSchema.parse(raw);
        // Decision 5: the audience at send time, not when it was saved.
        const parents = await findAudience(tx, p.filters);
        if (!parents.length) throw new BadRequestException(RECIPIENTS);
        const campaign = await tx.campaign.create({
          data: {
            title: p.title,
            message: p.message,
            channels: p.channels,
            filters: toJson(p.filters) ?? {},
            recipientCount: parents.length,
            status: 'PUBLISHED',
            createdById: p.authorId,
            sentAt: new Date(),
          },
        });
        // Delivered by the chosen channels once the email / push adapters exist (OPEN_QUESTIONS Q12).
        await tx.notification.createMany({
          data: parents.map((parent) => ({
            parentId: parent.id,
            type: 'ANNOUNCEMENT',
            title: p.title,
            body: p.message,
            channels: p.channels,
            campaignId: campaign.id,
          })),
        });
        return campaign.id;
      },
    });
  }

  /** "{n} matching parents · Meera, Priya, …" — saves nothing. */
  async audience(dto: AudienceDto) {
    const parents = await findAudience(this.prisma, normalizeFilters(dto.filters));
    return { count: parents.length, parents: parents.slice(0, PREVIEW_NAMES) };
  }

  /** Sent campaigns, newest first, plus the ones waiting for approval (decision 4). */
  async list(admin: SessionAdmin) {
    const [sent, pending] = await Promise.all([
      this.prisma.campaign.findMany({ where: { status: 'PUBLISHED' }, orderBy: [{ sentAt: 'desc' }, { createdAt: 'desc' }] }),
      this.prisma.draftApproval.findMany({
        where: { entityType: CAMPAIGN_ENTITY, status: 'PENDING', ...(isSuperAdmin(admin) ? {} : { authorId: admin.id }) },
        include: { author: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    const authorIds = [...new Set(sent.map((c) => c.createdById))];
    const authors = new Map((await this.prisma.adminUser.findMany({ where: { id: { in: authorIds } }, select: { id: true, name: true } })).map((a) => [a.id, a.name]));

    return {
      campaigns: sent.map((c) => ({
        id: c.id,
        title: c.title,
        message: c.message,
        channels: c.channels,
        filters: c.filters as AudienceFilters,
        recipientCount: c.recipientCount,
        status: 'PUBLISHED' as const,
        createdById: c.createdById,
        authorName: authors.get(c.createdById) ?? null,
        sentAt: c.sentAt?.toISOString() ?? null,
        createdAt: c.createdAt.toISOString(),
      })),
      pending: pending.flatMap((d) => {
        const p = payloadSchema.safeParse(d.after);
        if (!p.success) return [];
        return [
          {
            draftId: d.id,
            title: p.data.title,
            message: p.data.message,
            channels: p.data.channels,
            filters: p.data.filters,
            recipientCount: p.data.recipientCount,
            status: p.data.requested === 'draft' ? ('DRAFT' as const) : ('PENDING_APPROVAL' as const),
            createdById: d.authorId,
            authorName: d.author.name,
            createdAt: d.createdAt.toISOString(),
          },
        ];
      }),
    };
  }

  /** Send (can publish) or save / submit for approval; `draftId` edits a saved campaign (decision 3). */
  async save(admin: SessionAdmin, dto: SaveCampaignDto): Promise<SaveResult> {
    const filters = normalizeFilters(dto.filters);
    const parents = await findAudience(this.prisma, filters);
    if (!parents.length) throw new BadRequestException(RECIPIENTS);

    let pendingDraftId: string | null = null;
    if (dto.draftId) {
      const draft = await this.prisma.draftApproval.findUnique({ where: { id: dto.draftId } });
      if (!draft || draft.entityType !== CAMPAIGN_ENTITY) throw new BadRequestException('Notification not found.');
      if (draft.status !== 'PENDING') throw new ConflictException('This change was already reviewed. Reopen the item and try again.');
      // Like Draft approvals: a Sub Admin works on their own drafts only.
      if (!isSuperAdmin(admin) && draft.authorId !== admin.id) throw new ForbiddenException('You can only edit your own drafts.');
      pendingDraftId = draft.id;
    }

    const payload: CampaignPayload = {
      title: dto.title,
      message: dto.message,
      channels: dto.channels,
      filters,
      recipientCount: parents.length,
      authorId: admin.id,
      requested: dto.mode,
    };
    return this.drafts.saveOrDraft<CampaignPayload>({
      admin,
      mode: dto.mode,
      section: SECTION,
      entityType: CAMPAIGN_ENTITY,
      entityId: null,
      payload,
      label: dto.title,
      pendingDraftId,
    });
  }

  /** "Daily mandatory-activity reminders": the MANDATORY_REMINDER notifications, newest first (read only). */
  async reminders() {
    const rows = await this.prisma.notification.findMany({
      where: { type: 'MANDATORY_REMINDER' },
      include: { parent: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
    const data = (raw: unknown) => {
      const d = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
      return {
        childName: typeof d.childName === 'string' ? d.childName : '',
        areas: Array.isArray(d.areas) ? d.areas.filter((a): a is string => typeof a === 'string') : [],
      };
    };
    return {
      reminders: rows.map((r) => ({ id: r.id, ...data(r.data), parentName: r.parent.name, channels: r.channels, createdAt: r.createdAt.toISOString() })),
    };
  }
}
