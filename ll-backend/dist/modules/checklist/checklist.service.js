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
exports.ChecklistService = exports.limitKey = exports.DEFAULT_VISIBLE_LIMIT = exports.CHECKLIST_ENTITY = void 0;
const common_1 = require("@nestjs/common");
const zod_1 = require("zod");
const prisma_service_1 = require("../../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const drafts_service_1 = require("../drafts/drafts.service");
const settings_service_1 = require("../settings/settings.service");
const session_admin_1 = require("../../common/types/session-admin");
const checklist_dto_1 = require("./dto/checklist.dto");
exports.CHECKLIST_ENTITY = 'ChecklistItem';
const SECTION = 'Parent checklist';
exports.DEFAULT_VISIBLE_LIMIT = 5;
const limitKey = (regionId) => `checklist.visibleLimit:${regionId}`;
exports.limitKey = limitKey;
const contentSchema = zod_1.z.object({
    regionId: zod_1.z.string(),
    week: zod_1.z.number().int().min(1).max(3),
    title: zod_1.z.string(),
    description: zod_1.z.string(),
    position: zod_1.z.number().int().min(1),
    status: zod_1.z.enum(['DRAFT', 'PUBLISHED']),
});
const payloadSchema = zod_1.z.union([
    zod_1.z.object({ delete: zod_1.z.literal(true), requested: zod_1.z.enum(['publish', 'draft']) }),
    contentSchema.extend({ delete: zod_1.z.undefined().optional(), requested: zod_1.z.enum(['publish', 'draft']) }),
]);
const snapshot = (tx, id) => tx.checklistItem.findUnique({ where: { id }, select: { id: true, regionId: true, week: true, title: true, description: true, position: true, status: true } });
const contentOf = (p) => p.delete ? null : { regionId: p.regionId, week: p.week, title: p.title, description: p.description, position: p.position, status: p.status };
const pendingStatus = (requested) => (requested === 'draft' ? 'DRAFT' : 'PENDING_APPROVAL');
let ChecklistService = class ChecklistService {
    constructor(prisma, drafts, settings, audit) {
        this.prisma = prisma;
        this.drafts = drafts;
        this.settings = settings;
        this.audit = audit;
    }
    onModuleInit() {
        this.drafts.register(exports.CHECKLIST_ENTITY, {
            snapshot,
            apply: async (tx, id, raw) => {
                const p = payloadSchema.parse(raw);
                if (p.delete) {
                    if (!id)
                        throw new common_1.BadRequestException('Checklist item not found.');
                    await tx.checklistItem.delete({ where: { id } });
                    return id;
                }
                const data = { week: p.week, title: p.title, description: p.description, position: p.position, status: p.status };
                if (id) {
                    const item = await tx.checklistItem.findUnique({ where: { id } });
                    if (!item)
                        throw new common_1.NotFoundException('Checklist item not found.');
                    if (item.regionId !== p.regionId)
                        throw new common_1.BadRequestException('An item stays in its regional learning category.');
                    await tx.checklistItem.update({ where: { id }, data });
                    return id;
                }
                if (!(await tx.learningRegion.count({ where: { id: p.regionId } })))
                    throw new common_1.BadRequestException(checklist_dto_1.REGION);
                return (await tx.checklistItem.create({ data: { ...data, regionId: p.regionId } })).id;
            },
        });
    }
    async region(regionId) {
        const region = await this.prisma.learningRegion.findUnique({ where: { id: regionId } });
        if (!region)
            throw new common_1.BadRequestException(checklist_dto_1.REGION);
        return region;
    }
    pendingFor(id) {
        return this.prisma.draftApproval.findFirst({ where: { entityType: exports.CHECKLIST_ENTITY, entityId: id, status: 'PENDING' }, orderBy: { createdAt: 'desc' } });
    }
    unpublished(id) {
        return this.prisma.draftApproval.findFirst({ where: { id, entityType: exports.CHECKLIST_ENTITY, entityId: null, status: 'PENDING' }, include: { author: { select: { name: true } } } });
    }
    async list(regionId) {
        await this.region(regionId);
        const [items, drafts, limitDraft] = await Promise.all([
            this.prisma.checklistItem.findMany({ where: { regionId } }),
            this.prisma.draftApproval.findMany({
                where: { entityType: exports.CHECKLIST_ENTITY, status: 'PENDING', regionId },
                include: { author: { select: { name: true } } },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.draftApproval.findFirst({
                where: { entityType: settings_service_1.SETTING_ENTITY, entityId: (0, exports.limitKey)(regionId), status: 'PENDING' },
                include: { author: { select: { name: true } } },
                orderBy: { createdAt: 'desc' },
            }),
        ]);
        const pending = (d, p) => ({
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
                    status: i.status,
                    isNew: false,
                    pending: d && p?.success ? pending(d, p.data) : null,
                    createdAt: i.createdAt,
                };
            }),
            ...drafts.flatMap((d) => {
                if (d.entityId)
                    return [];
                const p = payloadSchema.safeParse(d.after);
                if (!p.success || p.data.delete)
                    return [];
                return [{ id: d.id, ...contentOf(p.data), isNew: true, pending: pending(d, p.data), createdAt: d.createdAt }];
            }),
        ].sort((a, b) => a.week - b.week || a.position - b.position || a.createdAt.getTime() - b.createdAt.getTime());
        const limitValue = limitDraft?.after ?? undefined;
        return {
            items: rows.map(({ createdAt: _createdAt, ...row }) => row),
            visibleLimit: await this.settings.get((0, exports.limitKey)(regionId), exports.DEFAULT_VISIBLE_LIMIT),
            visibleLimitPending: limitDraft && typeof limitValue?.value === 'number'
                ? {
                    status: limitValue.requested === 'draft' ? 'DRAFT' : 'PENDING_APPROVAL',
                    value: limitValue.value,
                    authorName: limitDraft.author.name,
                    draftId: limitDraft.id,
                }
                : null,
        };
    }
    async save(admin, id, dto) {
        const region = await this.region(dto.regionId);
        const payload = {
            regionId: dto.regionId,
            week: dto.week,
            title: dto.title,
            description: dto.description,
            position: dto.position,
            status: dto.status,
            requested: dto.mode,
        };
        const base = { admin, mode: dto.mode, section: SECTION, entityType: exports.CHECKLIST_ENTITY, payload, label: dto.title, regionId: region.id };
        if (!id)
            return this.drafts.saveOrDraft({ ...base, entityId: null });
        const live = await this.prisma.checklistItem.findUnique({ where: { id } });
        if (live) {
            if (live.regionId !== dto.regionId)
                throw new common_1.BadRequestException('An item stays in its regional learning category.');
            const pending = await this.pendingFor(id);
            return this.drafts.saveOrDraft({ ...base, entityId: id, pendingDraftId: pending?.id ?? null });
        }
        const draft = await this.unpublished(id);
        if (!draft)
            throw new common_1.NotFoundException('Checklist item not found.');
        const content = payloadSchema.safeParse(draft.after);
        if (content.success && !content.data.delete && content.data.regionId !== dto.regionId) {
            throw new common_1.BadRequestException('An item stays in its regional learning category.');
        }
        return this.drafts.saveOrDraft({ ...base, entityId: null, pendingDraftId: draft.id });
    }
    async remove(admin, id, mode) {
        const live = await this.prisma.checklistItem.findUnique({ where: { id } });
        if (live) {
            const pending = await this.pendingFor(id);
            return this.drafts.saveOrDraft({
                admin,
                mode,
                section: SECTION,
                entityType: exports.CHECKLIST_ENTITY,
                entityId: id,
                payload: { delete: true, requested: mode },
                label: `Removed ${live.title}`,
                regionId: live.regionId,
                pendingDraftId: pending?.id ?? null,
            });
        }
        const draft = await this.unpublished(id);
        if (!draft)
            throw new common_1.NotFoundException('Checklist item not found.');
        if (!(0, session_admin_1.isSuperAdmin)(admin) && draft.authorId !== admin.id)
            throw new common_1.ForbiddenException('You can only edit your own drafts.');
        const title = draft.label ?? 'checklist item';
        await this.prisma.$transaction(async (tx) => {
            const { count } = await tx.draftApproval.updateMany({
                where: { id: draft.id, status: 'PENDING' },
                data: { status: 'REJECTED', reason: 'Deleted before it was published.', reviewedById: admin.id, reviewedAt: new Date() },
            });
            if (!count)
                throw new common_1.ConflictException('This change was already reviewed. Reopen the item and try again.');
            await this.audit.write(admin, { action: `Deleted draft: ${SECTION} · ${title}`, section: SECTION, entityType: exports.CHECKLIST_ENTITY, entityId: null }, tx);
        });
        return { status: 'discarded', draftId: draft.id };
    }
    async saveLimit(admin, dto) {
        const region = await this.region(dto.regionId);
        const key = (0, exports.limitKey)(region.id);
        const pending = await this.prisma.draftApproval.findFirst({ where: { entityType: settings_service_1.SETTING_ENTITY, entityId: key, status: 'PENDING' }, orderBy: { createdAt: 'desc' } });
        return this.drafts.saveOrDraft({
            admin,
            mode: dto.mode,
            section: SECTION,
            entityType: settings_service_1.SETTING_ENTITY,
            entityId: key,
            payload: { value: dto.visibleLimit, requested: dto.mode },
            label: `Parent checklist items visible at once (${region.name}): ${dto.visibleLimit}`,
            regionId: region.id,
            pendingDraftId: pending?.id ?? null,
        });
    }
};
exports.ChecklistService = ChecklistService;
exports.ChecklistService = ChecklistService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        drafts_service_1.DraftsService,
        settings_service_1.SettingsService,
        audit_service_1.AuditService])
], ChecklistService);
//# sourceMappingURL=checklist.service.js.map