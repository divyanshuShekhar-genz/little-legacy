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
exports.SkillsService = exports.SKILL_ENTITY = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const drafts_service_1 = require("../drafts/drafts.service");
const region_1 = require("../../common/utils/region");
exports.SKILL_ENTITY = 'Skill';
const SECTION = 'Skill Personalisation';
const snapshot = async (tx, id) => {
    const s = await tx.skill.findUnique({ where: { id }, include: { expectations: { orderBy: { age: 'asc' } } } });
    return s && { id: s.id, areaId: s.areaId, name: s.name, expected: s.expectations.map((e) => ({ age: e.age, expectedScore: e.expectedScore })) };
};
async function usage(db, skillId) {
    const [questions, activities, families] = await Promise.all([
        db.question.count({ where: { skillId } }),
        db.activity.count({ where: { skillId, withdrawnAt: null } }),
        db.activityFamily.count({ where: { skillId, archived: false } }),
    ]);
    return { questions, activities, families };
}
async function validate(db, p, id) {
    const area = await (0, region_1.currentArea)(db, p.areaId).catch(() => {
        throw new common_1.BadRequestException('Choose a development area.');
    });
    const taken = await db.skill.findFirst({
        where: { areaId: p.areaId, name: { equals: p.name, mode: 'insensitive' }, ...(id ? { id: { not: id } } : {}) },
    });
    if (taken)
        throw new common_1.ConflictException('Use a unique skill name in this development area.');
    const ages = new Set((await db.ageGroup.findMany({ where: { regionId: area.regionId }, select: { age: true } })).map((g) => g.age));
    const sent = p.expected.map((e) => e.age);
    if (sent.some((a) => !ages.has(a)))
        throw new common_1.BadRequestException("Choose an age group. Add it first if it isn't listed.");
    if (new Set(sent).size !== sent.length)
        throw new common_1.BadRequestException('Set one expected score per age.');
    if (id) {
        const existing = await db.skill.findUnique({ where: { id } });
        if (existing && existing.areaId !== p.areaId) {
            const used = await usage(db, id);
            if (used.questions + used.activities + used.families > 0)
                throw new common_1.BadRequestException('This skill is in use. Keep its area or remove its links first.');
        }
    }
    return area;
}
let SkillsService = class SkillsService {
    constructor(prisma, drafts) {
        this.prisma = prisma;
        this.drafts = drafts;
    }
    onModuleInit() {
        this.drafts.register(exports.SKILL_ENTITY, {
            snapshot,
            apply: async (tx, id, p) => {
                await validate(tx, p, id);
                const skillId = id
                    ? (await tx.skill.update({ where: { id }, data: { areaId: p.areaId, name: p.name } })).id
                    : (await tx.skill.create({ data: { areaId: p.areaId, name: p.name } })).id;
                await tx.skillExpectation.deleteMany({ where: { skillId } });
                await tx.skillExpectation.createMany({ data: p.expected.map((e) => ({ skillId, age: e.age, expectedScore: e.expectedScore })) });
                return skillId;
            },
        });
    }
    async list({ areaId, regionId }) {
        if (areaId)
            await (0, region_1.currentArea)(this.prisma, areaId);
        else if (regionId)
            await (0, region_1.assertRegion)(this.prisma, regionId);
        else
            throw new common_1.BadRequestException('Choose a development area.');
        const skills = await this.prisma.skill.findMany({
            where: areaId ? { areaId } : { area: { regionId: regionId, removedAt: null } },
            include: {
                area: { select: { id: true, name: true, position: true } },
                expectations: { orderBy: { age: 'asc' } },
                _count: { select: { questions: true, activities: { where: { withdrawnAt: null } } } },
            },
            orderBy: [{ area: { position: 'asc' } }, { name: 'asc' }],
        });
        return {
            skills: skills.map((s) => ({
                id: s.id,
                name: s.name,
                area: { id: s.area.id, name: s.area.name },
                expected: s.expectations.map((e) => ({ age: e.age, expectedScore: e.expectedScore })),
                counts: s._count,
            })),
        };
    }
    async create(admin, dto) {
        const payload = { areaId: dto.areaId, name: dto.name, expected: dto.expected.map((e) => ({ age: e.age, expectedScore: e.expectedScore })) };
        const area = await validate(this.prisma, payload, null);
        return this.drafts.saveOrDraft({ admin, mode: dto.mode, section: SECTION, entityType: exports.SKILL_ENTITY, entityId: null, regionId: area.regionId, payload, label: `${area.name} · ${dto.name}` });
    }
    async update(admin, id, dto) {
        const current = await snapshot(this.prisma, id);
        if (!current)
            throw new common_1.NotFoundException('Skill not found');
        const payload = {
            areaId: dto.areaId ?? current.areaId,
            name: dto.name ?? current.name,
            expected: dto.expected ? dto.expected.map((e) => ({ age: e.age, expectedScore: e.expectedScore })) : current.expected,
        };
        const area = await validate(this.prisma, payload, id);
        return this.drafts.saveOrDraft({ admin, mode: dto.mode, section: SECTION, entityType: exports.SKILL_ENTITY, entityId: id, regionId: area.regionId, payload, label: `${area.name} · ${payload.name}` });
    }
};
exports.SkillsService = SkillsService;
exports.SkillsService = SkillsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        drafts_service_1.DraftsService])
], SkillsService);
//# sourceMappingURL=skills.service.js.map