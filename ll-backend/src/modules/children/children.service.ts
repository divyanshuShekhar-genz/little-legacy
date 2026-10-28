import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ageOn } from '../../common/rules';
import { childAreaLevels } from '../../common/utils/child-levels';
import { areaScoresSchema, assessmentRulesSchema, questionnaireAnswersSchema } from '../../common/utils/assessment';
import type { ListChildrenQueryDto } from './dto/list-children.query.dto';

/**
 * Children & Learning (guide §4, §7). READ ONLY — admins can never edit a child's details or
 * earned scores. Questionnaire results and activity results are kept separate throughout.
 */

const childInclude = {
  parent: { select: { name: true } },
  questionnaires: { where: { isCurrent: true }, orderBy: { submittedAt: 'desc' as const }, take: 1, include: { config: true } },
  attempts: { include: { activity: { select: { title: true, areaId: true, masteryTarget: true } } }, orderBy: { createdAt: 'asc' as const } },
};

export interface ChildLearningRow {
  id: string;
  name: string;
  parentName: string;
  /** Completed years; null when there's no date of birth. */
  age: number | null;
  /** The months on top of `age` (0–11), for "4 y 8 m" (Q24); null with `age`. */
  ageMonths: number | null;
  /** True when the date of birth was worked out from an age the parent entered (Q24). */
  dobEstimated: boolean;
  /** When the current questionnaire was submitted; null = "Questionnaire not recorded". */
  assessmentStartedAt: string | null;
  questionnaireMarks: number | null;
  activityMarks: number | null;
  /** Assessment-rules revision the child is on; null = "Assigned on submission". */
  ruleVersion: number | null;
}

export interface LearningRecord {
  child: { id: string; name: string; parentName: string };
  /** False → "No assessment recorded. Parents complete the questionnaire in the parent app." */
  hasRecords: boolean;
  ruleVersion: number | null;
  areas: { name: string; questionnaire: number; activity: number; level: number }[];
  outcomes: { activity: string; outcome: 'INDEPENDENT' | 'WITH_HELP'; score: number; at: string }[];
  /** "Could not complete" attempts — admin only, never shown to parents. */
  unsuccessful: { activity: string; at: string }[];
}

@Injectable()
export class ChildrenService {
  constructor(private readonly prisma: PrismaService) {}

  async list({ search, area }: ListChildrenQueryDto) {
    const contains = search ? { contains: search, mode: 'insensitive' as const } : undefined;
    const children = await this.prisma.child.findMany({
      where: contains ? { OR: [{ name: contains }, { parent: { name: contains } }] } : undefined,
      include: childInclude,
      orderBy: { createdAt: 'asc' },
    });

    // Area filter: children with a recorded questionnaire answer or activity result in that area.
    let areaIds: Set<string> | null = null;
    if (area) {
      const areas = await this.prisma.developmentArea.findMany({ where: { name: area }, select: { id: true } });
      areaIds = new Set(areas.map((a) => a.id));
    }

    const now = new Date();
    const rows: ChildLearningRow[] = [];
    for (const c of children) {
      const submission = c.questionnaires[0];
      const answers = submission ? questionnaireAnswersSchema.parse(submission.answers) : [];
      if (areaIds) {
        const ids = areaIds;
        const inArea = answers.some((a) => ids.has(a.areaId)) || c.attempts.some((t) => ids.has(t.activity.areaId));
        if (!inArea) continue;
      }
      const hasRecords = Boolean(submission) || c.attempts.length > 0;
      rows.push({
        id: c.id,
        name: c.name,
        parentName: c.parent.name,
        age: c.dob ? ageOn(c.dob, now).years : null,
        ageMonths: c.dob ? ageOn(c.dob, now).months : null,
        dobEstimated: c.dobEstimated,
        assessmentStartedAt: submission?.submittedAt.toISOString() ?? null,
        questionnaireMarks: submission ? answers.reduce((s, a) => s + a.marks, 0) : null,
        activityMarks: hasRecords ? c.attempts.reduce((s, t) => s + Number(t.points), 0) : null,
        ruleVersion: submission?.config.revision ?? null,
      });
    }

    // Filter options: current areas. A removed area's history still matches by name above.
    const areaNames = await this.prisma.developmentArea.findMany({ where: { removedAt: null }, distinct: ['name'], select: { name: true }, orderBy: { position: 'asc' } });
    return { rows, areas: areaNames.map((a) => a.name) };
  }

  async learningRecord(childId: string): Promise<LearningRecord> {
    const c = await this.prisma.child.findUnique({ where: { id: childId }, include: childInclude });
    if (!c) throw new NotFoundException('Child not found');

    const submission = c.questionnaires[0];
    const child = { id: c.id, name: c.name, parentName: c.parent.name };
    if (!submission && c.attempts.length === 0) {
      return { child, hasRecords: false, ruleVersion: null, areas: [], outcomes: [], unsuccessful: [] };
    }

    // Area list comes from the child's own rules snapshot, or the region's latest rules if the
    // questionnaire was skipped (the child then starts on mandatory activities).
    const config =
      submission?.config ??
      (await this.prisma.assessmentConfig.findFirst({ where: { regionId: c.regionId }, orderBy: { revision: 'desc' } }));
    const rules = config ? assessmentRulesSchema.parse(config.rules) : { areas: [] };
    const areaScores = submission ? areaScoresSchema.parse(submission.areaScores) : {};

    // Level per area: shared with the level-freeze (common/utils/child-levels.ts) so the two can
    // never disagree. Highest of stored levels and every ladder (area + categories, Q20 interim).
    const areas = await Promise.all(
      rules.areas.map(async (a) => {
        const attempts = c.attempts.filter((t) => t.activity.areaId === a.areaId);
        const levels = (await childAreaLevels(this.prisma, a.areaId, [c.id])).get(c.id);
        return {
          name: a.name,
          questionnaire: areaScores[a.areaId] ?? 0,
          activity: attempts.reduce((s, t) => s + Number(t.points), 0),
          level: levels?.level ?? 0,
        };
      }),
    );

    return {
      child,
      hasRecords: true,
      ruleVersion: submission?.config.revision ?? null,
      areas,
      outcomes: c.attempts
        .filter((t): t is typeof t & { outcome: 'INDEPENDENT' | 'WITH_HELP' } => t.outcome !== 'NOT_COMPLETED')
        .map((t) => ({ activity: t.activity.title, outcome: t.outcome, score: Number(t.points), at: t.createdAt.toISOString() })),
      unsuccessful: c.attempts
        .filter((t) => t.outcome === 'NOT_COMPLETED')
        .map((t) => ({ activity: t.activity.title, at: t.createdAt.toISOString() })),
    };
  }
}
