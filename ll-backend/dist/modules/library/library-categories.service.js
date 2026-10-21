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
exports.LibraryCategoriesService = exports.LIBRARY_CATEGORY_ENTITY = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const drafts_service_1 = require("../drafts/drafts.service");
const json_1 = require("../../common/utils/json");
const session_admin_1 = require("../../common/types/session-admin");
const library_service_1 = require("./library.service");
exports.LIBRARY_CATEGORY_ENTITY = 'LibraryCategory';
const SECTION_OF = { STORY: 'stories', RHYME: 'rhymes' };
const SECTION_NAME = { STORY: 'Stories', RHYME: 'Rhymes' };
const snapshot = (tx, id) => tx.libraryCategory.findUnique({ where: { id }, select: { id: true, kind: true, name: true } });
const isAll = (name) => name.toLowerCase() === 'all';
async function usage(db, kind) {
    const [items, drafts] = await Promise.all([
        db.libraryItem.findMany({ where: { kind }, select: { id: true, categoryId: true } }),
        db.draftApproval.findMany({ where: { entityType: library_service_1.LIBRARY_ENTITY, status: 'PENDING' }, select: { entityId: true, after: true } }),
    ]);
    const count = new Map();
    const add = (id) => id && count.set(id, (count.get(id) ?? 0) + 1);
    for (const i of items)
        add(i.categoryId);
    for (const d of drafts) {
        const p = d.after;
        if (p.kind !== kind)
            continue;
        const live = d.entityId ? items.find((i) => i.id === d.entityId) : null;
        if (!live || live.categoryId !== p.content?.categoryId)
            add(p.content?.categoryId);
    }
    return count;
}
async function moveContent(tx, fromId, toId) {
    await tx.libraryItem.updateMany({ where: { categoryId: fromId }, data: { categoryId: toId } });
    await tx.libraryEngagement.updateMany({ where: { categoryId: fromId }, data: { categoryId: toId } });
    const drafts = await tx.draftApproval.findMany({ where: { entityType: library_service_1.LIBRARY_ENTITY, status: 'PENDING' } });
    for (const d of drafts) {
        const p = d.after;
        if (p.content?.categoryId !== fromId)
            continue;
        await tx.draftApproval.update({ where: { id: d.id }, data: { after: (0, json_1.toJson)({ ...p, content: { ...p.content, categoryId: toId } }) ?? {} } });
    }
}
const sameName = (db, kind, name, excludeId) => db.libraryCategory.findFirst({ where: { kind, name: { equals: name, mode: 'insensitive' }, ...(excludeId ? { id: { not: excludeId } } : {}) } });
async function checkDelete(db, category, replacementId) {
    const inUse = ((await usage(db, category.kind)).get(category.id) ?? 0) > 0;
    if (!inUse)
        return replacementId && replacementId !== category.id ? replacementId : null;
    const others = await db.libraryCategory.count({ where: { kind: category.kind, id: { not: category.id } } });
    if (!others)
        throw new common_1.BadRequestException('Create a replacement category first.');
    const replacement = replacementId ? await db.libraryCategory.findUnique({ where: { id: replacementId } }) : null;
    if (!replacement || replacement.kind !== category.kind || replacement.id === category.id) {
        throw new common_1.BadRequestException('Choose a category to move this content to.');
    }
    return replacement.id;
}
let LibraryCategoriesService = class LibraryCategoriesService {
    constructor(prisma, drafts) {
        this.prisma = prisma;
        this.drafts = drafts;
    }
    onModuleInit() {
        this.drafts.register(exports.LIBRARY_CATEGORY_ENTITY, {
            snapshot,
            apply: async (tx, id, p) => {
                if (p.action === 'create') {
                    if (await sameName(tx, p.kind, p.name, null))
                        throw new common_1.ConflictException('This category already exists.');
                    return (await tx.libraryCategory.create({ data: { kind: p.kind, name: p.name } })).id;
                }
                const category = id ? await tx.libraryCategory.findUnique({ where: { id } }) : null;
                if (!category)
                    throw new common_1.NotFoundException('Category not found');
                if (p.action === 'rename') {
                    const target = await sameName(tx, category.kind, p.name, category.id);
                    if (!target) {
                        await tx.libraryCategory.update({ where: { id: category.id }, data: { name: p.name } });
                        return category.id;
                    }
                    await moveContent(tx, category.id, target.id);
                    await tx.libraryCategory.delete({ where: { id: category.id } });
                    return target.id;
                }
                const moveTo = await checkDelete(tx, category, p.replacementId);
                if (moveTo)
                    await moveContent(tx, category.id, moveTo);
                await tx.libraryCategory.delete({ where: { id: category.id } });
                return category.id;
            },
        });
    }
    assertCanManage(admin, kind) {
        if (!(0, session_admin_1.hasAnySection)(admin, [SECTION_OF[kind]]))
            throw new common_1.ForbiddenException('You do not have access to this section');
    }
    async category(id) {
        const category = await this.prisma.libraryCategory.findUnique({ where: { id } });
        if (!category)
            throw new common_1.NotFoundException('Category not found');
        return category;
    }
    async list(admin, kind) {
        if (!(0, session_admin_1.hasAnySection)(admin, [SECTION_OF[kind], 'notifications']))
            throw new common_1.ForbiddenException('You do not have access to this section');
        const [categories, counts] = await Promise.all([
            this.prisma.libraryCategory.findMany({ where: { kind }, orderBy: { name: 'asc' } }),
            usage(this.prisma, kind),
        ]);
        return { rows: categories.map((c) => ({ id: c.id, kind: c.kind, name: c.name, itemCount: counts.get(c.id) ?? 0 })) };
    }
    async create(admin, dto) {
        this.assertCanManage(admin, dto.kind);
        if (!dto.name || isAll(dto.name))
            throw new common_1.BadRequestException('Enter a category name other than All.');
        if (await sameName(this.prisma, dto.kind, dto.name, null))
            throw new common_1.ConflictException('This category already exists.');
        return this.drafts.saveOrDraft({ admin, mode: dto.mode, section: SECTION_NAME[dto.kind], entityType: exports.LIBRARY_CATEGORY_ENTITY, entityId: null, payload: { action: 'create', kind: dto.kind, name: dto.name }, label: `New category: ${dto.name}` });
    }
    async rename(admin, id, dto) {
        const category = await this.category(id);
        this.assertCanManage(admin, category.kind);
        if (!dto.name || isAll(dto.name))
            throw new common_1.BadRequestException('Enter a category name.');
        const target = await sameName(this.prisma, category.kind, dto.name, category.id);
        const result = await this.drafts.saveOrDraft({
            admin,
            mode: dto.mode,
            section: SECTION_NAME[category.kind],
            entityType: exports.LIBRARY_CATEGORY_ENTITY,
            entityId: id,
            payload: { action: 'rename', name: dto.name },
            label: target ? `Merge category ${category.name} into ${target.name}` : `Rename category ${category.name} to ${dto.name}`,
        });
        return { ...result, merged: Boolean(target) };
    }
    async remove(admin, id, dto) {
        const category = await this.category(id);
        this.assertCanManage(admin, category.kind);
        await checkDelete(this.prisma, category, dto.replacementId ?? null);
        return this.drafts.saveOrDraft({ admin, mode: dto.mode, section: SECTION_NAME[category.kind], entityType: exports.LIBRARY_CATEGORY_ENTITY, entityId: id, payload: { action: 'delete', replacementId: dto.replacementId ?? null }, label: `Delete category ${category.name}` });
    }
};
exports.LibraryCategoriesService = LibraryCategoriesService;
exports.LibraryCategoriesService = LibraryCategoriesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        drafts_service_1.DraftsService])
], LibraryCategoriesService);
//# sourceMappingURL=library-categories.service.js.map