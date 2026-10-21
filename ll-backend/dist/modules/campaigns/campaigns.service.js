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
exports.CampaignsService = exports.CAMPAIGN_ENTITY = void 0;
const common_1 = require("@nestjs/common");
const zod_1 = require("zod");
const prisma_service_1 = require("../../prisma/prisma.service");
const drafts_service_1 = require("../drafts/drafts.service");
const rules_1 = require("../../common/rules");
const session_admin_1 = require("../../common/types/session-admin");
const json_1 = require("../../common/utils/json");
const audience_1 = require("./audience");
exports.CAMPAIGN_ENTITY = 'Campaign';
const SECTION = 'Notifications';
const RECIPIENTS = 'Choose recipients and at least one channel.';
const PREVIEW_NAMES = 50;
const filtersSchema = zod_1.z.object({
    regionIds: zod_1.z.array(zod_1.z.string()).optional(),
    countryCodes: zod_1.z.array(zod_1.z.string()).optional(),
    areaId: zod_1.z.string().optional(),
    age: zod_1.z.number().int().optional(),
    level: zod_1.z.number().int().optional(),
    plan: zod_1.z.enum(rules_1.PLAN_TIERS).optional(),
    storyCategoryId: zod_1.z.string().optional(),
    rhymeCategoryId: zod_1.z.string().optional(),
});
const payloadSchema = zod_1.z.object({
    title: zod_1.z.string(),
    message: zod_1.z.string(),
    channels: zod_1.z.array(zod_1.z.enum(rules_1.NOTIFICATION_CHANNELS)).min(1),
    filters: filtersSchema,
    recipientCount: zod_1.z.number().int(),
    authorId: zod_1.z.string(),
    requested: zod_1.z.enum(['publish', 'draft']),
});
const snapshot = (tx, id) => tx.campaign.findUnique({ where: { id }, select: { id: true, title: true, message: true, channels: true, filters: true, recipientCount: true, sentAt: true } });
let CampaignsService = class CampaignsService {
    constructor(prisma, drafts) {
        this.prisma = prisma;
        this.drafts = drafts;
    }
    onModuleInit() {
        this.drafts.register(exports.CAMPAIGN_ENTITY, {
            snapshot,
            apply: async (tx, id, raw) => {
                if (id)
                    throw new common_1.BadRequestException('This notification has already been sent.');
                const p = payloadSchema.parse(raw);
                const parents = await (0, audience_1.findAudience)(tx, p.filters);
                if (!parents.length)
                    throw new common_1.BadRequestException(RECIPIENTS);
                const campaign = await tx.campaign.create({
                    data: {
                        title: p.title,
                        message: p.message,
                        channels: p.channels,
                        filters: (0, json_1.toJson)(p.filters) ?? {},
                        recipientCount: parents.length,
                        status: 'PUBLISHED',
                        createdById: p.authorId,
                        sentAt: new Date(),
                    },
                });
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
    async audience(dto) {
        const parents = await (0, audience_1.findAudience)(this.prisma, (0, audience_1.normalizeFilters)(dto.filters));
        return { count: parents.length, parents: parents.slice(0, PREVIEW_NAMES) };
    }
    async list(admin) {
        const [sent, pending] = await Promise.all([
            this.prisma.campaign.findMany({ where: { status: 'PUBLISHED' }, orderBy: [{ sentAt: 'desc' }, { createdAt: 'desc' }] }),
            this.prisma.draftApproval.findMany({
                where: { entityType: exports.CAMPAIGN_ENTITY, status: 'PENDING', ...((0, session_admin_1.isSuperAdmin)(admin) ? {} : { authorId: admin.id }) },
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
                filters: c.filters,
                recipientCount: c.recipientCount,
                status: 'PUBLISHED',
                createdById: c.createdById,
                authorName: authors.get(c.createdById) ?? null,
                sentAt: c.sentAt?.toISOString() ?? null,
                createdAt: c.createdAt.toISOString(),
            })),
            pending: pending.flatMap((d) => {
                const p = payloadSchema.safeParse(d.after);
                if (!p.success)
                    return [];
                return [
                    {
                        draftId: d.id,
                        title: p.data.title,
                        message: p.data.message,
                        channels: p.data.channels,
                        filters: p.data.filters,
                        recipientCount: p.data.recipientCount,
                        status: p.data.requested === 'draft' ? 'DRAFT' : 'PENDING_APPROVAL',
                        createdById: d.authorId,
                        authorName: d.author.name,
                        createdAt: d.createdAt.toISOString(),
                    },
                ];
            }),
        };
    }
    async save(admin, dto) {
        const filters = (0, audience_1.normalizeFilters)(dto.filters);
        const parents = await (0, audience_1.findAudience)(this.prisma, filters);
        if (!parents.length)
            throw new common_1.BadRequestException(RECIPIENTS);
        let pendingDraftId = null;
        if (dto.draftId) {
            const draft = await this.prisma.draftApproval.findUnique({ where: { id: dto.draftId } });
            if (!draft || draft.entityType !== exports.CAMPAIGN_ENTITY)
                throw new common_1.BadRequestException('Notification not found.');
            if (draft.status !== 'PENDING')
                throw new common_1.ConflictException('This change was already reviewed. Reopen the item and try again.');
            if (!(0, session_admin_1.isSuperAdmin)(admin) && draft.authorId !== admin.id)
                throw new common_1.ForbiddenException('You can only edit your own drafts.');
            pendingDraftId = draft.id;
        }
        const payload = {
            title: dto.title,
            message: dto.message,
            channels: dto.channels,
            filters,
            recipientCount: parents.length,
            authorId: admin.id,
            requested: dto.mode,
        };
        return this.drafts.saveOrDraft({
            admin,
            mode: dto.mode,
            section: SECTION,
            entityType: exports.CAMPAIGN_ENTITY,
            entityId: null,
            payload,
            label: dto.title,
            pendingDraftId,
        });
    }
    async reminders() {
        const rows = await this.prisma.notification.findMany({
            where: { type: 'MANDATORY_REMINDER' },
            include: { parent: { select: { name: true } } },
            orderBy: { createdAt: 'desc' },
            take: 500,
        });
        const data = (raw) => {
            const d = (raw && typeof raw === 'object' ? raw : {});
            return {
                childName: typeof d.childName === 'string' ? d.childName : '',
                areas: Array.isArray(d.areas) ? d.areas.filter((a) => typeof a === 'string') : [],
            };
        };
        return {
            reminders: rows.map((r) => ({ id: r.id, ...data(r.data), parentName: r.parent.name, channels: r.channels, createdAt: r.createdAt.toISOString() })),
        };
    }
};
exports.CampaignsService = CampaignsService;
exports.CampaignsService = CampaignsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        drafts_service_1.DraftsService])
], CampaignsService);
//# sourceMappingURL=campaigns.service.js.map