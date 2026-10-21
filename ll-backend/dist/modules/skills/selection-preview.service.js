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
exports.SelectionPreviewService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const region_1 = require("../../common/utils/region");
const child_levels_1 = require("../../common/utils/child-levels");
const assessment_1 = require("../../common/utils/assessment");
const rules_1 = require("../../common/rules");
const WEEK_MS = 7 * 24 * 3_600_000;
let SelectionPreviewService = class SelectionPreviewService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async preview(dto, now = new Date()) {
        const area = await (0, region_1.currentArea)(this.prisma, dto.areaId).catch(() => {
            throw new common_1.BadRequestException('Choose a development area.');
        });
        const child = await this.prisma.child.findUnique({
            where: { id: dto.childId },
            include: {
                parent: { select: { countryCode: true } },
                subscriptions: { orderBy: { startsAt: 'desc' } },
                questionnaires: { where: { isCurrent: true }, orderBy: { submittedAt: 'desc' }, take: 1 },
            },
        });
        if (!child)
            throw new common_1.NotFoundException('Child not found');
        if (child.regionId !== area.regionId)
            throw new common_1.BadRequestException("Choose a development area from the child's regional learning category.");
        if (!child.dob)
            throw new common_1.BadRequestException('This child has no date of birth recorded.');
        const years = (0, rules_1.completedYears)(child.dob, now);
        const ages = (await this.prisma.ageGroup.findMany({ where: { regionId: area.regionId }, select: { age: true } })).map((g) => g.age);
        const age = (0, rules_1.contentAge)(years, ages);
        if (age === null)
            throw new common_1.BadRequestException(`There is no age group for ${years}-year-olds in this category: a content gap.`);
        const current = child.subscriptions.find((s) => s.startsAt <= now && (!s.endsAt || s.endsAt > now));
        const plan = dto.plan ?? current?.plan ?? 'FREE';
        const level = Math.max(1, (await (0, child_levels_1.childAreaLevels)(this.prisma, area.id, [child.id])).get(child.id)?.level ?? 0);
        const weekStart = child.cycleStartedAt
            ? new Date(child.cycleStartedAt.getTime() + Math.floor((now.getTime() - child.cycleStartedAt.getTime()) / WEEK_MS) * WEEK_MS)
            : new Date(now.getTime() - WEEK_MS);
        const [skills, questions, activities, attempts, mandatoryRows, rules] = await Promise.all([
            this.prisma.skill.findMany({ where: { areaId: area.id }, include: { expectations: { where: { age } } }, orderBy: { name: 'asc' } }),
            this.prisma.question.findMany({ where: { areaId: area.id, skillId: { not: null } }, include: { options: true } }),
            this.prisma.activity.findMany({ where: { areaId: area.id }, include: { level: { select: { number: true } } } }),
            this.prisma.activityAttempt.findMany({ where: { childId: child.id, activity: { areaId: area.id } }, orderBy: { createdAt: 'desc' } }),
            this.prisma.mandatoryActivity.findMany({ where: { regionId: area.regionId, areaId: area.id, age } }),
            this.prisma.countryRestriction.findMany(),
        ]);
        const countryRules = rules.map((r) => ({ ...r, type: r.type }));
        const candidates = activities.map((a) => {
            const own = attempts.filter((t) => t.activityId === a.id);
            const country = (0, rules_1.countryCheck)(countryRules, child.parent.countryCode, { type: 'ACTIVITY', targetId: a.id });
            return {
                id: a.id,
                title: a.title,
                areaId: a.areaId,
                age: a.age,
                skillId: a.skillId,
                difficulty: a.skillStage,
                baseMarks: a.baseMarks,
                minimumPlan: a.minimumPlan,
                published: a.status === 'PUBLISHED',
                withdrawn: a.withdrawnAt !== null,
                levelNumber: a.level?.number ?? null,
                blockedInCountry: country.status !== 'ALLOWED',
                mastered: own.filter((t) => t.outcome === 'INDEPENDENT').length >= a.masteryTarget,
                attemptedThisWeek: own.some((t) => t.createdAt >= weekStart),
            };
        });
        const context = { areaId: area.id, age, plan, level };
        const eligible = candidates.filter((a) => (0, rules_1.ineligibleReason)(a, context) === null);
        const mandatoryIds = new Set(mandatoryRows.map((m) => m.activityId));
        const mandatory = eligible.filter((a) => mandatoryIds.has(a.id)).map((a) => ({ activityId: a.id, title: a.title }));
        const excluded = candidates
            .filter((a) => !a.withdrawn && a.age === age)
            .map((a) => ({ activityId: a.id, title: a.title, reason: (0, rules_1.ineligibleReason)(a, context) }))
            .filter((x) => x.reason !== null);
        const childInfo = { id: child.id, name: child.name, years, age, plan, level };
        const submission = child.questionnaires[0];
        if (!submission) {
            return { child: childInfo, noAssessment: true, evidence: [], mandatory, suggestions: [], gaps: [], excluded };
        }
        const answers = assessment_1.questionnaireAnswersSchema.parse(submission.answers);
        const evidence = skills.map((skill) => {
            const mapped = questions
                .filter((q) => q.skillId === skill.id)
                .flatMap((q) => {
                const answer = answers.find((a) => a.questionId === q.id);
                if (!answer)
                    return [];
                const option = q.options.find((o) => o.label === answer.answer);
                return [{ stage: (option?.skillStage ?? null), marks: answer.marks, maxMarks: Math.max(0, ...q.options.map((o) => Number(o.marks))) }];
            });
            let stage = (0, rules_1.stageFromAnswers)(mapped.map((m) => m.stage));
            let source = mapped.length ? 'Questionnaire answers' : 'No mapped answers';
            const latest = attempts.find((t) => activities.find((a) => a.id === t.activityId)?.skillId === skill.id);
            if (latest) {
                const activity = activities.find((a) => a.id === latest.activityId);
                stage = (0, rules_1.stageFromOutcome)(activity.skillStage, latest.outcome);
                source = `Latest activity: ${activity.title} (${{ INDEPENDENT: 'independently', WITH_HELP: 'with help', NOT_COMPLETED: 'could not complete' }[latest.outcome]})`;
            }
            return {
                skillId: skill.id,
                skill: skill.name,
                stage,
                percent: (0, rules_1.skillPercent)(mapped),
                expected: skill.expectations[0]?.expectedScore ?? null,
                source,
            };
        });
        const { suggestions, gaps } = (0, rules_1.selectSuggestions)(evidence, eligible, mandatoryIds, age);
        return {
            child: childInfo,
            noAssessment: false,
            evidence: evidence.map((e) => ({
                skillId: e.skillId,
                skill: e.skill,
                stage: (0, rules_1.stageLabel)(e.stage),
                percent: e.percent,
                expected: e.expected,
                belowExpected: (0, rules_1.isBelowExpected)(e),
                source: e.source,
            })),
            mandatory,
            suggestions,
            gaps,
            excluded,
        };
    }
};
exports.SelectionPreviewService = SelectionPreviewService;
exports.SelectionPreviewService = SelectionPreviewService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SelectionPreviewService);
//# sourceMappingURL=selection-preview.service.js.map