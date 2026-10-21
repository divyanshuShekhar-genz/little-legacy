import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DraftsService, type Tx } from '../drafts/drafts.service';
import { assertRegion } from '../../common/utils/region';
import { assessmentRulesSchema, type AssessmentRules } from '../../common/utils/assessment';
import {
  FORMULA_VARIABLES,
  FormulaError,
  checkFormula,
  largestRemainderPercents,
  mandatoryScoreTarget,
  parseFormula,
  weightAreas,
  withActivity,
  type FormulaValues,
} from '../../common/rules';
import type { SessionAdmin } from '../../common/types/session-admin';
import type { PreviewDto, SaveRulesDto } from './dto/assessment-rules.dto';

/**
 * Assessment rules (guide §8, §11, §13; prototype "Assessment rules"): per-area formulas and
 * weights, per-difficulty question weights, mandatory activities by age, required counts.
 *
 * Saving creates a NEW, immutable AssessmentConfig revision (decision 2026-10-08: one save = the
 * whole page = one revision). Children keep the revision they started with — nothing here
 * recalculates existing records. The MandatoryActivity table is the working copy of the picks.
 * Formulas run only through the safe engine in common/rules/formula.ts — never eval.
 */

export const RULES_ENTITY = 'AssessmentConfig';
const SECTION = 'Assessment rules';
const WEIGHTS = 'Use non-negative weights and at least one positive weight.';
const DEFAULT_ROW = { formula: 'questionnaire + activity', weight: 1, questionWeights: { EASY: 1, MEDIUM: 1, HARD: 1 } };
const ZEROS: FormulaValues = Object.fromEntries(FORMULA_VARIABLES.map((v) => [v, 0]));

interface RulesPayload {
  regionId: string;
  /** The author: a revision records who made it, even when a draft is approved later. */
  createdById: string;
  areas: { areaId: string; formula: string; weight: number; questionWeights: { EASY: number; MEDIUM: number; HARD: number } }[];
  mandatory: { age: number; areaId: string; activityIds: string[]; requiredCount: number }[];
  sample: { questionnaire: number; mandatory: number; regular: number; mastery: number; target: number };
}

/** Latest revision of a region (revision 0 = none yet). Keyed by region for the draft conflict check. */
const snapshot = async (tx: Tx, regionId: string) => {
  const region = await tx.learningRegion.findUnique({ where: { id: regionId }, select: { id: true } });
  if (!region) return null;
  const latest = await tx.assessmentConfig.findFirst({ where: { regionId }, orderBy: { revision: 'desc' } });
  return { regionId, revision: latest?.revision ?? 0, rules: latest?.rules ?? null };
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Every rule the page must pass. Run on request and again in apply(). Returns the current areas. */
async function validate(db: Tx, p: RulesPayload) {
  await assertRegion(db, p.regionId);
  const areas = await db.developmentArea.findMany({ where: { regionId: p.regionId, removedAt: null }, orderBy: { position: 'asc' } });
  if (!areas.length) throw new BadRequestException('Add a development area first.');

  const sent = p.areas.map((a) => a.areaId);
  if (sent.length !== areas.length || new Set(sent).size !== sent.length || !areas.every((a) => sent.includes(a.id))) {
    throw new BadRequestException('Include every development area of this category once.');
  }
  if (!p.areas.some((a) => a.weight > 0)) throw new BadRequestException(WEIGHTS);

  // Prototype: every formula must work with the sample values AND with all zeros.
  const sample = withActivity(p.sample);
  for (const row of p.areas) {
    const problem = checkFormula(row.formula, [sample, ZEROS]);
    if (problem) throw new BadRequestException(`${areas.find((a) => a.id === row.areaId)!.name}: ${problem}`);
  }

  const ages = new Set((await db.ageGroup.findMany({ where: { regionId: p.regionId }, select: { age: true } })).map((g) => g.age));
  const seen = new Set<string>();
  for (const pick of p.mandatory) {
    const key = `${pick.age}:${pick.areaId}`;
    if (seen.has(key)) throw new BadRequestException('Each age and development area can appear only once.');
    seen.add(key);
    if (!ages.has(pick.age) || !areas.some((a) => a.id === pick.areaId)) {
      throw new BadRequestException('Choose mandatory activities from this age and development area.');
    }
    const ids = [...new Set(pick.activityIds)];
    const ok = await db.activity.count({ where: { id: { in: ids }, regionId: p.regionId, areaId: pick.areaId, age: pick.age, withdrawnAt: null } });
    if (ok !== ids.length || ids.length !== pick.activityIds.length) {
      throw new BadRequestException('Choose mandatory activities from this age and development area.');
    }
  }
  return areas;
}

/** The immutable snapshot stored on the revision (shape: common/utils/assessment.ts). */
function buildRules(p: RulesPayload, areas: { id: string; name: string }[]): AssessmentRules {
  const mandatory: AssessmentRules['mandatory'] = {};
  const requiredCounts: AssessmentRules['requiredCounts'] = {};
  for (const pick of p.mandatory) {
    if (pick.activityIds.length) (mandatory[pick.age] ??= {})[pick.areaId] = pick.activityIds;
    if (pick.requiredCount > 0) (requiredCounts[pick.age] ??= {})[pick.areaId] = pick.requiredCount;
  }
  return assessmentRulesSchema.parse({
    // Area names at snapshot time, so a later rename doesn't rewrite history.
    areas: areas.map((a) => {
      const row = p.areas.find((r) => r.areaId === a.id)!;
      return { areaId: a.id, name: a.name, formula: row.formula, weight: row.weight, questionWeights: row.questionWeights };
    }),
    mandatory,
    requiredCounts,
  });
}

@Injectable()
export class AssessmentRulesService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly drafts: DraftsService,
  ) {}

  onModuleInit() {
    this.drafts.register<RulesPayload>(RULES_ENTITY, {
      snapshot,
      apply: async (tx, regionId, payload) => {
        if (!regionId || regionId !== payload.regionId) throw new BadRequestException('Choose a regional learning category.');
        // Re-checked: activities may have been withdrawn or areas changed since the draft was saved.
        const areas = await validate(tx, payload);
        const latest = await tx.assessmentConfig.findFirst({ where: { regionId }, orderBy: { revision: 'desc' } });
        await tx.assessmentConfig.create({
          data: { regionId, revision: (latest?.revision ?? 0) + 1, rules: buildRules(payload, areas), createdById: payload.createdById },
        });
        // The working copy of mandatory picks now matches the new revision.
        await tx.mandatoryActivity.deleteMany({ where: { regionId } });
        await tx.mandatoryActivity.createMany({
          data: payload.mandatory.flatMap((m) => [...new Set(m.activityIds)].map((activityId) => ({ regionId, age: m.age, areaId: m.areaId, activityId }))),
        });
        return regionId;
      },
    });
  }

  /** Everything the page shows, for the region's current areas and ages. */
  async get(regionId: string) {
    await assertRegion(this.prisma, regionId);
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
    const rules = latest ? assessmentRulesSchema.parse(latest.rules) : null;

    return {
      /** "Rules version N" (0 = none saved yet). */
      revision: latest?.revision ?? 0,
      // New areas get the defaults; removed areas drop out.
      areas: areas.map((a) => {
        const row = rules?.areas.find((r) => r.areaId === a.id) ?? DEFAULT_ROW;
        return { areaId: a.id, name: a.name, formula: row.formula, weight: row.weight, questionWeights: row.questionWeights };
      }),
      ages: ageGroups.map((g) => g.age),
      mandatory: ageGroups.flatMap(({ age }) =>
        areas.map((area) => {
          const candidates = activities.filter((x) => x.age === age && x.areaId === area.id);
          const picked = picks.filter((p) => p.age === age && p.areaId === area.id && candidates.some((c) => c.id === p.activityId));
          return {
            age,
            areaId: area.id,
            activityIds: picked.map((p) => p.activityId),
            /** "Automatic target: X marks · N activities" = one full base award per picked activity. */
            target: mandatoryScoreTarget(picked.map((p) => candidates.find((c) => c.id === p.activityId)!.baseMarks)),
            count: picked.length,
            requiredCount: rules?.requiredCounts[age]?.[area.id] ?? 0,
            candidates: candidates.map((c) => ({ id: c.id, title: c.title, baseMarks: c.baseMarks, status: c.status })),
          };
        }),
      ),
    };
  }

  /**
   * "Calculate preview": one set of sample values for every area (activity = mandatory + regular).
   * value = formula × weight; % by largest remainder (totals exactly 100.00); weighted average
   * = Σ(formula × weight) ÷ Σ(weight). All zero → "Not enough assessment data." Saves nothing.
   */
  async preview(dto: PreviewDto) {
    await assertRegion(this.prisma, dto.regionId);
    const names = new Map(
      (await this.prisma.developmentArea.findMany({ where: { regionId: dto.regionId }, select: { id: true, name: true } })).map((a) => [a.id, a.name]),
    );
    const values = withActivity(dto.sample);
    const results = dto.areas.map((row) => {
      const name = names.get(row.areaId) ?? row.areaId;
      try {
        return { areaId: row.areaId, name, result: parseFormula(row.formula).evaluate(values), weight: row.weight };
      } catch (e) {
        if (e instanceof FormulaError) throw new BadRequestException(`${name}: ${e.message}`);
        throw e;
      }
    });
    const percents = largestRemainderPercents(results.map((r) => r.result * r.weight));
    const weighting = weightAreas(results.map((r) => ({ value: r.result, weight: r.weight })));
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

  async save(admin: SessionAdmin, dto: SaveRulesDto) {
    const payload: RulesPayload = {
      regionId: dto.regionId,
      createdById: admin.id,
      areas: dto.areas.map((a) => ({ areaId: a.areaId, formula: a.formula.trim(), weight: a.weight, questionWeights: { EASY: a.questionWeights.EASY, MEDIUM: a.questionWeights.MEDIUM, HARD: a.questionWeights.HARD } })),
      mandatory: dto.mandatory.map((m) => ({ age: m.age, areaId: m.areaId, activityIds: m.activityIds, requiredCount: m.requiredCount })),
      sample: { questionnaire: dto.sample.questionnaire, mandatory: dto.sample.mandatory, regular: dto.sample.regular, mastery: dto.sample.mastery, target: dto.sample.target },
    };
    await validate(this.prisma, payload);
    const region = await this.prisma.learningRegion.findUniqueOrThrow({ where: { id: dto.regionId } });
    return this.drafts.saveOrDraft<RulesPayload>({
      admin,
      mode: dto.mode,
      section: SECTION,
      entityType: RULES_ENTITY,
      entityId: dto.regionId,
      regionId: dto.regionId,
      payload,
      label: `Assessment rules for ${region.name}`,
    });
  }
}
