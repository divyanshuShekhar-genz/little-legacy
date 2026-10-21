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
exports.RegionsService = exports.REGION_ENTITY = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const drafts_service_1 = require("../drafts/drafts.service");
const rules_1 = require("../../common/rules");
const assessment_1 = require("../../common/utils/assessment");
exports.REGION_ENTITY = 'LearningRegion';
const SECTION = 'Regional learning categories';
const snapshot = async (tx, id) => {
    const r = await tx.learningRegion.findUnique({ where: { id }, include: { countries: { select: { code: true }, orderBy: { code: 'asc' } } } });
    return r && { id: r.id, name: r.name, isDefault: r.isDefault, active: r.active, countryCodes: r.countries.map((c) => c.code) };
};
const SKELETON_AGES = [3, 4, 5];
const SKELETON_BASES = [
    { position: 1, name: 'Base 1', fromPercent: 0, startDifficulty: 1 },
    { position: 2, name: 'Base 2', fromPercent: 34, startDifficulty: 2 },
    { position: 3, name: 'Base 3', fromPercent: 67, startDifficulty: 3 },
];
async function validate(db, id, p) {
    const sameName = await db.learningRegion.findFirst({
        where: { name: { equals: p.name, mode: 'insensitive' }, ...(id ? { id: { not: id } } : {}) },
    });
    if (sameName)
        throw new common_1.ConflictException('That category name already exists.');
    const existing = await db.country.findMany({ where: { code: { in: p.countryCodes } }, select: { code: true, learningRegionId: true } });
    const missing = p.countryCodes.filter((c) => !existing.some((e) => e.code === c));
    if (missing.length)
        throw new common_1.BadRequestException(`Add ${missing.join(', ')} as a country first.`);
    if (existing.some((c) => c.learningRegionId && c.learningRegionId !== id)) {
        throw new common_1.ConflictException('A country already belongs to another category. Remove it there first.');
    }
    if (p.isDefault && !p.active)
        throw new common_1.BadRequestException('The default category must stay active.');
    if (id && !p.isDefault) {
        const current = await db.learningRegion.findUnique({ where: { id }, select: { isDefault: true } });
        if (current?.isDefault)
            throw new common_1.BadRequestException('Make another category the default first.');
    }
}
let RegionsService = class RegionsService {
    constructor(prisma, drafts) {
        this.prisma = prisma;
        this.drafts = drafts;
    }
    onModuleInit() {
        this.drafts.register(exports.REGION_ENTITY, {
            snapshot,
            apply: async (tx, id, payload) => {
                if (payload.delete) {
                    if (!id)
                        throw new common_1.BadRequestException('A category id is required.');
                    await assertRemovable(tx, id);
                    await tx.country.updateMany({ where: { learningRegionId: id }, data: { learningRegionId: null } });
                    await tx.setting.deleteMany({ where: { key: `checklist.visibleLimit:${id}` } });
                    await tx.learningRegion.delete({ where: { id } });
                    return id;
                }
                await validate(tx, id, payload);
                if (payload.isDefault)
                    await tx.learningRegion.updateMany({ where: { isDefault: true, ...(id ? { id: { not: id } } : {}) }, data: { isDefault: false } });
                const data = { name: payload.name, isDefault: payload.isDefault, active: payload.active };
                const regionId = id ? (await tx.learningRegion.update({ where: { id }, data })).id : await createWithSkeleton(tx, data);
                await tx.country.updateMany({ where: { learningRegionId: regionId, code: { notIn: payload.countryCodes } }, data: { learningRegionId: null } });
                await tx.country.updateMany({ where: { code: { in: payload.countryCodes } }, data: { learningRegionId: regionId } });
                return regionId;
            },
        });
    }
    async list() {
        const regions = await this.prisma.learningRegion.findMany({
            include: {
                countries: { select: { code: true, name: true }, orderBy: { code: 'asc' } },
                _count: { select: { areas: { where: { removedAt: null } }, activities: { where: { withdrawnAt: null } }, children: true } },
            },
            orderBy: { name: 'asc' },
        });
        return {
            regions: regions.map(({ _count, ...r }) => ({
                id: r.id,
                name: r.name,
                isDefault: r.isDefault,
                active: r.active,
                countries: r.countries,
                counts: _count,
            })),
        };
    }
    codes(input) {
        const { codes, invalid } = (0, rules_1.parseCountryCodes)(input);
        if (invalid.length)
            throw new common_1.BadRequestException('Use two-letter country codes.');
        return codes;
    }
    async create(admin, dto) {
        const payload = { name: dto.name, countryCodes: this.codes(dto.countryCodes), isDefault: false, active: dto.active };
        await validate(this.prisma, null, payload);
        return this.drafts.saveOrDraft({ admin, mode: dto.mode, section: SECTION, entityType: exports.REGION_ENTITY, entityId: null, payload, label: payload.name });
    }
    async update(admin, id, dto) {
        const current = await snapshot(this.prisma, id);
        if (!current)
            throw new common_1.NotFoundException('Category not found');
        const payload = {
            name: dto.name ?? current.name,
            countryCodes: dto.countryCodes ? this.codes(dto.countryCodes) : current.countryCodes,
            isDefault: dto.isDefault || current.isDefault,
            active: dto.active ?? current.active,
        };
        await validate(this.prisma, id, payload);
        return this.drafts.saveOrDraft({ admin, mode: dto.mode, section: SECTION, entityType: exports.REGION_ENTITY, entityId: id, regionId: id, payload, label: payload.name });
    }
    async remove(admin, id, dto) {
        const current = await snapshot(this.prisma, id);
        if (!current)
            throw new common_1.NotFoundException('Category not found');
        await assertRemovable(this.prisma, id);
        return this.drafts.saveOrDraft({ admin, mode: dto.mode, section: SECTION, entityType: exports.REGION_ENTITY, entityId: id, regionId: id, payload: { delete: true }, label: `Removed ${current.name}` });
    }
};
exports.RegionsService = RegionsService;
exports.RegionsService = RegionsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        drafts_service_1.DraftsService])
], RegionsService);
async function assertRemovable(db, id) {
    const region = await db.learningRegion.findUnique({ where: { id }, select: { isDefault: true, _count: { select: { children: true } } } });
    if (!region)
        throw new common_1.NotFoundException('Category not found');
    if (region.isDefault)
        throw new common_1.BadRequestException("The default category can't be removed.");
    if (region._count.children > 0)
        throw new common_1.BadRequestException("Children already use this category, so it can't be removed. Deactivate it instead.");
}
async function createWithSkeleton(tx, data) {
    const region = await tx.learningRegion.create({ data });
    await tx.ageGroup.createMany({ data: SKELETON_AGES.map((age) => ({ regionId: region.id, age })) });
    await tx.developmentBase.createMany({ data: SKELETON_BASES.map((b) => ({ regionId: region.id, ...b })) });
    await tx.progressionSettings.create({ data: { regionId: region.id } });
    await tx.assessmentConfig.create({ data: { regionId: region.id, revision: 1, rules: (0, assessment_1.defaultRules)([]) } });
    return region.id;
}
//# sourceMappingURL=regions.service.js.map