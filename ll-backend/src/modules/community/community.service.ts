import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DraftsService, type Tx } from '../drafts/drafts.service';
import { SETTING_ENTITY, SettingsService } from '../settings/settings.service';
import type { SessionAdmin } from '../../common/types/session-admin';
import type { DecisionDto, TeamPostDto } from './dto/decision.dto';
import type { VisibleLimitDto } from './dto/visible-limit.dto';

/**
 * Community (guide §16; prototype admin-rebuild.js `communityWorkspace`).
 * Parents can't edit after submitting — there is no parent write path here. Every admin decision
 * goes through DraftsService.saveOrDraft(), so Sub Admins without direct publishing create drafts.
 *
 * A decision takes effect only in the draft handler's `apply()` — immediately (admin can publish)
 * or when Super Admin approves the draft. That's why the expiry timer and the parent
 * notification live there: "the timer begins when the post is approved, including approval after a draft".
 */

export const REVIEW_ENTITY = 'CommunityPostReview';
export const TEAM_POST_ENTITY = 'CommunityTeamPost';
export const VISIBLE_LIMIT_KEY = 'community.regularVisibleLimit';
const SECTION = 'Community';

interface DecisionPayload {
  action: 'approve' | 'reject';
  message: string;
  reason: string;
  /** null = no expiry */
  expiryHours: number | null;
  pinned: boolean;
}
interface TeamPostPayload extends DecisionPayload {
  title: string;
}

/** Status + timer fields for a decision taken now. */
function decisionFields(p: DecisionPayload, now = new Date()) {
  if (p.action === 'reject') {
    return { status: 'REJECTED' as const, rejectionReason: p.reason, pinned: false, approvedAt: null, expiresAt: null, expiryHours: p.expiryHours };
  }
  return {
    status: 'PUBLISHED' as const,
    rejectionReason: null,
    pinned: p.pinned,
    expiryHours: p.expiryHours,
    approvedAt: now,
    expiresAt: p.expiryHours ? new Date(now.getTime() + p.expiryHours * 3_600_000) : null,
  };
}

function toPayload(dto: DecisionDto): DecisionPayload {
  const hours = dto.expiryDays * 24 + dto.expiryHours;
  return { action: dto.action, message: dto.message, reason: dto.reason, expiryHours: hours || null, pinned: dto.pinned };
}

const assertReason = (dto: DecisionDto) => {
  if (dto.action === 'reject' && !dto.reason) throw new BadRequestException('Give a reason for rejection.');
};

const postSnapshot = (tx: Tx, id: string) =>
  tx.communityPost.findUnique({
    where: { id },
    select: { id: true, authorType: true, title: true, message: true, status: true, pinned: true, expiryHours: true, rejectionReason: true, approvedAt: true, expiresAt: true },
  });

@Injectable()
export class CommunityService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly drafts: DraftsService,
    private readonly settings: SettingsService,
  ) {}

  onModuleInit() {
    // Moderating a parent's message.
    this.drafts.register<DecisionPayload>(REVIEW_ENTITY, {
      snapshot: postSnapshot,
      apply: async (tx, id, payload) => {
        if (!id) throw new BadRequestException('A post id is required.');
        const post = await tx.communityPost.findUnique({ where: { id } });
        if (!post || post.authorType !== 'PARENT') throw new NotFoundException('Parent message not found');

        const decision = payload.action === 'reject' ? 'Rejected' : payload.message !== post.message ? 'Rephrased and approved' : 'Approved';
        await tx.communityPost.update({
          where: { id },
          // The parent's own words are kept once, before any rephrasing.
          data: { message: payload.message, originalMessage: post.originalMessage ?? post.message, ...decisionFields(payload) },
        });

        // Every moderation decision notifies the submitting parent by email and in-app (guide §16).
        if (post.parentId) {
          await tx.notification.create({
            data: {
              parentId: post.parentId,
              type: 'COMMUNITY_DECISION',
              title: 'Your community message',
              body: decision + (payload.reason ? `: ${payload.reason}` : ''),
              channels: ['EMAIL', 'IN_APP'],
              // An approved post opens Community on that post; a rejected one never appears publicly.
              route: payload.action === 'approve' ? `community/${id}` : null,
            },
          });
        }
        return id;
      },
    });

    // Creating or editing a Little Legacy team post.
    this.drafts.register<TeamPostPayload>(TEAM_POST_ENTITY, {
      snapshot: postSnapshot,
      apply: async (tx, id, payload) => {
        const data = { authorType: 'TEAM' as const, title: payload.title, message: payload.message, ...decisionFields(payload) };
        if (id) {
          await tx.communityPost.update({ where: { id }, data });
          return id;
        }
        return (await tx.communityPost.create({ data })).id;
      },
    });
  }

  async list() {
    const now = new Date();
    const [parentPosts, teamPosts, regularVisibleLimit] = await Promise.all([
      this.prisma.communityPost.findMany({ where: { authorType: 'PARENT' }, include: { parent: { select: { name: true } } }, orderBy: { createdAt: 'desc' } }),
      this.prisma.communityPost.findMany({ where: { authorType: 'TEAM' }, orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }] }),
      this.settings.get<number>(VISIBLE_LIMIT_KEY, 10),
    ]);

    const common = (p: (typeof teamPosts)[number]) => ({
      id: p.id,
      message: p.message,
      status: p.status === 'PUBLISHED' && p.expiresAt !== null && p.expiresAt <= now ? ('EXPIRED' as const) : p.status,
      pinned: p.pinned,
      expiryHours: p.expiryHours,
      expiresAt: p.expiresAt?.toISOString() ?? null,
      rejectionReason: p.rejectionReason,
    });

    return {
      // Awaiting moderation first, then newest.
      parentPosts: parentPosts
        .map((p) => ({ ...common(p), parentName: p.parent?.name ?? 'Parent', originalMessage: p.originalMessage ?? p.message }))
        .sort((a, b) => Number(b.status === 'AWAITING_MODERATION') - Number(a.status === 'AWAITING_MODERATION')),
      teamPosts: teamPosts.map((p) => ({ ...common(p), title: p.title ?? '' })),
      settings: { regularVisibleLimit },
    };
  }

  async review(admin: SessionAdmin, postId: string, dto: DecisionDto) {
    assertReason(dto);
    const post = await this.prisma.communityPost.findUnique({ where: { id: postId }, include: { parent: true } });
    if (!post || post.authorType !== 'PARENT') throw new NotFoundException('Parent message not found');
    return this.drafts.saveOrDraft({
      admin,
      mode: dto.mode,
      section: SECTION,
      entityType: REVIEW_ENTITY,
      entityId: post.id,
      payload: toPayload(dto),
      label: `${dto.action === 'reject' ? 'Rejected' : 'Approved'} message from ${post.parent?.name ?? 'parent'}`,
    });
  }

  async saveTeamPost(admin: SessionAdmin, postId: string | null, dto: TeamPostDto) {
    assertReason(dto);
    if (postId) {
      const post = await this.prisma.communityPost.findUnique({ where: { id: postId } });
      if (!post || post.authorType !== 'TEAM') throw new NotFoundException('Team message not found');
    }
    return this.drafts.saveOrDraft({
      admin,
      mode: dto.mode,
      section: SECTION,
      entityType: TEAM_POST_ENTITY,
      entityId: postId,
      payload: { ...toPayload(dto), title: dto.title },
      label: `${dto.action === 'reject' ? 'Rejected' : 'Prepared'} Little Legacy team message: ${dto.title}`,
    });
  }

  saveVisibleLimit(admin: SessionAdmin, dto: VisibleLimitDto) {
    return this.drafts.saveOrDraft({
      admin,
      mode: dto.mode,
      section: SECTION,
      entityType: SETTING_ENTITY,
      entityId: VISIBLE_LIMIT_KEY,
      payload: { value: dto.regularVisibleLimit },
      label: `Regular messages visible at once: ${dto.regularVisibleLimit}`,
    });
  }
}
