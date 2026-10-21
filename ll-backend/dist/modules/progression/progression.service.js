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
exports.ProgressionService = exports.PROGRESSION_ENTITY = void 0;
exports.readSettings = readSettings;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const drafts_service_1 = require("../drafts/drafts.service");
const region_1 = require("../../common/utils/region");
const rules_1 = require("../../common/rules");
const groups_query_1 = require("../activity-groups/groups.query");
const progression_dto_1 = require("./dto/progression.dto");
exports.PROGRESSION_ENTITY = 'ProgressionSettings';
const SECTION = 'Activity Progression';
const DEFAULT_BASES = [
    { name: 'Base 1', from: 0, start: 1 },
    { name: 'Base 2', from: 34, start: 2 },
    { name: 'Base 3', from: 67, start: 3 },
];
async function readSettings(db, regionId) {
    const [s, bases] = await Promise.all([
        db.progressionSettings.findUnique({ where: { regionId } }),
        db.developmentBase.findMany({ where: { regionId }, orderBy: { position: 'asc' } }),
    ]);
    return {
        bases: bases.length === 3 ? bases.map((b) => ({ name: `Base ${b.position}`, from: b.fromPercent, start: b.startDifficulty })) : DEFAULT_BASES,
        weekly: s?.weeklyLimit ?? 20,
        maxVisible: s?.maxVisible ?? null,
        pendingEnabled: s?.pendingEnabled ?? true,
        pendingLimit: s?.pendingLimit ?? 10,
        pendingDays: s?.pendingExpiryDays ?? 28,
        pendingCounts: s?.pendingCountsTowardLimit ?? false,
        recent: s?.recentCount ?? 5,
        continueCount: s?.continueCount ?? 4,
        reinforcement: (s?.reinforcement ?? 'same'),
        resetDay: s?.resetDay ?? 'anniversary',
        overrides: (Array.isArray(s?.overrides) ? s.overrides : []),
    };
}
async function validate(db, p) {
    await (0, region_1.assertRegion)(db, p.regionId);
    const names = p.bases.map((b) => b.name);
    if (names.join() !== 'Base 1,Base 2,Base 3')
        throw new common_1.BadRequestException(progression_dto_1.BASES);
    if (p.bases[0].from !== 0 || p.bases.some((b, i) => i > 0 && b.from <= p.bases[i - 1].from))
        throw new common_1.BadRequestException(progression_dto_1.BASES);
    const [ages, areas] = await Promise.all([
        db.ageGroup.findMany({ where: { regionId: p.regionId }, select: { age: true } }),
        db.developmentArea.findMany({ where: { regionId: p.regionId, removedAt: null }, select: { id: true } }),
    ]);
    const seen = new Set();
    for (const o of p.overrides) {
        const ok = (o.age === 'All' || ages.some((a) => String(a.age) === o.age)) &&
            (o.base === 'All' || names.includes(o.base)) &&
            (o.area === 'All' || areas.some((a) => a.id === o.area)) &&
            (o.plan === 'All' || rules_1.PLAN_TIERS.includes(o.plan));
        if (!ok)
            throw new common_1.BadRequestException('Choose an age, Base, area and plan from this category.');
        const key = [o.age, o.base, o.area, o.plan].join('|');
        if (seen.has(key))
            throw new common_1.BadRequestException('This combination already exists. Edit its row.');
        seen.add(key);
    }
}
let ProgressionService = class ProgressionService {
    constructor(prisma, drafts, audit) {
        this.prisma = prisma;
        this.drafts = drafts;
        this.audit = audit;
    }
    onModuleInit() {
        this.drafts.register(exports.PROGRESSION_ENTITY, {
            snapshot: async (tx, regionId) => {
                const region = await tx.learningRegion.findUnique({ where: { id: regionId }, select: { id: true } });
                return region ? { regionId, ...(await readSettings(tx, regionId)) } : null;
            },
            apply: async (tx, regionId, p) => {
                if (!regionId || regionId !== p.regionId)
                    throw new common_1.BadRequestException('Choose a regional learning category.');
                await validate(tx, p);
                const data = {
                    weeklyLimit: p.weekly,
                    maxVisible: p.maxVisible,
                    pendingEnabled: p.pendingEnabled,
                    pendingLimit: p.pendingLimit,
                    pendingExpiryDays: p.pendingDays,
                    pendingCountsTowardLimit: p.pendingCounts,
                    recentCount: p.recent,
                    continueCount: p.continueCount,
                    reinforcement: p.reinforcement,
                    resetDay: p.resetDay,
                    overrides: p.overrides.map((o) => ({ ...o })),
                };
                await tx.progressionSettings.upsert({ where: { regionId }, update: data, create: { regionId, ...data } });
                for (const [i, b] of p.bases.entries()) {
                    const position = i + 1;
                    await tx.developmentBase.upsert({
                        where: { regionId_position: { regionId, position } },
                        update: { name: b.name, fromPercent: b.from, startDifficulty: b.start },
                        create: { regionId, position, name: b.name, fromPercent: b.from, startDifficulty: b.start },
                    });
                }
                return regionId;
            },
        });
    }
    async get(regionId) {
        await (0, region_1.assertRegion)(this.prisma, regionId);
        return readSettings(this.prisma, regionId);
    }
    async save(admin, regionId, dto) {
        const payload = {
            regionId,
            bases: dto.bases.map((b) => ({ name: b.name, from: b.from, start: b.start })),
            weekly: dto.weekly,
            maxVisible: dto.maxVisible ?? null,
            pendingEnabled: dto.pendingEnabled,
            pendingLimit: dto.pendingLimit,
            pendingDays: dto.pendingDays,
            pendingCounts: dto.pendingCounts,
            recent: dto.recent,
            continueCount: dto.continueCount,
            reinforcement: dto.reinforcement,
            resetDay: dto.resetDay,
            overrides: dto.overrides.map((o) => ({ age: o.age, base: o.base, area: o.area, plan: o.plan, limit: o.limit, start: o.start })),
        };
        await validate(this.prisma, payload);
        const region = await this.prisma.learningRegion.findUniqueOrThrow({ where: { id: regionId } });
        return this.drafts.saveOrDraft({ admin, mode: dto.mode, section: SECTION, entityType: exports.PROGRESSION_ENTITY, entityId: regionId, regionId, payload, label: `Progression settings for ${region.name}` });
    }
    async preview(regionId, dto) {
        await (0, region_1.assertRegion)(this.prisma, regionId);
        if (!(await this.prisma.ageGroup.findUnique({ where: { regionId_age: { regionId, age: dto.age } } }))) {
            throw new common_1.BadRequestException("Choose an age group. Add it first if it isn't listed.");
        }
        if (dto.country && !(await this.prisma.country.findUnique({ where: { code: dto.country } })))
            throw new common_1.BadRequestException('Choose a country.');
        const skillIds = Object.keys(dto.skills);
        const known = await this.prisma.skill.count({ where: { id: { in: skillIds }, area: { regionId } } });
        if (known !== skillIds.length)
            throw new common_1.BadRequestException('Choose skills from this category.');
        if (Object.values(dto.skills).some((v) => v !== null && (typeof v !== 'number' || v < 0 || v > 100)))
            throw new common_1.BadRequestException('Enter skill scores from 0 to 100.');
        const [settings, families, rules] = await Promise.all([
            readSettings(this.prisma, regionId),
            this.prisma.activityFamily.findMany({
                where: { regionId, archived: false, area: { removedAt: null } },
                include: {
                    skill: { select: { name: true } },
                    activities: { where: { withdrawnAt: null }, include: { level: { select: { number: true } } }, orderBy: { difficultyLevel: 'asc' } },
                },
            }),
            this.prisma.countryRestriction.findMany(),
        ]);
        const countryRules = rules.map((r) => ({ ...r, type: r.type }));
        const groups = families.map((f) => ({
            id: f.id,
            name: f.name,
            areaId: f.areaId,
            age: f.age,
            skillId: f.skillId,
            skillName: f.skill?.name ?? null,
            benchmark: f.benchmark,
            mandatory: f.mandatory,
            bases: f.baseEligibility,
            difficulties: f.activities
                .filter((a) => a.difficultyLevel !== null)
                .map((a) => ({
                activityId: a.id,
                title: a.title,
                difficulty: a.difficultyLevel,
                masteryTarget: a.masteryTarget,
                baseMarks: a.baseMarks,
                areaLevel: a.level?.number ?? null,
                minimumPlan: a.minimumPlan,
                published: a.status === 'PUBLISHED',
                blockedInCountry: (0, rules_1.countryCheck)(countryRules, dto.country ?? null, { type: 'ACTIVITY', targetId: a.id }).status !== 'ALLOWED',
            })),
        }));
        const today = new Date();
        try {
            return (0, rules_1.simulateWeek)({
                settings: { ...settings, bases: settings.bases.map((b) => ({ from: b.from, start: b.start })) },
                groups,
                child: { age: dto.age, plan: dto.plan, questionnaireDone: dto.questionnaire === 'COMPLETED', score: dto.score, level: dto.level, skills: dto.skills },
                week: dto.week,
                outcomes: dto.outcomes.map((o) => ({ assignmentId: o.assignmentId, outcome: o.outcome })),
                cycleStart: new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())),
            });
        }
        catch (e) {
            if (e instanceof rules_1.EngineError)
                throw new common_1.BadRequestException(e.message);
            throw e;
        }
    }
    async export(admin, regionId) {
        await (0, region_1.assertRegion)(this.prisma, regionId);
        const [settings, activities, areas, countries] = await Promise.all([
            readSettings(this.prisma, regionId),
            (0, groups_query_1.listGroups)(this.prisma, regionId),
            this.prisma.developmentArea.findMany({ where: { regionId, removedAt: null }, select: { id: true, name: true }, orderBy: { position: 'asc' } }),
            this.prisma.country.findMany({ where: { learningRegionId: regionId }, select: { code: true, name: true }, orderBy: { name: 'asc' } }),
        ]);
        await this.audit.write(admin, { action: 'Exported activity progression settings', section: SECTION });
        return { type: 'little-legacy-activity-progression', schemaVersion: 1, regionId, settings, activities, areas, countries };
    }
};
exports.ProgressionService = ProgressionService;
exports.ProgressionService = ProgressionService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        drafts_service_1.DraftsService,
        audit_service_1.AuditService])
], ProgressionService);
//# sourceMappingURL=progression.service.js.map