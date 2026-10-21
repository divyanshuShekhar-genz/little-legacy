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
exports.AreasService = exports.AREA_ENTITY = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const drafts_service_1 = require("../drafts/drafts.service");
const region_1 = require("../../common/utils/region");
exports.AREA_ENTITY = 'DevelopmentArea';
const SECTION = 'Developmental Milestones';
const snapshot = (tx, id) => tx.developmentArea.findUnique({ where: { id }, select: { id: true, regionId: true, name: true, description: true, position: true, removedAt: true } });
async function assertNameFree(db, regionId, name, excludeId) {
    const taken = await db.developmentArea.findFirst({
        where: { regionId, removedAt: null, name: { equals: name, mode: 'insensitive' }, ...(excludeId ? { id: { not: excludeId } } : {}) },
    });
    if (taken)
        throw new common_1.ConflictException('That development area already exists in this category.');
}
async function hasChildHistory(db, areaId) {
    const counts = await Promise.all([
        db.activityAttempt.count({ where: { activity: { areaId } } }),
        db.weeklyAssignment.count({ where: { activity: { areaId } } }),
        db.childFamilyStage.count({ where: { family: { areaId } } }),
        db.childAreaLevel.count({ where: { areaId } }),
    ]);
    return counts.some((n) => n > 0);
}
let AreasService = class AreasService {
    constructor(prisma, drafts) {
        this.prisma = prisma;
        this.drafts = drafts;
    }
    onModuleInit() {
        this.drafts.register(exports.AREA_ENTITY, {
            snapshot,
            apply: async (tx, id, payload) => {
                if (payload.delete) {
                    const area = id ? await tx.developmentArea.findUnique({ where: { id } }) : null;
                    if (!area || area.removedAt)
                        throw new common_1.NotFoundException('Development area not found');
                    await removeArea(tx, area.id);
                    return area.id;
                }
                await (0, region_1.assertRegion)(tx, payload.regionId);
                await assertNameFree(tx, payload.regionId, payload.name, id);
                if (id) {
                    await tx.developmentArea.update({ where: { id }, data: { name: payload.name, description: payload.description } });
                    return id;
                }
                const last = await tx.developmentArea.aggregate({ where: { regionId: payload.regionId }, _max: { position: true } });
                const created = await tx.developmentArea.create({
                    data: { regionId: payload.regionId, name: payload.name, description: payload.description, position: (last._max.position ?? -1) + 1 },
                });
                return created.id;
            },
        });
    }
    async list(regionId) {
        await (0, region_1.assertRegion)(this.prisma, regionId);
        const areas = await this.prisma.developmentArea.findMany({
            where: { regionId, removedAt: null },
            include: {
                _count: {
                    select: {
                        questions: true,
                        categories: { where: { removedAt: null } },
                        levels: { where: { OR: [{ categoryId: null }, { category: { removedAt: null } }] } },
                        activities: { where: { withdrawnAt: null } },
                    },
                },
            },
            orderBy: { position: 'asc' },
        });
        return {
            areas: areas.map(({ _count, ...a }) => ({
                id: a.id,
                name: a.name,
                description: a.description,
                position: a.position,
                counts: _count,
            })),
        };
    }
    async current(id) {
        const area = await this.prisma.developmentArea.findUnique({ where: { id } });
        if (!area || area.removedAt)
            throw new common_1.NotFoundException('Development area not found');
        return area;
    }
    async create(admin, dto) {
        await (0, region_1.assertRegion)(this.prisma, dto.regionId);
        await assertNameFree(this.prisma, dto.regionId, dto.name, null);
        const payload = { regionId: dto.regionId, name: dto.name, description: dto.description };
        return this.drafts.saveOrDraft({ admin, mode: dto.mode, section: SECTION, entityType: exports.AREA_ENTITY, entityId: null, regionId: dto.regionId, payload, label: dto.name });
    }
    async update(admin, id, dto) {
        const area = await this.current(id);
        const payload = {
            regionId: area.regionId,
            name: dto.name ?? area.name,
            description: dto.description !== undefined ? dto.description : area.description,
        };
        await assertNameFree(this.prisma, area.regionId, payload.name, id);
        return this.drafts.saveOrDraft({ admin, mode: dto.mode, section: SECTION, entityType: exports.AREA_ENTITY, entityId: id, regionId: area.regionId, payload, label: payload.name });
    }
    async remove(admin, id, dto) {
        const area = await this.current(id);
        return this.drafts.saveOrDraft({ admin, mode: dto.mode, section: SECTION, entityType: exports.AREA_ENTITY, entityId: id, regionId: area.regionId, payload: { delete: true }, label: `Removed ${area.name}` });
    }
};
exports.AreasService = AreasService;
exports.AreasService = AreasService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        drafts_service_1.DraftsService])
], AreasService);
async function removeArea(tx, areaId) {
    if (!(await hasChildHistory(tx, areaId))) {
        await tx.activity.deleteMany({ where: { areaId } });
        await tx.developmentArea.delete({ where: { id: areaId } });
        return;
    }
    const now = new Date();
    await tx.activity.updateMany({ where: { areaId, withdrawnAt: null }, data: { withdrawnAt: now, status: 'WITHDRAWN' } });
    await tx.mandatoryActivity.deleteMany({ where: { areaId } });
    await tx.question.deleteMany({ where: { areaId } });
    await tx.skill.deleteMany({ where: { areaId } });
    await tx.activityFamily.updateMany({ where: { areaId }, data: { archived: true } });
    await tx.developmentArea.update({ where: { id: areaId }, data: { removedAt: now } });
}
//# sourceMappingURL=areas.service.js.map