import { planAllows } from './access';
import type { CompletionOutcome, PlanTier } from './domain';

/**
 * Skill personalisation (guide §10; prototype personalisation.js). Pure rules, shared by the admin
 * "Preview child selection" and, later, the parent app's weekly selection.
 *
 * Decisions 2026-10-13 (OPEN_QUESTIONS Q22 updated):
 * - Stage = lowest known stage across the child's mapped answers; the latest activity outcome on an
 *   activity with that skill overrides it (independent → its difficulty + 1, could not complete →
 *   − 1, with help → its difficulty).
 * - Skill % = marks earned on the skill's questions ÷ the maximum possible × 100. Below the age's
 *   expected score = needs more support.
 * - Eligible: same area, the child's content age, published, not withdrawn, plan high enough, not
 *   blocked in the child's country, level unlocked (activity level ≤ the child's current level),
 *   not mastered, not attempted this week. Country and level are added to the prototype's list
 *   (guide §9, §20: no gate bypasses another).
 * - Suggestions: one per skill with a known stage — the hardest eligible, non-mandatory activity at
 *   or below the stage (ties: lower marks, then id) — weakest skills first. No activity → content gap.
 */

export const SKILL_STAGES = ['STARTING', 'PRACTISING', 'CONFIDENT'] as const;
export type SkillStage = (typeof SKILL_STAGES)[number];

const rank = (s: SkillStage) => SKILL_STAGES.indexOf(s);
const clampStage = (i: number): SkillStage => SKILL_STAGES[Math.max(0, Math.min(SKILL_STAGES.length - 1, i))]!;

const titleCase = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();
/** "Starting" etc. for staff-facing reasons. */
export const stageLabel = (s: SkillStage | null) => (s ? titleCase(s) : 'Unknown');

/** Lowest known stage across mapped answers; null when none is known. */
export function stageFromAnswers(stages: (SkillStage | null)[]): SkillStage | null {
  const known = stages.filter((s): s is SkillStage => s !== null);
  return known.length ? clampStage(Math.min(...known.map(rank))) : null;
}

/** Latest activity evidence → stage: independent +1, could not complete −1, with help unchanged. */
export function stageFromOutcome(activityDifficulty: SkillStage, outcome: CompletionOutcome): SkillStage {
  const step = outcome === 'INDEPENDENT' ? 1 : outcome === 'NOT_COMPLETED' ? -1 : 0;
  return clampStage(rank(activityDifficulty) + step);
}

/** Skill % from questionnaire marks; null when the child answered none of the skill's questions. */
export function skillPercent(answers: { marks: number; maxMarks: number }[]): number | null {
  const max = answers.reduce((s, a) => s + a.maxMarks, 0);
  if (!answers.length || max <= 0) return null;
  return Math.round((answers.reduce((s, a) => s + a.marks, 0) / max) * 10000) / 100;
}

export interface SkillEvidence {
  skillId: string;
  skill: string;
  stage: SkillStage | null;
  percent: number | null;
  /** Expected score (%) for the child's age; null = not set. */
  expected: number | null;
}

/** Below the expected score → needs more support. Unknown % or no expectation → not below. */
export const isBelowExpected = (e: SkillEvidence) => e.percent !== null && e.expected !== null && e.percent < e.expected;

/** Weakest first: below expected, then lower stage, then lower %, then name. Unknown stages last. */
export function weakestFirst(evidence: SkillEvidence[]): SkillEvidence[] {
  return [...evidence].sort(
    (a, b) =>
      Number(isBelowExpected(b)) - Number(isBelowExpected(a)) ||
      (a.stage === null ? 9 : rank(a.stage)) - (b.stage === null ? 9 : rank(b.stage)) ||
      (a.percent ?? 101) - (b.percent ?? 101) ||
      a.skill.localeCompare(b.skill),
  );
}

export interface CandidateActivity {
  id: string;
  title: string;
  areaId: string;
  age: number;
  skillId: string | null;
  difficulty: SkillStage;
  baseMarks: number;
  minimumPlan: PlanTier;
  published: boolean;
  withdrawn: boolean;
  /** The activity's level number (null = no level). */
  levelNumber: number | null;
  blockedInCountry: boolean;
  mastered: boolean;
  attemptedThisWeek: boolean;
}

export interface ChildContext {
  areaId: string;
  age: number;
  plan: PlanTier;
  /** The child's current level in the area. */
  level: number;
}

/** Why an activity isn't offered, or null when it's eligible. */
export function ineligibleReason(a: CandidateActivity, c: ChildContext): string | null {
  if (a.areaId !== c.areaId) return 'Another development area';
  if (a.age !== c.age) return `For age ${a.age}`;
  if (a.withdrawn) return 'Withdrawn';
  if (!a.published) return 'Not published';
  if (!planAllows(c.plan, a.minimumPlan)) return `Needs the ${titleCase(a.minimumPlan)} plan`;
  if (a.blockedInCountry) return "Not available in the child's country";
  if (a.levelNumber === null || a.levelNumber > c.level) return `Level ${a.levelNumber ?? '?'} not unlocked yet`;
  if (a.mastered) return 'Already mastered';
  if (a.attemptedThisWeek) return 'Already attempted this week';
  return null;
}

export interface Suggestion {
  activityId: string;
  title: string;
  skillId: string;
  skill: string;
  reason: string;
}

export interface SelectionResult {
  suggestions: Suggestion[];
  /** Skills with a known stage but no suitable activity: a content gap, never another age's content. */
  gaps: { skillId: string; skill: string; reason: string }[];
}

/**
 * One suggestion per skill with a known stage, weakest skills first: the hardest eligible,
 * non-mandatory activity whose difficulty ≤ the stage (ties: lower marks, then id).
 */
export function selectSuggestions(evidence: SkillEvidence[], eligible: CandidateActivity[], mandatoryIds: Set<string>, ageForReason: number): SelectionResult {
  const suggestions: Suggestion[] = [];
  const gaps: SelectionResult['gaps'] = [];
  for (const e of weakestFirst(evidence)) {
    if (!e.stage) continue;
    const stage = e.stage;
    const pick = eligible
      .filter((a) => a.skillId === e.skillId && !mandatoryIds.has(a.id) && rank(a.difficulty) <= rank(stage))
      .sort((x, y) => rank(y.difficulty) - rank(x.difficulty) || x.baseMarks - y.baseMarks || x.id.localeCompare(y.id))[0];
    if (!pick) {
      gaps.push({ skillId: e.skillId, skill: e.skill, reason: `No eligible ${stageLabel(stage)}-or-easier activity for age ${ageForReason}` });
      continue;
    }
    const why = isBelowExpected(e)
      ? `${e.skill} is ${stageLabel(stage)}, below the expected ${e.expected}% for age ${ageForReason} (${e.percent}%) — more support first`
      : `${e.skill} is ${stageLabel(stage)}`;
    suggestions.push({ activityId: pick.id, title: pick.title, skillId: e.skillId, skill: e.skill, reason: `${why}; hardest ${stageLabel(pick.difficulty)} activity at or below that stage` });
  }
  return { suggestions, gaps };
}
