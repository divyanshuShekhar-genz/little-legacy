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
exports.CategoriesService = exports.CATEGORY_ENTITY = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const drafts_service_1 = require("../drafts/drafts.service");
const region_1 = require("../../common/utils/region");
const child_levels_1 = require("../../common/utils/child-levels");
exports.CATEGORY_ENTITY = 'ActivityCategory';
const SECTION = 'Developmental Milestones';
const snapshot = (tx, id) => tx.activityCategory.findUnique({ where: { id }, select: { id: true, areaId: true, name: true, description: true, removedAt: true } });
async function assertNameFree(db, areaId, name, excludeId) {
    const taken = await db.activityCategory.findFirst({
        where: { areaId, removedAt: null, name: { equals: name, mode: 'insensitive' }, ...(excludeId ? { id: { not: excludeId } } : {}) },
    });
    if (taken)
        throw new common_1.ConflictException('This category already exists in this development area. Use a different name.');
}
async function hasChildHistory(db, categoryId) {
    const counts = await Promise.all([
        db.activityAttempt.count({ where: { activity: { categoryId } } }),
        db.weeklyAssignment.count({ where: { activity: { categoryId } } }),
        db.childFamilyStage.count({ where: { family: { categoryId } } }),
        db.childAreaLevel.count({ where: { categoryId } }),
    ]);
    return counts.some((n) => n > 0);
}
let CategoriesService = class CategoriesService {
    constructor(prisma, drafts) {
        this.prisma = prisma;
        this.drafts = drafts;
    }
    onModuleInit() {
        this.drafts.register(exports.CATEGORY_ENTITY, {
            snapshot,
            apply: async (tx, id, payload) => {
                if (payload.delete) {
                    if (!id)
                        throw new common_1.NotFoundException('Category not found');
                    const category = await (0, region_1.currentCategory)(tx, id);
                    await removeCategory(tx, category.id, category.areaId);
                    return category.id;
                }
                await (0, region_1.currentArea)(tx, payload.areaId);
                await assertNameFree(tx, payload.areaId, payload.name, id);
                if (id) {
                    await tx.activityCategory.update({ where: { id }, data: { name: payload.name, description: payload.description } });
                    return id;
                }
                const isFirst = (await tx.activityCategory.count({ where: { areaId: payload.areaId, removedAt: null } })) === 0;
                const created = await tx.activityCategory.create({ data: { areaId: payload.areaId, name: payload.name, description: payload.description } });
                if (isFirst) {
                    await (0, child_levels_1.freezeEarnedLevels)(tx, payload.areaId);
                    await tx.level.updateMany({ where: { areaId: payload.areaId, categoryId: null }, data: { categoryId: created.id } });
                    await tx.activity.updateMany({ where: { areaId: payload.areaId, categoryId: null }, data: { categoryId: created.id } });
                }
                return created.id;
            },
        });
    }
    async list(areaId) {
        await (0, region_1.currentArea)(this.prisma, areaId);
        const categories = await this.prisma.activityCategory.findMany({
            where: { areaId, removedAt: null },
            include: { _count: { select: { levels: true, activities: { where: { withdrawnAt: null } } } } },
            orderBy: { name: 'asc' },
        });
        return {
            categories: categories.map(({ _count, ...c }) => ({ id: c.id, name: c.name, description: c.description, counts: _count })),
        };
    }
    async create(admin, dto) {
        const area = await (0, region_1.currentArea)(this.prisma, dto.areaId);
        await assertNameFree(this.prisma, area.id, dto.name, null);
        const payload = { areaId: area.id, name: dto.name, description: dto.description };
        return this.drafts.saveOrDraft({ admin, mode: dto.mode, section: SECTION, entityType: exports.CATEGORY_ENTITY, entityId: null, regionId: area.regionId, payload, label: `${area.name} · ${dto.name}` });
    }
    async update(admin, id, dto) {
        const category = await (0, region_1.currentCategory)(this.prisma, id);
        const payload = {
            areaId: category.areaId,
            name: dto.name ?? category.name,
            description: dto.description !== undefined ? dto.description : category.description,
        };
        await assertNameFree(this.prisma, category.areaId, payload.name, id);
        return this.drafts.saveOrDraft({ admin, mode: dto.mode, section: SECTION, entityType: exports.CATEGORY_ENTITY, entityId: id, regionId: category.area.regionId, payload, label: `${category.area.name} · ${payload.name}` });
    }
    async remove(admin, id, dto) {
        const category = await (0, region_1.currentCategory)(this.prisma, id);
        return this.drafts.saveOrDraft({ admin, mode: dto.mode, section: SECTION, entityType: exports.CATEGORY_ENTITY, entityId: id, regionId: category.area.regionId, payload: { delete: true }, label: `Removed ${category.area.name} · ${category.name}` });
    }
};
exports.CategoriesService = CategoriesService;
exports.CategoriesService = CategoriesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        drafts_service_1.DraftsService])
], CategoriesService);
async function removeCategory(tx, categoryId, areaId) {
    const history = await hasChildHistory(tx, categoryId);
    await (0, child_levels_1.freezeEarnedLevels)(tx, areaId);
    if (!history) {
        await tx.activity.deleteMany({ where: { categoryId } });
        await tx.activityCategory.delete({ where: { id: categoryId } });
        return;
    }
    const now = new Date();
    const activities = await tx.activity.findMany({ where: { categoryId }, select: { id: true } });
    await tx.activity.updateMany({ where: { categoryId, withdrawnAt: null }, data: { withdrawnAt: now, status: 'WITHDRAWN' } });
    await tx.mandatoryActivity.deleteMany({ where: { activityId: { in: activities.map((a) => a.id) } } });
    await tx.activityFamily.updateMany({ where: { categoryId }, data: { archived: true } });
    await tx.activityCategory.update({ where: { id: categoryId }, data: { removedAt: now } });
}
//# sourceMappingURL=categories.service.js.map