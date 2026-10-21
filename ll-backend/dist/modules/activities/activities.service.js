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
exports.ActivitiesService = exports.ACTIVITY_SECTIONS = exports.ACTIVITY_ENTITY = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const drafts_service_1 = require("../drafts/drafts.service");
const region_1 = require("../../common/utils/region");
const child_levels_1 = require("../../common/utils/child-levels");
const session_admin_1 = require("../../common/types/session-admin");
exports.ACTIVITY_ENTITY = 'Activity';
const SECTION = 'Activities';
exports.ACTIVITY_SECTIONS = ['activities', 'developmentalMilestones'];
const snapshot = async (tx, id) => {
    const a = await tx.activity.findUnique({
        where: { id },
        include: { steps: { orderBy: { position: 'asc' } }, previews: { orderBy: { position: 'asc' } } },
    });
    if (!a)
        return null;
    return {
        id: a.id,
        areaId: a.areaId,
        categoryId: a.categoryId,
        levelId: a.levelId,
        age: a.age,
        title: a.title,
        description: a.description,
        materials: a.materials,
        durationMinutes: a.durationMinutes,
        minimumPlan: a.minimumPlan,
        baseMarks: a.baseMarks,
        masteryTarget: a.masteryTarget,
        skillId: a.skillId,
        skillStage: a.skillStage,
        status: a.status,
        withdrawnAt: a.withdrawnAt,
        groupId: a.familyId,
        difficulty: a.difficultyLevel,
        steps: a.steps.map((s) => ({ title: s.title, description: s.description })),
        previews: a.previews.map((p) => ({ imageUrl: p.imageUrl, caption: p.caption })),
    };
};
async function hasChildHistory(db, activityId) {
    const [attempts, assignments] = await Promise.all([
        db.activityAttempt.count({ where: { activityId } }),
        db.weeklyAssignment.count({ where: { activityId } }),
    ]);
    return attempts + assignments > 0;
}
async function validate(db, p, activityId = null) {
    const area = await (0, region_1.currentArea)(db, p.areaId).catch(() => {
        throw new common_1.BadRequestException('Choose a development area.');
    });
    const hasCategories = (await db.activityCategory.count({ where: { areaId: area.id, removedAt: null } })) > 0;
    if (hasCategories || p.categoryId) {
        const category = p.categoryId ? await (0, region_1.currentCategory)(db, p.categoryId).catch(() => null) : null;
        if (!category || category.areaId !== area.id)
            throw new common_1.BadRequestException('Choose a category in this development area.');
    }
    const level = await db.level.findUnique({ where: { id: p.levelId } });
    if (!level || level.areaId !== area.id || level.categoryId !== p.categoryId) {
        throw new common_1.BadRequestException('Choose an existing level. Add a level first if none are available.');
    }
    if (!(await db.ageGroup.findUnique({ where: { regionId_age: { regionId: area.regionId, age: p.age } } }))) {
        throw new common_1.BadRequestException("Choose an age group. Add it first if it isn't listed.");
    }
    if (p.skillId) {
        const skill = await db.skill.findUnique({ where: { id: p.skillId } });
        if (!skill || skill.areaId !== area.id)
            throw new common_1.BadRequestException('Choose a skill from this development area.');
    }
    for (const preview of p.previews) {
        if (!preview.imageUrl && !preview.caption)
            throw new common_1.BadRequestException('Add an image or a caption to each preview.');
        if (preview.imageUrl && !(await db.upload.findFirst({ where: { url: preview.imageUrl, kind: 'IMAGE' } }))) {
            throw new common_1.BadRequestException('Use an image uploaded with the image picker.');
        }
    }
    if (p.groupId) {
        const group = await db.activityFamily.findUnique({ where: { id: p.groupId } });
        if (!group || group.archived || group.regionId !== area.regionId)
            throw new common_1.BadRequestException('Choose an activity group from this category.');
        if (group.areaId !== p.areaId || group.categoryId !== p.categoryId || group.age !== p.age) {
            throw new common_1.BadRequestException("Use the activity group's area, category and age.");
        }
        const clash = p.difficulty
            ? await db.activity.findFirst({ where: { familyId: p.groupId, difficultyLevel: p.difficulty, withdrawnAt: null, ...(activityId ? { id: { not: activityId } } : {}) } })
            : null;
        if (!p.difficulty || clash)
            throw new common_1.BadRequestException('Use a unique positive whole difficulty level for this activity.');
    }
    return area.regionId;
}
const columns = (p) => ({
    categoryId: p.categoryId,
    levelId: p.levelId,
    age: p.age,
    title: p.title,
    description: p.description,
    materials: p.materials,
    durationMinutes: p.durationMinutes,
    minimumPlan: p.minimumPlan,
    baseMarks: p.baseMarks,
    masteryTarget: p.masteryTarget,
    skillId: p.skillId,
    skillStage: p.skillStage,
    status: p.status,
    familyId: p.groupId,
    difficultyLevel: p.groupId ? p.difficulty : null,
});
const children = (p) => ({
    steps: { create: p.steps.map((s, position) => ({ position, title: s.title, description: s.description })) },
    previews: { create: p.previews.map((v, position) => ({ position, imageUrl: v.imageUrl, caption: v.caption })) },
});
let ActivitiesService = class ActivitiesService {
    constructor(prisma, drafts) {
        this.prisma = prisma;
        this.drafts = drafts;
    }
    onModuleInit() {
        this.drafts.register(exports.ACTIVITY_ENTITY, {
            snapshot,
            apply: async (tx, id, payload) => {
                if (payload.delete) {
                    const activity = id ? await tx.activity.findUnique({ where: { id } }) : null;
                    if (!activity || activity.withdrawnAt)
                        throw new common_1.NotFoundException('Activity not found');
                    await removeActivity(tx, activity.id);
                    return activity.id;
                }
                const regionId = await validate(tx, payload, id);
                if (!id) {
                    const created = await tx.activity.create({ data: { regionId, areaId: payload.areaId, ...columns(payload), ...children(payload) } });
                    return created.id;
                }
                const existing = await tx.activity.findUnique({ where: { id } });
                if (!existing || existing.withdrawnAt)
                    throw new common_1.NotFoundException('Activity not found');
                if (existing.areaId !== payload.areaId) {
                    if (await hasChildHistory(tx, id))
                        throw new common_1.BadRequestException("This activity has child records, so its development area can't change.");
                }
                if (existing.masteryTarget !== payload.masteryTarget || existing.categoryId !== payload.categoryId || existing.levelId !== payload.levelId) {
                    await (0, child_levels_1.freezeEarnedLevels)(tx, existing.areaId);
                }
                await tx.activityStep.deleteMany({ where: { activityId: id } });
                await tx.activityPreview.deleteMany({ where: { activityId: id } });
                await tx.activity.update({ where: { id }, data: { regionId, areaId: payload.areaId, ...columns(payload), ...children(payload) } });
                return id;
            },
        });
    }
    assertCanManage(admin) {
        if (!(0, session_admin_1.hasAnySection)(admin, exports.ACTIVITY_SECTIONS))
            throw new common_1.ForbiddenException('You do not have access to this section');
    }
    async list(q) {
        await (0, region_1.assertRegion)(this.prisma, q.regionId);
        const where = {
            regionId: q.regionId,
            withdrawnAt: null,
            ...(q.areaId ? { areaId: q.areaId } : {}),
            ...(q.categoryId ? { categoryId: q.categoryId } : {}),
            ...(q.levelId ? { levelId: q.levelId } : {}),
            ...(q.age !== undefined ? { age: q.age } : {}),
        };
        const activities = await this.prisma.activity.findMany({
            where,
            include: {
                area: { select: { id: true, name: true, position: true } },
                category: { select: { id: true, name: true } },
                level: { select: { id: true, number: true } },
                skill: { select: { id: true, name: true } },
                family: { select: { id: true, name: true } },
                _count: { select: { steps: true, previews: true } },
            },
            orderBy: [{ area: { position: 'asc' } }, { age: 'asc' }, { title: 'asc' }],
        });
        return {
            activities: activities.map((a) => ({
                id: a.id,
                title: a.title,
                description: a.description,
                area: { id: a.area.id, name: a.area.name },
                category: a.category,
                level: a.level,
                age: a.age,
                durationMinutes: a.durationMinutes,
                minimumPlan: a.minimumPlan,
                baseMarks: a.baseMarks,
                masteryTarget: a.masteryTarget,
                skill: a.skill,
                skillStage: a.skillStage,
                group: a.family,
                difficulty: a.difficultyLevel,
                status: a.status,
                counts: a._count,
            })),
        };
    }
    async get(id) {
        const a = await this.prisma.activity.findUnique({
            where: { id },
            include: {
                area: { select: { id: true, name: true } },
                category: { select: { id: true, name: true } },
                level: { select: { id: true, number: true, title: true } },
                skill: { select: { id: true, name: true } },
                family: { select: { id: true, name: true } },
                steps: { orderBy: { position: 'asc' } },
                previews: { orderBy: { position: 'asc' } },
            },
        });
        if (!a || a.withdrawnAt)
            throw new common_1.NotFoundException('Activity not found');
        return {
            activity: {
                id: a.id,
                title: a.title,
                description: a.description,
                materials: a.materials,
                area: a.area,
                category: a.category,
                level: a.level,
                age: a.age,
                durationMinutes: a.durationMinutes,
                minimumPlan: a.minimumPlan,
                baseMarks: a.baseMarks,
                masteryTarget: a.masteryTarget,
                skill: a.skill,
                skillStage: a.skillStage,
                group: a.family,
                difficulty: a.difficultyLevel,
                status: a.status,
                steps: a.steps.map((s) => ({ title: s.title, description: s.description })),
                previews: a.previews.map((p) => ({ imageUrl: p.imageUrl, caption: p.caption })),
                hasChildRecords: await hasChildHistory(this.prisma, a.id),
            },
        };
    }
    fields(dto) {
        return {
            areaId: dto.areaId,
            categoryId: dto.categoryId ?? null,
            levelId: dto.levelId,
            age: dto.age,
            title: dto.title,
            description: dto.description,
            materials: dto.materials ?? null,
            durationMinutes: dto.durationMinutes,
            minimumPlan: dto.minimumPlan,
            baseMarks: dto.baseMarks,
            masteryTarget: dto.masteryTarget,
            skillId: dto.skillId ?? null,
            skillStage: dto.skillStage,
            status: dto.status,
            groupId: dto.groupId ?? null,
            difficulty: dto.groupId ? (dto.difficulty ?? null) : null,
            steps: dto.steps.map((s) => ({ title: s.title, description: s.description })),
            previews: dto.previews.map((p) => ({ imageUrl: p.imageUrl ?? null, caption: p.caption ?? null })),
        };
    }
    async create(admin, dto) {
        this.assertCanManage(admin);
        const payload = this.fields(dto);
        const regionId = await validate(this.prisma, payload);
        return this.drafts.saveOrDraft({ admin, mode: dto.mode, section: SECTION, entityType: exports.ACTIVITY_ENTITY, entityId: null, regionId, payload, label: dto.title });
    }
    async update(admin, id, dto) {
        this.assertCanManage(admin);
        const existing = await this.prisma.activity.findUnique({ where: { id } });
        if (!existing || existing.withdrawnAt)
            throw new common_1.NotFoundException('Activity not found');
        const payload = this.fields(dto);
        if (existing.areaId !== payload.areaId && (await hasChildHistory(this.prisma, id))) {
            throw new common_1.BadRequestException("This activity has child records, so its development area can't change.");
        }
        const regionId = await validate(this.prisma, payload, id);
        return this.drafts.saveOrDraft({ admin, mode: dto.mode, section: SECTION, entityType: exports.ACTIVITY_ENTITY, entityId: id, regionId, payload, label: dto.title });
    }
    async remove(admin, id, dto) {
        this.assertCanManage(admin);
        const existing = await this.prisma.activity.findUnique({ where: { id } });
        if (!existing || existing.withdrawnAt)
            throw new common_1.NotFoundException('Activity not found');
        return this.drafts.saveOrDraft({ admin, mode: dto.mode, section: SECTION, entityType: exports.ACTIVITY_ENTITY, entityId: id, regionId: existing.regionId, payload: { delete: true }, label: `Removed ${existing.title}` });
    }
};
exports.ActivitiesService = ActivitiesService;
exports.ActivitiesService = ActivitiesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        drafts_service_1.DraftsService])
], ActivitiesService);
async function removeActivity(tx, id) {
    if (!(await hasChildHistory(tx, id))) {
        await tx.countryRestriction.deleteMany({ where: { type: 'ACTIVITY', targetId: id } });
        await tx.activity.delete({ where: { id } });
        return;
    }
    await tx.mandatoryActivity.deleteMany({ where: { activityId: id } });
    await tx.activity.update({ where: { id }, data: { withdrawnAt: new Date(), status: 'WITHDRAWN' } });
}
//# sourceMappingURL=activities.service.js.map