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
exports.ActivityGroupsService = exports.GROUP_LINK_ENTITY = exports.GROUP_ENTITY = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const drafts_service_1 = require("../drafts/drafts.service");
const region_1 = require("../../common/utils/region");
const groups_query_1 = require("./groups.query");
exports.GROUP_ENTITY = 'ActivityFamily';
exports.GROUP_LINK_ENTITY = 'ActivityFamilyLink';
const SECTION = 'Activity Progression';
const snapshot = (tx, id) => tx.activityFamily.findUnique({
    where: { id },
    select: { id: true, regionId: true, areaId: true, categoryId: true, age: true, name: true, skillId: true, benchmark: true, mandatory: true, baseEligibility: true, archived: true },
});
const linkSnapshot = async (tx, id) => {
    const g = await tx.activityFamily.findUnique({ where: { id }, include: { activities: { select: { id: true, difficultyLevel: true }, orderBy: { id: 'asc' } } } });
    return g && { id: g.id, archived: g.archived, difficulties: g.activities.map((a) => ({ id: a.id, level: a.difficultyLevel })) };
};
async function validate(db, p, id) {
    const area = await (0, region_1.currentArea)(db, p.areaId).catch(() => {
        throw new common_1.BadRequestException('Choose a development area.');
    });
    if (!(await db.ageGroup.findUnique({ where: { regionId_age: { regionId: area.regionId, age: p.age } } }))) {
        throw new common_1.BadRequestException("Choose an age group. Add it first if it isn't listed.");
    }
    const hasCategories = (await db.activityCategory.count({ where: { areaId: area.id, removedAt: null } })) > 0;
    if (hasCategories || p.categoryId) {
        const category = p.categoryId ? await (0, region_1.currentCategory)(db, p.categoryId).catch(() => null) : null;
        if (!category || category.areaId !== area.id)
            throw new common_1.BadRequestException('Choose a category in this area.');
    }
    if (p.skillId) {
        const skill = await db.skill.findUnique({ where: { id: p.skillId } });
        if (!skill || skill.areaId !== area.id)
            throw new common_1.BadRequestException('Choose a skill from this development area.');
    }
    const taken = await db.activityFamily.findFirst({
        where: { areaId: p.areaId, age: p.age, name: { equals: p.name, mode: 'insensitive' }, ...(id ? { id: { not: id } } : {}) },
    });
    if (taken)
        throw new common_1.ConflictException('This activity already exists for this area and age.');
    if (id) {
        const existing = await db.activityFamily.findUnique({ where: { id }, include: { _count: { select: { activities: { where: { withdrawnAt: null } } } } } });
        if (!existing)
            throw new common_1.NotFoundException('Activity group not found');
        if ((existing.areaId !== p.areaId || existing.categoryId !== p.categoryId) && existing._count.activities > 0) {
            throw new common_1.BadRequestException("Move or remove this group's difficulty levels before changing its area or category.");
        }
    }
    return area;
}
let ActivityGroupsService = class ActivityGroupsService {
    constructor(prisma, drafts) {
        this.prisma = prisma;
        this.drafts = drafts;
    }
    onModuleInit() {
        this.drafts.register(exports.GROUP_ENTITY, {
            snapshot,
            apply: async (tx, id, payload) => {
                if (payload.archive) {
                    const group = id ? await tx.activityFamily.findUnique({ where: { id } }) : null;
                    if (!group)
                        throw new common_1.NotFoundException('Activity group not found');
                    await tx.activityFamily.update({ where: { id: group.id }, data: { archived: true } });
                    return group.id;
                }
                const area = await validate(tx, payload, id);
                const data = { ...payload, regionId: area.regionId };
                if (!id)
                    return (await tx.activityFamily.create({ data })).id;
                await tx.activityFamily.update({ where: { id }, data });
                await tx.activity.updateMany({ where: { familyId: id }, data: { age: payload.age, skillId: payload.skillId } });
                return id;
            },
        });
        this.drafts.register(exports.GROUP_LINK_ENTITY, {
            snapshot: linkSnapshot,
            apply: async (tx, groupId, { activityId }) => {
                if (!groupId)
                    throw new common_1.NotFoundException('Activity group not found');
                const level = await this.assertLinkable(tx, groupId, activityId);
                await tx.activity.update({ where: { id: activityId }, data: { familyId: groupId, difficultyLevel: level } });
                return groupId;
            },
        });
    }
    async assertLinkable(db, groupId, activityId) {
        const group = await db.activityFamily.findUnique({ where: { id: groupId } });
        if (!group || group.archived)
            throw new common_1.NotFoundException('Activity group not found');
        const activity = await db.activity.findUnique({ where: { id: activityId }, include: { level: true } });
        if (!activity || activity.withdrawnAt || activity.familyId ||
            activity.areaId !== group.areaId || activity.age !== group.age || activity.categoryId !== group.categoryId) {
            throw new common_1.BadRequestException('Choose an ungrouped activity with the same area, category and age.');
        }
        const level = activity.level?.number ?? 1;
        if (await db.activity.findFirst({ where: { familyId: groupId, difficultyLevel: level } })) {
            throw new common_1.ConflictException('This difficulty number already exists in the group.');
        }
        return level;
    }
    async list(regionId) {
        await (0, region_1.assertRegion)(this.prisma, regionId);
        return { rows: await (0, groups_query_1.listGroups)(this.prisma, regionId) };
    }
    fields(dto) {
        return {
            areaId: dto.areaId,
            categoryId: dto.categoryId ?? null,
            age: dto.age,
            name: dto.name,
            skillId: dto.skillId ?? null,
            benchmark: dto.benchmark,
            mandatory: dto.mandatory,
            baseEligibility: [...new Set(dto.bases.map(groups_query_1.basePosition))].sort(),
        };
    }
    async create(admin, dto) {
        const payload = this.fields(dto);
        const area = await validate(this.prisma, payload, null);
        return this.drafts.saveOrDraft({ admin, mode: dto.mode, section: SECTION, entityType: exports.GROUP_ENTITY, entityId: null, regionId: area.regionId, payload, label: `${area.name} · ${dto.name}` });
    }
    async update(admin, id, dto) {
        const existing = await this.prisma.activityFamily.findUnique({ where: { id } });
        if (!existing || existing.archived)
            throw new common_1.NotFoundException('Activity group not found');
        const payload = this.fields(dto);
        const area = await validate(this.prisma, payload, id);
        return this.drafts.saveOrDraft({ admin, mode: dto.mode, section: SECTION, entityType: exports.GROUP_ENTITY, entityId: id, regionId: area.regionId, payload, label: `${area.name} · ${dto.name}` });
    }
    async archive(admin, id, dto) {
        const existing = await this.prisma.activityFamily.findUnique({ where: { id } });
        if (!existing)
            throw new common_1.NotFoundException('Activity group not found');
        if (existing.archived)
            throw new common_1.BadRequestException('This activity group is already archived.');
        return this.drafts.saveOrDraft({ admin, mode: dto.mode, section: SECTION, entityType: exports.GROUP_ENTITY, entityId: id, regionId: existing.regionId, payload: { archive: true }, label: `Archived ${existing.name}` });
    }
    async link(admin, id, dto) {
        await this.assertLinkable(this.prisma, id, dto.activityId);
        const group = await this.prisma.activityFamily.findUniqueOrThrow({ where: { id } });
        return this.drafts.saveOrDraft({ admin, mode: dto.mode, section: SECTION, entityType: exports.GROUP_LINK_ENTITY, entityId: id, regionId: group.regionId, payload: { activityId: dto.activityId }, label: `Linked content to ${group.name}` });
    }
};
exports.ActivityGroupsService = ActivityGroupsService;
exports.ActivityGroupsService = ActivityGroupsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        drafts_service_1.DraftsService])
], ActivityGroupsService);
//# sourceMappingURL=activity-groups.service.js.map