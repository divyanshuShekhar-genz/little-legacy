"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommunityService = exports.VISIBLE_LIMIT_KEY = exports.TEAM_POST_ENTITY = exports.REVIEW_ENTITY = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const drafts_service_1 = require("../drafts/drafts.service");
const settings_service_1 = require("../settings/settings.service");
exports.REVIEW_ENTITY = 'CommunityPostReview';
exports.TEAM_POST_ENTITY = 'CommunityTeamPost';
exports.VISIBLE_LIMIT_KEY = 'community.regularVisibleLimit';
const SECTION = 'Community';
function decisionFields(p, now = new Date()) {
    if (p.action === 'reject') {
        return { status: 'REJECTED', rejectionReason: p.reason, pinned: false, approvedAt: null, expiresAt: null, expiryHours: p.expiryHours };
    }
    return {
        status: 'PUBLISHED',
        rejectionReason: null,
        pinned: p.pinned,
        expiryHours: p.expiryHours,
        approvedAt: now,
        expiresAt: p.expiryHours ? new Date(now.getTime() + p.expiryHours * 3_600_000) : null,
    };
}
function toPayload(dto) {
    const hours = dto.expiryDays * 24 + dto.expiryHours;
    return { action: dto.action, message: dto.message, reason: dto.reason, expiryHours: hours || null, pinned: dto.pinned };
}
const assertReason = (dto) => {
    if (dto.action === 'reject' && !dto.reason)
        throw new common_1.BadRequestException('Give a reason for rejection.');
};
const postSnapshot = (tx, id) => tx.communityPost.findUnique({
    where: { id },
    select: { id: true, authorType: true, title: true, message: true, status: true, pinned: true, expiryHours: true, rejectionReason: true, approvedAt: true, expiresAt: true },
});
let CommunityService = class CommunityService {
    constructor(prisma, drafts, settings) {
        this.prisma = prisma;
        this.drafts = drafts;
        this.settings = settings;
    }
    onModuleInit() {
        this.drafts.register(exports.REVIEW_ENTITY, {
            snapshot: postSnapshot,
            apply: async (tx, id, payload) => {
                if (!id)
                    throw new common_1.BadRequestException('A post id is required.');
                const post = await tx.communityPost.findUnique({ where: { id } });
                if (!post || post.authorType !== 'PARENT')
                    throw new common_1.NotFoundException('Parent message not found');
                const decision = payload.action === 'reject' ? 'Rejected' : payload.message !== post.message ? 'Rephrased and approved' : 'Approved';
                await tx.communityPost.update({
                    where: { id },
                    data: { message: payload.message, originalMessage: post.originalMessage ?? post.message, ...decisionFields(payload) },
                });
                if (post.parentId) {
                    await tx.notification.create({
                        data: {
                            parentId: post.parentId,
                            type: 'COMMUNITY_DECISION',
                            title: 'Your community message',
                            body: decision + (payload.reason ? `: ${payload.reason}` : ''),
                            channels: ['EMAIL', 'IN_APP'],
                            route: payload.action === 'approve' ? `community/${id}` : null,
                        },
                    });
                }
                return id;
            },
        });
        this.drafts.register(exports.TEAM_POST_ENTITY, {
            snapshot: postSnapshot,
            apply: async (tx, id, payload) => {
                const data = { authorType: 'TEAM', title: payload.title, message: payload.message, ...decisionFields(payload) };
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
            this.settings.get(exports.VISIBLE_LIMIT_KEY, 10),
        ]);
        const common = (p) => ({
            id: p.id,
            message: p.message,
            status: p.status === 'PUBLISHED' && p.expiresAt !== null && p.expiresAt <= now ? 'EXPIRED' : p.status,
            pinned: p.pinned,
            expiryHours: p.expiryHours,
            expiresAt: p.expiresAt?.toISOString() ?? null,
            rejectionReason: p.rejectionReason,
        });
        return {
            parentPosts: parentPosts
                .map((p) => ({ ...common(p), parentName: p.parent?.name ?? 'Parent', originalMessage: p.originalMessage ?? p.message }))
                .sort((a, b) => Number(b.status === 'AWAITING_MODERATION') - Number(a.status === 'AWAITING_MODERATION')),
            teamPosts: teamPosts.map((p) => ({ ...common(p), title: p.title ?? '' })),
            settings: { regularVisibleLimit },
        };
    }
    async review(admin, postId, dto) {
        assertReason(dto);
        const post = await this.prisma.communityPost.findUnique({ where: { id: postId }, include: { parent: true } });
        if (!post || post.authorType !== 'PARENT')
            throw new common_1.NotFoundException('Parent message not found');
        return this.drafts.saveOrDraft({
            admin,
            mode: dto.mode,
            section: SECTION,
            entityType: exports.REVIEW_ENTITY,
            entityId: post.id,
            payload: toPayload(dto),
            label: `${dto.action === 'reject' ? 'Rejected' : 'Approved'} message from ${post.parent?.name ?? 'parent'}`,
        });
    }
    async saveTeamPost(admin, postId, dto) {
        assertReason(dto);
        if (postId) {
            const post = await this.prisma.communityPost.findUnique({ where: { id: postId } });
            if (!post || post.authorType !== 'TEAM')
                throw new common_1.NotFoundException('Team message not found');
        }
        return this.drafts.saveOrDraft({
            admin,
            mode: dto.mode,
            section: SECTION,
            entityType: exports.TEAM_POST_ENTITY,
            entityId: postId,
            payload: { ...toPayload(dto), title: dto.title },
            label: `${dto.action === 'reject' ? 'Rejected' : 'Prepared'} Little Legacy team message: ${dto.title}`,
        });
    }
    saveVisibleLimit(admin, dto) {
        return this.drafts.saveOrDraft({
            admin,
            mode: dto.mode,
            section: SECTION,
            entityType: settings_service_1.SETTING_ENTITY,
            entityId: exports.VISIBLE_LIMIT_KEY,
            payload: { value: dto.regularVisibleLimit },
            label: `Regular messages visible at once: ${dto.regularVisibleLimit}`,
        });
    }
};
exports.CommunityService = CommunityService;
exports.CommunityService = CommunityService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        drafts_service_1.DraftsService,
        settings_service_1.SettingsService])
], CommunityService);
//# sourceMappingURL=community.service.js.map