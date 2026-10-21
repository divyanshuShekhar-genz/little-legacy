import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { currentArea } from '../../common/utils/region';
import { childAreaLevels } from '../../common/utils/child-levels';
import { questionnaireAnswersSchema } from '../../common/utils/assessment';
import {
  completedYears,
  contentAge,
  countryCheck,
  ineligibleReason,
  isBelowExpected,
  selectSuggestions,
  skillPercent,
  stageFromAnswers,
  stageFromOutcome,
  stageLabel,
  type CandidateActivity,
  type PlanTier,
  type RestrictionType,
  type SkillEvidence,
  type SkillStage,
} from '../../common/rules';
import type { SelectionPreviewDto } from './dto/skill.dto';

const WEEK_MS = 7 * 24 * 3_600_000;

/**
 * "Preview child selection" (guide §10: "The admin preview explains which skill results led to the
 * suggestions"). Reads one real child's answers and activity records — READ ONLY — and runs the
 * shared rules in common/rules/skills.ts. Decisions 2026-10-13: the child's current level (not only
 * Level 1), weakest skills first, and the country gate included.
 */
@Injectable()
export class SelectionPreviewService {
  constructor(private readonly prisma: PrismaService) {}

  async preview(dto: SelectionPreviewDto, now = new Date()) {
    const area = await currentArea(this.prisma, dto.areaId).catch(() => {
      throw new BadRequestException('Choose a development area.');
    });
    const child = await this.prisma.child.findUnique({
      where: { id: dto.childId },
      include: {
        parent: { select: { countryCode: true } },
        subscriptions: { orderBy: { startsAt: 'desc' } },
        questionnaires: { where: { isCurrent: true }, orderBy: { submittedAt: 'desc' }, take: 1 },
      },
    });
    if (!child) throw new NotFoundException('Child not found');
    if (child.regionId !== area.regionId) throw new BadRequestException("Choose a development area from the child's regional learning category.");
    if (!child.dob) throw new BadRequestException('This child has no date of birth recorded.');

    // Content age: completed years; above the highest supported age, the highest one (guide §5).
    const years = completedYears(child.dob, now);
    const ages = (await this.prisma.ageGroup.findMany({ where: { regionId: area.regionId }, select: { age: true } })).map((g) => g.age);
    const age = contentAge(years, ages);
    if (age === null) throw new BadRequestException(`There is no age group for ${years}-year-olds in this category: a content gap.`);

    const current = child.subscriptions.find((s) => s.startsAt <= now && (!s.endsAt || s.endsAt > now));
    const plan: PlanTier = dto.plan ?? current?.plan ?? 'FREE';
    // A child with no earned level starts on Level 1 (as on Overview).
    const level = Math.max(1, (await childAreaLevels(this.prisma, area.id, [child.id])).get(child.id)?.level ?? 0);

    // This week = the child's current weekly cycle; without a cycle yet, the last 7 days.
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
    const countryRules = rules.map((r) => ({ ...r, type: r.type as RestrictionType }));

    // ---- Every activity checked against every gate ----
    const candidates: CandidateActivity[] = activities.map((a) => {
      const own = attempts.filter((t) => t.activityId === a.id);
      const country = countryCheck(countryRules, child.parent.countryCode, { type: 'ACTIVITY', targetId: a.id });
      return {
        id: a.id,
        title: a.title,
        areaId: a.areaId,
        age: a.age,
        skillId: a.skillId,
        difficulty: a.skillStage as SkillStage,
        baseMarks: a.baseMarks,
        minimumPlan: a.minimumPlan as PlanTier,
        published: a.status === 'PUBLISHED',
        withdrawn: a.withdrawnAt !== null,
        levelNumber: a.level?.number ?? null,
        blockedInCountry: country.status !== 'ALLOWED', // no country known → never guessed (guide §20)
        mastered: own.filter((t) => t.outcome === 'INDEPENDENT').length >= a.masteryTarget,
        attemptedThisWeek: own.some((t) => t.createdAt >= weekStart),
      };
    });
    const context = { areaId: area.id, age, plan, level };
    const eligible = candidates.filter((a) => ineligibleReason(a, context) === null);
    const mandatoryIds = new Set(mandatoryRows.map((m) => m.activityId));
    const mandatory = eligible.filter((a) => mandatoryIds.has(a.id)).map((a) => ({ activityId: a.id, title: a.title }));
    const excluded = candidates
      .filter((a) => !a.withdrawn && a.age === age)
      .map((a) => ({ activityId: a.id, title: a.title, reason: ineligibleReason(a, context) }))
      .filter((x): x is { activityId: string; title: string; reason: string } => x.reason !== null);

    const childInfo = { id: child.id, name: child.name, years, age, plan, level };
    const submission = child.questionnaires[0];
    if (!submission) {
      // Prototype: no submitted assessment → the age-specific mandatory set until answers exist.
      return { child: childInfo, noAssessment: true, evidence: [], mandatory, suggestions: [], gaps: [], excluded };
    }

    // ---- Skill evidence: mapped answers, then the latest activity outcome overrides ----
    // Saved answers hold the answer label, so they're matched by question + label (decision 3).
    const answers = questionnaireAnswersSchema.parse(submission.answers);
    const evidence: (SkillEvidence & { source: string })[] = skills.map((skill) => {
      const mapped = questions
        .filter((q) => q.skillId === skill.id)
        .flatMap((q) => {
          const answer = answers.find((a) => a.questionId === q.id);
          if (!answer) return [];
          const option = q.options.find((o) => o.label === answer.answer);
          return [{ stage: (option?.skillStage ?? null) as SkillStage | null, marks: answer.marks, maxMarks: Math.max(0, ...q.options.map((o) => Number(o.marks))) }];
        });
      let stage = stageFromAnswers(mapped.map((m) => m.stage));
      let source = mapped.length ? 'Questionnaire answers' : 'No mapped answers';
      const latest = attempts.find((t) => activities.find((a) => a.id === t.activityId)?.skillId === skill.id);
      if (latest) {
        const activity = activities.find((a) => a.id === latest.activityId)!;
        stage = stageFromOutcome(activity.skillStage as SkillStage, latest.outcome);
        source = `Latest activity: ${activity.title} (${{ INDEPENDENT: 'independently', WITH_HELP: 'with help', NOT_COMPLETED: 'could not complete' }[latest.outcome]})`;
      }
      return {
        skillId: skill.id,
        skill: skill.name,
        stage,
        percent: skillPercent(mapped),
        expected: skill.expectations[0]?.expectedScore ?? null,
        source,
      };
    });

    const { suggestions, gaps } = selectSuggestions(evidence, eligible, mandatoryIds, age);
    return {
      child: childInfo,
      noAssessment: false,
      evidence: evidence.map((e) => ({
        skillId: e.skillId,
        skill: e.skill,
        stage: stageLabel(e.stage),
        percent: e.percent,
        expected: e.expected,
        belowExpected: isBelowExpected(e),
        source: e.source,
      })),
      mandatory,
      suggestions,
      gaps,
      excluded,
    };
  }
}
