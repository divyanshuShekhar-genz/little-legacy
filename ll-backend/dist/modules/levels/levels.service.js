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
exports.LevelsService = exports.LEVEL_SECTIONS = exports.LEVEL_ENTITY = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const drafts_service_1 = require("../drafts/drafts.service");
const region_1 = require("../../common/utils/region");
const child_levels_1 = require("../../common/utils/child-levels");
const session_admin_1 = require("../../common/types/session-admin");
const level_dto_1 = require("./dto/level.dto");
exports.LEVEL_ENTITY = 'Level';
const SECTION = 'Levels';
exports.LEVEL_SECTIONS = ['developmentalMilestones', 'questionnairesLevels'];
const LADDER = 'Choose a category in this development area.';
const snapshot = (tx, id) => tx.level.findUnique({
    where: { id },
    select: { id: true, areaId: true, categoryId: true, number: true, title: true, icon: true, iconColor: true, requiredScore: true, requiredMastered: true },
});
async function assertLadder(db, areaId, categoryId) {
    const area = await (0, region_1.currentArea)(db, areaId);
    if (categoryId) {
        const category = await (0, region_1.currentCategory)(db, categoryId).catch(() => null);
        if (!category || category.areaId !== areaId)
            throw new common_1.BadRequestException(LADDER);
    }
    else if (await db.activityCategory.count({ where: { areaId, removedAt: null } })) {
        throw new common_1.BadRequestException(LADDER);
    }
    return area;
}
async function assertNumberFree(db, p, excludeId) {
    const taken = await db.level.findFirst({
        where: { areaId: p.areaId, categoryId: p.categoryId, number: p.number, ...(excludeId ? { id: { not: excludeId } } : {}) },
    });
    if (taken)
        throw new common_1.ConflictException('This level number already exists.');
}
const liveActivities = (db, levelId) => db.activity.count({ where: { levelId, withdrawnAt: null } });
let LevelsService = class LevelsService {
    constructor(prisma, drafts) {
        this.prisma = prisma;
        this.drafts = drafts;
    }
    onModuleInit() {
        this.drafts.register(exports.LEVEL_ENTITY, {
            snapshot,
            apply: async (tx, id, payload) => {
                if (payload.delete) {
                    const level = id ? await tx.level.findUnique({ where: { id } }) : null;
                    if (!level)
                        throw new common_1.NotFoundException('Level not found');
                    if (await liveActivities(tx, level.id))
                        throw new common_1.BadRequestException("Move or remove this level's activities first.");
                    await (0, child_levels_1.freezeEarnedLevels)(tx, level.areaId);
                    await tx.level.delete({ where: { id: level.id } });
                    return level.id;
                }
                await assertLadder(tx, payload.areaId, payload.categoryId);
                await assertNumberFree(tx, payload, id);
                const data = {
                    number: payload.number,
                    title: payload.title,
                    icon: payload.icon,
                    iconColor: payload.iconColor,
                    requiredScore: payload.requiredScore,
                    requiredMastered: payload.requiredMastered,
                };
                if (id) {
                    await (0, child_levels_1.freezeEarnedLevels)(tx, payload.areaId);
                    await tx.level.update({ where: { id }, data });
                    return id;
                }
                return (await tx.level.create({ data: { ...data, areaId: payload.areaId, categoryId: payload.categoryId } })).id;
            },
        });
    }
    assertCanManage(admin) {
        if (!(0, session_admin_1.hasAnySection)(admin, exports.LEVEL_SECTIONS))
            throw new common_1.ForbiddenException('You do not have access to this section');
    }
    async list({ areaId, categoryId = null, age }) {
        await assertLadder(this.prisma, areaId, categoryId);
        const levels = await this.prisma.level.findMany({
            where: { areaId, categoryId },
            include: { _count: { select: { activities: { where: { withdrawnAt: null, ...(age !== undefined ? { age } : {}) } } } } },
            orderBy: { number: 'asc' },
        });
        return {
            levels: levels.map(({ _count, ...l }) => ({
                id: l.id,
                number: l.number,
                title: l.title,
                icon: l.icon,
                iconColor: l.iconColor ?? level_dto_1.DEFAULT_ICON_COLOUR,
                requiredScore: l.requiredScore,
                requiredMastered: l.requiredMastered,
                activityCount: _count.activities,
            })),
            nextNumber: Math.max(0, ...levels.map((l) => l.number)) + 1,
        };
    }
    async current(id) {
        const level = await this.prisma.level.findUnique({ where: { id }, include: { area: true, category: true } });
        if (!level || level.area.removedAt || level.category?.removedAt)
            throw new common_1.NotFoundException('Level not found');
        return level;
    }
    async create(admin, dto) {
        this.assertCanManage(admin);
        const categoryId = dto.categoryId ?? null;
        const area = await assertLadder(this.prisma, dto.areaId, categoryId);
        const payload = {
            areaId: area.id,
            categoryId,
            number: dto.number,
            title: dto.title ?? null,
            icon: dto.icon ?? null,
            iconColor: dto.iconColor ?? level_dto_1.DEFAULT_ICON_COLOUR,
            requiredScore: dto.requiredScore,
            requiredMastered: dto.requiredMastered,
        };
        await assertNumberFree(this.prisma, payload, null);
        return this.drafts.saveOrDraft({ admin, mode: dto.mode, section: SECTION, entityType: exports.LEVEL_ENTITY, entityId: null, regionId: area.regionId, payload, label: `${area.name} · Level ${dto.number}` });
    }
    async update(admin, id, dto) {
        this.assertCanManage(admin);
        const level = await this.current(id);
        const payload = {
            areaId: level.areaId,
            categoryId: level.categoryId,
            number: dto.number ?? level.number,
            title: dto.title !== undefined ? dto.title : level.title,
            icon: dto.icon !== undefined ? dto.icon : level.icon,
            iconColor: dto.iconColor ?? level.iconColor ?? level_dto_1.DEFAULT_ICON_COLOUR,
            requiredScore: dto.requiredScore ?? level.requiredScore,
            requiredMastered: dto.requiredMastered ?? level.requiredMastered,
        };
        await assertNumberFree(this.prisma, payload, id);
        return this.drafts.saveOrDraft({ admin, mode: dto.mode, section: SECTION, entityType: exports.LEVEL_ENTITY, entityId: id, regionId: level.area.regionId, payload, label: `${level.area.name} · Level ${payload.number}` });
    }
    async remove(admin, id, dto) {
        this.assertCanManage(admin);
        const level = await this.current(id);
        if (await liveActivities(this.prisma, id))
            throw new common_1.BadRequestException("Move or remove this level's activities first.");
        return this.drafts.saveOrDraft({ admin, mode: dto.mode, section: SECTION, entityType: exports.LEVEL_ENTITY, entityId: id, regionId: level.area.regionId, payload: { delete: true }, label: `Removed ${level.area.name} · Level ${level.number}` });
    }
};
exports.LevelsService = LevelsService;
exports.LevelsService = LevelsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        drafts_service_1.DraftsService])
], LevelsService);
//# sourceMappingURL=levels.service.js.map