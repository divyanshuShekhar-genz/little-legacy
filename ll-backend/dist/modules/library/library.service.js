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
exports.LibraryService = exports.KIND_WORDS = exports.LIBRARY_ENTITY = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const drafts_service_1 = require("../drafts/drafts.service");
const json_1 = require("../../common/utils/json");
exports.LIBRARY_ENTITY = 'LibraryItem';
exports.KIND_WORDS = {
    STORY: { section: 'Stories', title: 'Enter a story title.', notFound: 'Story not found' },
    RHYME: { section: 'Rhymes', title: 'Enter a rhyme title.', notFound: 'Rhyme not found' },
};
const TREE = {
    chapters: { orderBy: { position: 'asc' }, include: { pages: { orderBy: { position: 'asc' }, include: { images: { orderBy: { position: 'asc' } } } } } },
};
function toContent(item) {
    return {
        title: item.title,
        categoryId: item.categoryId,
        coverUrl: item.coverUrl,
        description: item.description,
        minimumPlan: item.minimumPlan,
        mediaUrl: item.mediaUrl,
        lyrics: item.lyrics,
        chapters: item.chapters.map((c) => ({
            id: c.id,
            position: c.position,
            title: c.title,
            musicUrl: c.musicUrl,
            pages: c.pages.map((p) => ({
                id: p.id,
                position: p.position,
                description: p.description,
                images: p.images.map((i) => ({ id: i.id, position: i.position, imageUrl: i.imageUrl })),
            })),
        })),
    };
}
const snapshot = async (tx, id) => {
    const item = await tx.libraryItem.findUnique({ where: { id }, include: TREE });
    return item && { id: item.id, kind: item.kind, status: item.status, ...toContent(item) };
};
const pendingStatus = (p) => (p.requested === 'draft' ? 'DRAFT' : 'PENDING_APPROVAL');
async function checkUploads(db, kind, c) {
    const images = [c.coverUrl, ...c.chapters.flatMap((ch) => ch.pages.flatMap((p) => p.images.map((i) => i.imageUrl)))].filter((u) => Boolean(u));
    const music = c.chapters.map((ch) => ch.musicUrl).filter((u) => Boolean(u));
    const media = kind === 'RHYME' && c.mediaUrl ? [c.mediaUrl] : [];
    const urls = [...new Set([...images, ...music, ...media])];
    const uploads = urls.length ? await db.upload.findMany({ where: { url: { in: urls } }, select: { url: true, kind: true } }) : [];
    const kindOf = (url) => uploads.find((u) => u.url === url)?.kind;
    if (images.some((u) => kindOf(u) !== 'IMAGE'))
        throw new common_1.BadRequestException('Use an image uploaded with the image picker.');
    if (music.some((u) => kindOf(u) !== 'AUDIO'))
        throw new common_1.BadRequestException('Choose an audio file for the chapter music.');
    if (media.some((u) => kindOf(u) !== 'AUDIO' && kindOf(u) !== 'VIDEO'))
        throw new common_1.BadRequestException('Choose an audio or video file.');
}
async function validate(db, kind, c, mode) {
    if (!c.title.trim())
        throw new common_1.BadRequestException(exports.KIND_WORDS[kind].title);
    if (c.categoryId) {
        const category = await db.libraryCategory.findUnique({ where: { id: c.categoryId } });
        if (!category || category.kind !== kind)
            throw new common_1.BadRequestException('Choose a category.');
    }
    if (mode === 'draft')
        return;
    if (kind === 'RHYME' && c.chapters.length !== 1)
        throw new common_1.BadRequestException('Each rhyme must have exactly one chapter.');
    if (!c.categoryId)
        throw new common_1.BadRequestException('Choose a category.');
    if (c.chapters.length === 0 || c.chapters.some((ch) => !ch.title.trim() || ch.pages.length === 0)) {
        throw new common_1.BadRequestException('Every chapter needs a name and at least one page.');
    }
    await checkUploads(db, kind, c);
}
async function writeTree(tx, itemId, c, existing) {
    const own = {
        chapters: new Set(existing?.chapters.map((x) => x.id) ?? []),
        pages: new Set(existing?.chapters.flatMap((x) => x.pages.map((p) => p.id)) ?? []),
        images: new Set(existing?.chapters.flatMap((x) => x.pages.flatMap((p) => p.images.map((i) => i.id))) ?? []),
    };
    const isOwn = (set, id) => id !== null && set.has(id);
    const keptChapters = new Set(c.chapters.map((ch) => ch.id).filter((id) => isOwn(own.chapters, id)));
    const removed = [...own.chapters].filter((id) => !keptChapters.has(id));
    if (removed.length && (await tx.readingHistory.count({ where: { chapterId: { in: removed } } }))) {
        throw new common_1.BadRequestException("Children have read this chapter, so it can't be removed.");
    }
    const keptPages = [];
    const keptImages = [];
    for (const [ci, ch] of c.chapters.entries()) {
        const chapterData = { position: ci + 1, title: ch.title.trim(), musicUrl: ch.musicUrl };
        const chapterId = isOwn(own.chapters, ch.id)
            ? (await tx.libraryChapter.update({ where: { id: ch.id }, data: chapterData })).id
            : (await tx.libraryChapter.create({ data: { ...chapterData, itemId } })).id;
        for (const [pi, page] of ch.pages.entries()) {
            const pageData = { chapterId, position: pi + 1, description: page.description };
            const pageId = isOwn(own.pages, page.id)
                ? (await tx.libraryPage.update({ where: { id: page.id }, data: pageData })).id
                : (await tx.libraryPage.create({ data: pageData })).id;
            keptPages.push(pageId);
            for (const [ii, image] of page.images.entries()) {
                const imageData = { pageId, position: ii + 1, imageUrl: image.imageUrl };
                const imageId = isOwn(own.images, image.id)
                    ? (await tx.libraryPageImage.update({ where: { id: image.id }, data: imageData })).id
                    : (await tx.libraryPageImage.create({ data: imageData })).id;
                keptImages.push(imageId);
            }
        }
    }
    await tx.libraryPageImage.deleteMany({ where: { page: { chapter: { itemId } }, id: { notIn: keptImages } } });
    await tx.libraryPage.deleteMany({ where: { chapter: { itemId }, id: { notIn: keptPages } } });
    if (removed.length)
        await tx.libraryChapter.deleteMany({ where: { id: { in: removed } } });
}
let LibraryService = class LibraryService {
    constructor(prisma, drafts, audit) {
        this.prisma = prisma;
        this.drafts = drafts;
        this.audit = audit;
    }
    onModuleInit() {
        this.drafts.register(exports.LIBRARY_ENTITY, {
            snapshot,
            apply: async (tx, id, { kind, content }) => {
                await validate(tx, kind, content, 'publish');
                const data = {
                    kind,
                    title: content.title.trim(),
                    categoryId: content.categoryId,
                    coverUrl: content.coverUrl,
                    description: content.description,
                    minimumPlan: content.minimumPlan,
                    mediaUrl: kind === 'RHYME' ? content.mediaUrl : null,
                    lyrics: kind === 'RHYME' ? content.lyrics : null,
                    status: 'PUBLISHED',
                };
                if (!id) {
                    const created = await tx.libraryItem.create({ data });
                    await writeTree(tx, created.id, content, null);
                    return created.id;
                }
                const existing = await tx.libraryItem.findUnique({ where: { id }, include: TREE });
                if (!existing || existing.kind !== kind)
                    throw new common_1.NotFoundException(exports.KIND_WORDS[kind].notFound);
                await tx.libraryItem.update({ where: { id }, data });
                await writeTree(tx, id, content, existing);
                return id;
            },
        });
    }
    async resolve(kind, id) {
        const item = await this.prisma.libraryItem.findUnique({ where: { id }, include: TREE });
        if (item && item.kind === kind) {
            const pending = await this.prisma.draftApproval.findFirst({ where: { entityType: exports.LIBRARY_ENTITY, entityId: id, status: 'PENDING' }, orderBy: { createdAt: 'desc' } });
            return { item, pending };
        }
        const draft = await this.prisma.draftApproval.findUnique({ where: { id } });
        if (draft && draft.entityType === exports.LIBRARY_ENTITY && draft.entityId === null && draft.status === 'PENDING' && draft.after.kind === kind) {
            return { item: null, pending: draft };
        }
        throw new common_1.NotFoundException(exports.KIND_WORDS[kind].notFound);
    }
    async list(kind) {
        const [items, drafts, categories] = await Promise.all([
            this.prisma.libraryItem.findMany({ where: { kind }, include: { _count: { select: { chapters: true } } } }),
            this.prisma.draftApproval.findMany({ where: { entityType: exports.LIBRARY_ENTITY, status: 'PENDING' }, orderBy: { createdAt: 'desc' } }),
            this.prisma.libraryCategory.findMany({ where: { kind }, select: { id: true, name: true } }),
        ]);
        const nameOf = (id) => categories.find((c) => c.id === id)?.name ?? null;
        const payloadOf = (d) => d.after;
        const ofKind = drafts.filter((d) => payloadOf(d).kind === kind);
        const rows = [
            ...items.map((i) => {
                const pending = ofKind.find((d) => d.entityId === i.id);
                return {
                    id: i.id,
                    title: i.title,
                    categoryId: i.categoryId,
                    categoryName: nameOf(i.categoryId),
                    chapterCount: i._count.chapters,
                    status: i.status,
                    pendingStatus: pending ? pendingStatus(payloadOf(pending)) : null,
                    minimumPlan: i.minimumPlan,
                    updatedAt: i.updatedAt.toISOString(),
                };
            }),
            ...ofKind
                .filter((d) => d.entityId === null)
                .map((d) => {
                const { content } = payloadOf(d);
                return {
                    id: d.id,
                    title: content.title,
                    categoryId: content.categoryId,
                    categoryName: nameOf(content.categoryId),
                    chapterCount: content.chapters.length,
                    status: pendingStatus(payloadOf(d)),
                    pendingStatus: null,
                    minimumPlan: content.minimumPlan,
                    updatedAt: d.createdAt.toISOString(),
                };
            }),
        ].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
        return { rows };
    }
    async get(kind, id) {
        const { item, pending } = await this.resolve(kind, id);
        const payload = pending ? pending.after : null;
        if (!item) {
            return { id, status: pendingStatus(payload), ...payload.content, pending: null, draftId: pending.id };
        }
        return {
            id: item.id,
            status: item.status,
            ...toContent(item),
            pending: payload ? { status: pendingStatus(payload), content: payload.content } : null,
            draftId: pending?.id ?? null,
        };
    }
    content(kind, dto) {
        return {
            title: dto.title,
            categoryId: dto.categoryId ?? null,
            coverUrl: dto.coverUrl ?? null,
            description: dto.description ?? null,
            minimumPlan: dto.minimumPlan,
            mediaUrl: kind === 'RHYME' ? (dto.mediaUrl ?? null) : null,
            lyrics: kind === 'RHYME' ? (dto.lyrics ?? null) : null,
            chapters: dto.chapters.map((ch, ci) => ({
                id: ch.id ?? null,
                position: ci + 1,
                title: ch.title,
                musicUrl: ch.musicUrl ?? null,
                pages: ch.pages.map((p, pi) => ({
                    id: p.id ?? null,
                    position: pi + 1,
                    description: p.description ?? null,
                    images: p.images.map((img, ii) => ({ id: img.id ?? null, position: ii + 1, imageUrl: img.imageUrl })),
                })),
            })),
        };
    }
    async save(admin, kind, id, dto) {
        const target = id ? await this.resolve(kind, id) : { item: null, pending: null };
        const content = this.content(kind, dto);
        await validate(this.prisma, kind, content, dto.mode);
        return this.drafts.saveOrDraft({
            admin,
            mode: dto.mode,
            section: exports.KIND_WORDS[kind].section,
            entityType: exports.LIBRARY_ENTITY,
            entityId: target.item?.id ?? null,
            payload: { kind, requested: dto.mode, content },
            label: content.title.trim(),
            pendingDraftId: target.pending?.id ?? null,
        });
    }
    async reject(admin, kind, id, reason) {
        const { item, pending } = await this.resolve(kind, id);
        if (!pending || pending.after.requested !== 'publish') {
            throw new common_1.BadRequestException('There is no change waiting for approval.');
        }
        if (item) {
            await this.drafts.reject(admin, pending.id, reason ?? 'Rejected in the editor.');
            return { status: 'rejected', id: item.id };
        }
        const payload = pending.after;
        await this.prisma.$transaction(async (tx) => {
            await tx.draftApproval.update({ where: { id: pending.id }, data: { after: (0, json_1.toJson)({ ...payload, requested: 'draft' }) ?? {} } });
            await this.audit.write(admin, { action: `Returned to draft: ${exports.KIND_WORDS[kind].section} · ${payload.content.title}${reason ? ` (${reason})` : ''}`, section: exports.KIND_WORDS[kind].section, entityType: exports.LIBRARY_ENTITY }, tx);
        });
        return { status: 'draft', draftId: pending.id };
    }
};
exports.LibraryService = LibraryService;
exports.LibraryService = LibraryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        drafts_service_1.DraftsService,
        audit_service_1.AuditService])
], LibraryService);
//# sourceMappingURL=library.service.js.map