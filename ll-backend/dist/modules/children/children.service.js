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
exports.ChildrenService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const rules_1 = require("../../common/rules");
const child_levels_1 = require("../../common/utils/child-levels");
const assessment_1 = require("../../common/utils/assessment");
const childInclude = {
    parent: { select: { name: true } },
    questionnaires: { where: { isCurrent: true }, orderBy: { submittedAt: 'desc' }, take: 1, include: { config: true } },
    attempts: { include: { activity: { select: { title: true, areaId: true, masteryTarget: true } } }, orderBy: { createdAt: 'asc' } },
};
let ChildrenService = class ChildrenService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list({ search, area }) {
        const contains = search ? { contains: search, mode: 'insensitive' } : undefined;
        const children = await this.prisma.child.findMany({
            where: contains ? { OR: [{ name: contains }, { parent: { name: contains } }] } : undefined,
            include: childInclude,
            orderBy: { createdAt: 'asc' },
        });
        let areaIds = null;
        if (area) {
            const areas = await this.prisma.developmentArea.findMany({ where: { name: area }, select: { id: true } });
            areaIds = new Set(areas.map((a) => a.id));
        }
        const now = new Date();
        const rows = [];
        for (const c of children) {
            const submission = c.questionnaires[0];
            const answers = submission ? assessment_1.questionnaireAnswersSchema.parse(submission.answers) : [];
            if (areaIds) {
                const ids = areaIds;
                const inArea = answers.some((a) => ids.has(a.areaId)) || c.attempts.some((t) => ids.has(t.activity.areaId));
                if (!inArea)
                    continue;
            }
            const hasRecords = Boolean(submission) || c.attempts.length > 0;
            rows.push({
                id: c.id,
                name: c.name,
                parentName: c.parent.name,
                age: c.dob ? (0, rules_1.ageOn)(c.dob, now).years : null,
                ageMonths: c.dob ? (0, rules_1.ageOn)(c.dob, now).months : null,
                dobEstimated: c.dobEstimated,
                assessmentStartedAt: submission?.submittedAt.toISOString() ?? null,
                questionnaireMarks: submission ? answers.reduce((s, a) => s + a.marks, 0) : null,
                activityMarks: hasRecords ? c.attempts.reduce((s, t) => s + Number(t.points), 0) : null,
                ruleVersion: submission?.config.revision ?? null,
            });
        }
        const areaNames = await this.prisma.developmentArea.findMany({ where: { removedAt: null }, distinct: ['name'], select: { name: true }, orderBy: { position: 'asc' } });
        return { rows, areas: areaNames.map((a) => a.name) };
    }
    async learningRecord(childId) {
        const c = await this.prisma.child.findUnique({ where: { id: childId }, include: childInclude });
        if (!c)
            throw new common_1.NotFoundException('Child not found');
        const submission = c.questionnaires[0];
        const child = { id: c.id, name: c.name, parentName: c.parent.name };
        if (!submission && c.attempts.length === 0) {
            return { child, hasRecords: false, ruleVersion: null, areas: [], outcomes: [], unsuccessful: [] };
        }
        const config = submission?.config ??
            (await this.prisma.assessmentConfig.findFirst({ where: { regionId: c.regionId }, orderBy: { revision: 'desc' } }));
        const rules = config ? assessment_1.assessmentRulesSchema.parse(config.rules) : { areas: [] };
        const areaScores = submission ? assessment_1.areaScoresSchema.parse(submission.areaScores) : {};
        const areas = await Promise.all(rules.areas.map(async (a) => {
            const attempts = c.attempts.filter((t) => t.activity.areaId === a.areaId);
            const levels = (await (0, child_levels_1.childAreaLevels)(this.prisma, a.areaId, [c.id])).get(c.id);
            return {
                name: a.name,
                questionnaire: areaScores[a.areaId] ?? 0,
                activity: attempts.reduce((s, t) => s + Number(t.points), 0),
                level: levels?.level ?? 0,
            };
        }));
        return {
            child,
            hasRecords: true,
            ruleVersion: submission?.config.revision ?? null,
            areas,
            outcomes: c.attempts
                .filter((t) => t.outcome !== 'NOT_COMPLETED')
                .map((t) => ({ activity: t.activity.title, outcome: t.outcome, score: Number(t.points), at: t.createdAt.toISOString() })),
            unsuccessful: c.attempts
                .filter((t) => t.outcome === 'NOT_COMPLETED')
                .map((t) => ({ activity: t.activity.title, at: t.createdAt.toISOString() })),
        };
    }
};
exports.ChildrenService = ChildrenService;
exports.ChildrenService = ChildrenService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ChildrenService);
//# sourceMappingURL=children.service.js.map