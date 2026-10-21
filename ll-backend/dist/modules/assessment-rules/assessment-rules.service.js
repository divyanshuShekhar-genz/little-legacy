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
exports.AssessmentRulesService = exports.RULES_ENTITY = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const drafts_service_1 = require("../drafts/drafts.service");
const region_1 = require("../../common/utils/region");
const assessment_1 = require("../../common/utils/assessment");
const rules_1 = require("../../common/rules");
exports.RULES_ENTITY = 'AssessmentConfig';
const SECTION = 'Assessment rules';
const WEIGHTS = 'Use non-negative weights and at least one positive weight.';
const DEFAULT_ROW = { formula: 'questionnaire + activity', weight: 1, questionWeights: { EASY: 1, MEDIUM: 1, HARD: 1 } };
const ZEROS = Object.fromEntries(rules_1.FORMULA_VARIABLES.map((v) => [v, 0]));
const snapshot = async (tx, regionId) => {
    const region = await tx.learningRegion.findUnique({ where: { id: regionId }, select: { id: true } });
    if (!region)
        return null;
    const latest = await tx.assessmentConfig.findFirst({ where: { regionId }, orderBy: { revision: 'desc' } });
    return { regionId, revision: latest?.revision ?? 0, rules: latest?.rules ?? null };
};
const round2 = (n) => Math.round(n * 100) / 100;
async function validate(db, p) {
    await (0, region_1.assertRegion)(db, p.regionId);
    const areas = await db.developmentArea.findMany({ where: { regionId: p.regionId, removedAt: null }, orderBy: { position: 'asc' } });
    if (!areas.length)
        throw new common_1.BadRequestException('Add a development area first.');
    const sent = p.areas.map((a) => a.areaId);
    if (sent.length !== areas.length || new Set(sent).size !== sent.length || !areas.every((a) => sent.includes(a.id))) {
        throw new common_1.BadRequestException('Include every development area of this category once.');
    }
    if (!p.areas.some((a) => a.weight > 0))
        throw new common_1.BadRequestException(WEIGHTS);
    const sample = (0, rules_1.withActivity)(p.sample);
    for (const row of p.areas) {
        const problem = (0, rules_1.checkFormula)(row.formula, [sample, ZEROS]);
        if (problem)
            throw new common_1.BadRequestException(`${areas.find((a) => a.id === row.areaId).name}: ${problem}`);
    }
    const ages = new Set((await db.ageGroup.findMany({ where: { regionId: p.regionId }, select: { age: true } })).map((g) => g.age));
    const seen = new Set();
    for (const pick of p.mandatory) {
        const key = `${pick.age}:${pick.areaId}`;
        if (seen.has(key))
            throw new common_1.BadRequestException('Each age and development area can appear only once.');
        seen.add(key);
        if (!ages.has(pick.age) || !areas.some((a) => a.id === pick.areaId)) {
            throw new common_1.BadRequestException('Choose mandatory activities from this age and development area.');
        }
        const ids = [...new Set(pick.activityIds)];
        const ok = await db.activity.count({ where: { id: { in: ids }, regionId: p.regionId, areaId: pick.areaId, age: pick.age, withdrawnAt: null } });
        if (ok !== ids.length || ids.length !== pick.activityIds.length) {
            throw new common_1.BadRequestException('Choose mandatory activities from this age and development area.');
        }
    }
    return areas;
}
function buildRules(p, areas) {
    const mandatory = {};
    const requiredCounts = {};
    for (const pick of p.mandatory) {
        if (pick.activityIds.length)
            (mandatory[pick.age] ??= {})[pick.areaId] = pick.activityIds;
        if (pick.requiredCount > 0)
            (requiredCounts[pick.age] ??= {})[pick.areaId] = pick.requiredCount;
    }
    return assessment_1.assessmentRulesSchema.parse({
        areas: areas.map((a) => {
            const row = p.areas.find((r) => r.areaId === a.id);
            return { areaId: a.id, name: a.name, formula: row.formula, weight: row.weight, questionWeights: row.questionWeights };
        }),
        mandatory,
        requiredCounts,
    });
}
let AssessmentRulesService = class AssessmentRulesService {
    constructor(prisma, drafts) {
        this.prisma = prisma;
        this.drafts = drafts;
    }
    onModuleInit() {
        this.drafts.register(exports.RULES_ENTITY, {
            snapshot,
            apply: async (tx, regionId, payload) => {
                if (!regionId || regionId !== payload.regionId)
                    throw new common_1.BadRequestException('Choose a regional learning category.');
                const areas = await validate(tx, payload);
                const latest = await tx.assessmentConfig.findFirst({ where: { regionId }, orderBy: { revision: 'desc' } });
                await tx.assessmentConfig.create({
                    data: { regionId, revision: (latest?.revision ?? 0) + 1, rules: buildRules(payload, areas), createdById: payload.createdById },
                });
                await tx.mandatoryActivity.deleteMany({ where: { regionId } });
                await tx.mandatoryActivity.createMany({
                    data: payload.mandatory.flatMap((m) => [...new Set(m.activityIds)].map((activityId) => ({ regionId, age: m.age, areaId: m.areaId, activityId }))),
                });
                return regionId;
            },
        });
    }
    async get(regionId) {
        await (0, region_1.assertRegion)(this.prisma, regionId);
        const [latest, areas, ageGroups, activities, picks] = await Promise.all([
            this.prisma.assessmentConfig.findFirst({ where: { regionId }, orderBy: { revision: 'desc' } }),
            this.prisma.developmentArea.findMany({ where: { regionId, removedAt: null }, orderBy: { position: 'asc' } }),
            this.prisma.ageGroup.findMany({ where: { regionId }, orderBy: { age: 'asc' } }),
            this.prisma.activity.findMany({
                where: { regionId, withdrawnAt: null },
                select: { id: true, title: true, age: true, areaId: true, baseMarks: true, status: true },
                orderBy: { title: 'asc' },
            }),
            this.prisma.mandatoryActivity.findMany({ where: { regionId } }),
        ]);
        const rules = latest ? assessment_1.assessmentRulesSchema.parse(latest.rules) : null;
        return {
            revision: latest?.revision ?? 0,
            areas: areas.map((a) => {
                const row = rules?.areas.find((r) => r.areaId === a.id) ?? DEFAULT_ROW;
                return { areaId: a.id, name: a.name, formula: row.formula, weight: row.weight, questionWeights: row.questionWeights };
            }),
            ages: ageGroups.map((g) => g.age),
            mandatory: ageGroups.flatMap(({ age }) => areas.map((area) => {
                const candidates = activities.filter((x) => x.age === age && x.areaId === area.id);
                const picked = picks.filter((p) => p.age === age && p.areaId === area.id && candidates.some((c) => c.id === p.activityId));
                return {
                    age,
                    areaId: area.id,
                    activityIds: picked.map((p) => p.activityId),
                    target: (0, rules_1.mandatoryScoreTarget)(picked.map((p) => candidates.find((c) => c.id === p.activityId).baseMarks)),
                    count: picked.length,
                    requiredCount: rules?.requiredCounts[age]?.[area.id] ?? 0,
                    candidates: candidates.map((c) => ({ id: c.id, title: c.title, baseMarks: c.baseMarks, status: c.status })),
                };
            })),
        };
    }
    async preview(dto) {
        await (0, region_1.assertRegion)(this.prisma, dto.regionId);
        const names = new Map((await this.prisma.developmentArea.findMany({ where: { regionId: dto.regionId }, select: { id: true, name: true } })).map((a) => [a.id, a.name]));
        const values = (0, rules_1.withActivity)(dto.sample);
        const results = dto.areas.map((row) => {
            const name = names.get(row.areaId) ?? row.areaId;
            try {
                return { areaId: row.areaId, name, result: (0, rules_1.parseFormula)(row.formula).evaluate(values), weight: row.weight };
            }
            catch (e) {
                if (e instanceof rules_1.FormulaError)
                    throw new common_1.BadRequestException(`${name}: ${e.message}`);
                throw e;
            }
        });
        const percents = (0, rules_1.largestRemainderPercents)(results.map((r) => r.result * r.weight));
        const weighting = (0, rules_1.weightAreas)(results.map((r) => ({ value: r.result, weight: r.weight })));
        return {
            areas: results.map((r, i) => ({
                areaId: r.areaId,
                name: r.name,
                result: round2(r.result),
                weightedValue: round2(r.result * r.weight),
                percent: percents?.[i] ?? null,
            })),
            weightedAverage: weighting ? round2(weighting.weightedAverage) : null,
            message: percents && weighting ? null : 'Not enough assessment data.',
        };
    }
    async save(admin, dto) {
        const payload = {
            regionId: dto.regionId,
            createdById: admin.id,
            areas: dto.areas.map((a) => ({ areaId: a.areaId, formula: a.formula.trim(), weight: a.weight, questionWeights: { EASY: a.questionWeights.EASY, MEDIUM: a.questionWeights.MEDIUM, HARD: a.questionWeights.HARD } })),
            mandatory: dto.mandatory.map((m) => ({ age: m.age, areaId: m.areaId, activityIds: m.activityIds, requiredCount: m.requiredCount })),
            sample: { questionnaire: dto.sample.questionnaire, mandatory: dto.sample.mandatory, regular: dto.sample.regular, mastery: dto.sample.mastery, target: dto.sample.target },
        };
        await validate(this.prisma, payload);
        const region = await this.prisma.learningRegion.findUniqueOrThrow({ where: { id: dto.regionId } });
        return this.drafts.saveOrDraft({
            admin,
            mode: dto.mode,
            section: SECTION,
            entityType: exports.RULES_ENTITY,
            entityId: dto.regionId,
            regionId: dto.regionId,
            payload,
            label: `Assessment rules for ${region.name}`,
        });
    }
};
exports.AssessmentRulesService = AssessmentRulesService;
exports.AssessmentRulesService = AssessmentRulesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        drafts_service_1.DraftsService])
], AssessmentRulesService);
//# sourceMappingURL=assessment-rules.service.js.map