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
exports.AppContentService = exports.VERSION_ENTITY = void 0;
const common_1 = require("@nestjs/common");
const zod_1 = require("zod");
const prisma_service_1 = require("../../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const drafts_service_1 = require("../drafts/drafts.service");
const snapshot_1 = require("../../common/utils/snapshot");
const app_content_dto_1 = require("./dto/app-content.dto");
exports.VERSION_ENTITY = 'AppContentVersion';
const ENTRY_ENTITY = 'AppContentEntry';
const SECTION = 'App Content';
const LATEST = 'latest';
const PAGE = 'Enter the parent page route for this FAQ.';
const KEY = 'Use a unique key with letters, numbers, dots, underscores or hyphens.';
const SURFACE_ORDER = new Map(app_content_dto_1.SURFACES.map((s, i) => [s, i]));
const entrySchema = zod_1.z.object({ surface: zod_1.z.enum(app_content_dto_1.SURFACES), page: zod_1.z.string().nullable(), title: zod_1.z.string(), body: zod_1.z.string() });
const entriesSchema = zod_1.z.record(entrySchema);
const payloadSchema = zod_1.z.object({
    entries: entriesSchema,
    authorId: zod_1.z.string(),
    requested: zod_1.z.enum(['publish', 'draft']),
});
async function snapshot(tx, id) {
    const row = id === LATEST
        ? await tx.appContentVersion.findFirst({ orderBy: { version: 'desc' } })
        : await tx.appContentVersion.findUnique({ where: { version: Number(id) || -1 } });
    if (!row)
        return id === LATEST ? { version: 0, entries: {} } : null;
    return { version: row.version, entries: row.entries };
}
const toVersionEntries = (rows) => Object.fromEntries(rows.map((r) => [r.key, { surface: r.surface, page: r.page, title: r.title, body: r.body }]));
let AppContentService = class AppContentService {
    constructor(prisma, drafts, audit) {
        this.prisma = prisma;
        this.drafts = drafts;
        this.audit = audit;
    }
    onModuleInit() {
        this.drafts.register(exports.VERSION_ENTITY, {
            snapshot,
            apply: async (tx, _id, raw) => {
                const p = payloadSchema.parse(raw);
                const latest = await tx.appContentVersion.findFirst({ orderBy: { version: 'desc' }, select: { version: true } });
                const created = await tx.appContentVersion.create({ data: { version: (latest?.version ?? 0) + 1, entries: p.entries, publishedById: p.authorId } });
                return String(created.version);
            },
        });
    }
    async workingDraft(db = this.prisma) {
        const rows = await db.appContentEntry.findMany();
        return rows.sort((a, b) => SURFACE_ORDER.get(a.surface) - SURFACE_ORDER.get(b.surface) ||
            (a.page ?? '').localeCompare(b.page ?? '') ||
            a.key.localeCompare(b.key, undefined, { numeric: true }));
    }
    pendingPublish() {
        return this.prisma.draftApproval.findFirst({
            where: { entityType: exports.VERSION_ENTITY, status: 'PENDING' },
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
        const publisherIds = [...new Set(versions.map((v) => v.publishedById).filter((id) => Boolean(id)))];
        const publishers = new Map((await this.prisma.adminUser.findMany({ where: { id: { in: publisherIds } }, select: { id: true, name: true } })).map((a) => [a.id, a.name]));
        const latest = versions[0];
        const pendingContent = pending ? payloadSchema.safeParse(pending.after) : null;
        return {
            entries: entries.map(({ key, surface, page, title, body }) => ({ key, surface, page, title, body })),
            versions: versions.map((v) => ({
                version: v.version,
                publishedAt: v.publishedAt.toISOString(),
                entryCount: Object.keys(v.entries).length,
                publishedByName: v.publishedById ? (publishers.get(v.publishedById) ?? null) : null,
            })),
            latest: latest ? { version: latest.version, entries: latest.entries } : null,
            pending: pending && pendingContent?.success
                ? {
                    draftId: pending.id,
                    status: pendingContent.data.requested === 'draft' ? 'DRAFT' : 'PENDING_APPROVAL',
                    entries: pendingContent.data.entries,
                    authorName: pending.author.name,
                    createdAt: pending.createdAt.toISOString(),
                }
                : null,
        };
    }
    clean(dto) {
        let page = null;
        if (dto.surface === 'PAGE_FAQ') {
            if (typeof dto.page !== 'string' || !/^[a-zA-Z][\w-]*$/.test(dto.page))
                throw new common_1.BadRequestException(PAGE);
            page = dto.page;
        }
        return { surface: dto.surface, page, title: dto.title, body: dto.body };
    }
    entryRow(e) {
        return { key: e.key, surface: e.surface, page: e.page, title: e.title, body: e.body };
    }
    async createEntry(admin, dto) {
        const data = { key: dto.key, ...this.clean(dto) };
        return this.prisma.$transaction(async (tx) => {
            if (await tx.appContentEntry.findUnique({ where: { key: dto.key } }))
                throw new common_1.BadRequestException(KEY);
            const created = await tx.appContentEntry.create({ data });
            await this.audit.write(admin, { action: `Added App Content entry: ${created.key}`, section: SECTION, entityType: ENTRY_ENTITY, entityId: created.key, after: this.entryRow(created) }, tx);
            return this.entryRow(created);
        });
    }
    async updateEntry(admin, key, dto) {
        const data = this.clean(dto);
        return this.prisma.$transaction(async (tx) => {
            const existing = await tx.appContentEntry.findUnique({ where: { key } });
            if (!existing)
                throw new common_1.NotFoundException('Entry not found.');
            const before = this.entryRow(existing);
            if ((0, snapshot_1.sameSnapshot)(before, { key, ...data }))
                return before;
            const updated = await tx.appContentEntry.update({ where: { key }, data });
            await this.audit.write(admin, { action: `Updated App Content entry: ${key}`, section: SECTION, entityType: ENTRY_ENTITY, entityId: key, before, after: this.entryRow(updated) }, tx);
            return this.entryRow(updated);
        });
    }
    async deleteEntry(admin, key) {
        await this.prisma.$transaction(async (tx) => {
            const existing = await tx.appContentEntry.findUnique({ where: { key } });
            if (!existing)
                throw new common_1.NotFoundException('Entry not found.');
            await tx.appContentEntry.delete({ where: { key } });
            await this.audit.write(admin, { action: `Deleted App Content entry: ${key}`, section: SECTION, entityType: ENTRY_ENTITY, entityId: key, before: this.entryRow(existing) }, tx);
        });
        return { ok: true };
    }
    async publish(admin, mode) {
        const [draft, latest, pending] = await Promise.all([this.workingDraft(), snapshot(this.prisma, LATEST), this.pendingPublish()]);
        const entries = toVersionEntries(draft);
        if ((0, snapshot_1.sameSnapshot)(entries, latest.entries)) {
            throw new common_1.BadRequestException(latest.version ? `Nothing has changed since version ${latest.version}.` : 'Add some entries before publishing.');
        }
        return this.drafts.saveOrDraft({
            admin,
            mode,
            section: SECTION,
            entityType: exports.VERSION_ENTITY,
            entityId: LATEST,
            payload: { entries, authorId: admin.id, requested: mode },
            label: `App Content version ${latest.version + 1}`,
            pendingDraftId: pending?.id ?? null,
        });
    }
};
exports.AppContentService = AppContentService;
exports.AppContentService = AppContentService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        drafts_service_1.DraftsService,
        audit_service_1.AuditService])
], AppContentService);
//# sourceMappingURL=app-content.service.js.map