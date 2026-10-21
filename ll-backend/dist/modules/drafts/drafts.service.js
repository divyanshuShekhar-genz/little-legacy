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
exports.DraftsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const snapshot_1 = require("../../common/utils/snapshot");
const json_1 = require("../../common/utils/json");
const draft_refs_1 = require("../../common/utils/draft-refs");
const draft_names_1 = require("./draft-names");
const session_admin_1 = require("../../common/types/session-admin");
let DraftsService = class DraftsService {
    constructor(prisma, audit) {
        this.prisma = prisma;
        this.audit = audit;
        this.handlers = new Map();
    }
    register(entityType, handler) {
        this.handlers.set(entityType, handler);
    }
    handler(entityType) {
        const handler = this.handlers.get(entityType);
        if (!handler)
            throw new common_1.BadRequestException(`No draft handler registered for ${entityType}`);
        return handler;
    }
    saveOrDraft(opts) {
        const handler = this.handler(opts.entityType);
        const run = async (tx) => {
            const before = opts.entityId ? await handler.snapshot(tx, opts.entityId) : null;
            if (opts.entityId && before === null)
                throw new common_1.NotFoundException();
            const pending = opts.pendingDraftId ? await tx.draftApproval.findUnique({ where: { id: opts.pendingDraftId } }) : null;
            if (opts.pendingDraftId && (!pending || pending.status !== 'PENDING' || pending.entityType !== opts.entityType)) {
                throw new common_1.ConflictException('This change was already reviewed. Reopen the item and try again.');
            }
            if (opts.mode === 'publish' && (0, session_admin_1.canPublish)(opts.admin)) {
                const id = await handler.apply(tx, opts.entityId, opts.payload);
                if (pending) {
                    await tx.draftApproval.update({
                        where: { id: pending.id },
                        data: { status: 'REJECTED', reason: 'Replaced by a published change.', reviewedById: opts.admin.id, reviewedAt: new Date(), entityId: id },
                    });
                }
                const after = await handler.snapshot(tx, id);
                await this.audit.write(opts.admin, { action: `${opts.entityId ? 'Updated' : 'Created'} ${opts.entityType}: ${opts.label}`, section: opts.section, entityType: opts.entityType, entityId: id, before, after }, tx);
                return { status: 'published', id };
            }
            if (pending) {
                await tx.draftApproval.update({ where: { id: pending.id }, data: { authorId: opts.admin.id, label: opts.label, after: (0, json_1.toJson)(opts.payload) ?? {} } });
                await this.audit.write(opts.admin, { action: `Updated draft: ${opts.section} · ${opts.label}`, section: opts.section, entityType: opts.entityType, entityId: opts.entityId }, tx);
                return { status: 'draft', draftId: pending.id };
            }
            const draft = await tx.draftApproval.create({
                data: {
                    authorId: opts.admin.id,
                    section: opts.section,
                    entityType: opts.entityType,
                    entityId: opts.entityId,
                    regionId: opts.regionId,
                    label: opts.label,
                    before: (0, json_1.toJson)(before),
                    after: (0, json_1.toJson)(opts.payload) ?? {},
                },
            });
            await this.audit.write(opts.admin, { action: `Submitted draft for review: ${opts.section} · ${opts.label}`, section: opts.section, entityType: opts.entityType, entityId: opts.entityId }, tx);
            return { status: 'draft', draftId: draft.id };
        };
        return opts.tx ? run(opts.tx) : this.prisma.$transaction(run);
    }
    async list(admin) {
        const drafts = await this.prisma.draftApproval.findMany({
            where: (0, session_admin_1.isSuperAdmin)(admin) ? {} : { authorId: admin.id },
            include: { author: { select: { name: true } }, reviewedBy: { select: { name: true } } },
            orderBy: { createdAt: 'desc' },
        });
        const perDraft = drafts.map((d) => {
            const refs = (0, draft_refs_1.collectRefs)([d.before, d.after, d.regionId, d.entityId]);
            if (d.entityType === 'Country' && d.entityId)
                refs.countryCodes.add(d.entityId);
            return refs;
        });
        const all = { ids: new Set(perDraft.flatMap((r) => [...r.ids])), countryCodes: new Set(perDraft.flatMap((r) => [...r.countryCodes])) };
        const [names, context] = await Promise.all([(0, draft_names_1.resolveNames)(this.prisma, all), (0, draft_names_1.draftContexts)(this.prisma, drafts)]);
        return {
            drafts: drafts.map(({ author, reviewedBy, ...d }, i) => {
                const refs = perDraft[i];
                const own = Object.fromEntries([...refs.ids, ...refs.countryCodes].filter((k) => k in names).map((k) => [k, names[k]]));
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
    approve(admin, draftId) {
        return this.prisma.$transaction(async (tx) => {
            const draft = await tx.draftApproval.findUnique({ where: { id: draftId }, include: { author: true } });
            if (!draft || draft.status !== 'PENDING')
                throw new common_1.NotFoundException('Draft not found or already reviewed');
            const handler = this.handler(draft.entityType);
            if (draft.entityId) {
                const current = await handler.snapshot(tx, draft.entityId);
                if (!(0, snapshot_1.sameSnapshot)(current, draft.before)) {
                    throw new common_1.ConflictException('Published content changed since this draft. Reject it and ask the author to submit an updated change.');
                }
            }
            const id = await handler.apply(tx, draft.entityId, draft.after);
            await tx.draftApproval.update({
                where: { id: draftId },
                data: { status: 'PUBLISHED', reviewedById: admin.id, reviewedAt: new Date(), entityId: id },
            });
            await this.audit.write(admin, { action: `Published draft by ${draft.author.name}: ${draft.section}`, section: draft.section, entityType: draft.entityType, entityId: id, before: draft.before, after: draft.after }, tx);
            return { id };
        });
    }
    async reject(admin, draftId, reason) {
        if (!reason.trim())
            throw new common_1.BadRequestException('Give a reason for rejection.');
        await this.prisma.$transaction(async (tx) => {
            const draft = await tx.draftApproval.findUnique({ where: { id: draftId }, include: { author: true } });
            if (!draft || draft.status !== 'PENDING')
                throw new common_1.NotFoundException('Draft not found or already reviewed');
            await tx.draftApproval.update({
                where: { id: draftId },
                data: { status: 'REJECTED', reason, reviewedById: admin.id, reviewedAt: new Date() },
            });
            await this.audit.write(admin, { action: `Rejected draft by ${draft.author.name}: ${draft.section}`, section: draft.section }, tx);
        });
    }
};
exports.DraftsService = DraftsService;
exports.DraftsService = DraftsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], DraftsService);
//# sourceMappingURL=drafts.service.js.map