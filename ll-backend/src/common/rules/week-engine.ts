import { planAllows } from './access';
import type { PlanTier } from './domain';
import { scoreCompletion } from './scoring';

/**
 * The weekly allocation engine (Activity Flow §3, §7–13; guide §11–12; prototype
 * progression-engine.js `generate`). Pure: the admin "Preview a child's week" runs it on a sample
 * child, and the parent app's weekly job will run it on real children.
 *
 * Every week, from week 1, replaying the recorded outcomes (decision 2026-10-13, option 1):
 *  1. Pending — each group's latest earlier assignment with no record, or "could not complete"
 *     (hidden for the rest of that week, back as pending after: Q6), not expired, newest first,
 *     up to the pending limit.
 *  2. Limit — `weekly` (or the most specific area-'All' override); when `maxVisible` is set, the
 *     guide's rule: last week's completions + 5, capped by it (week 1: the limit, capped) — Q1.
 *     Minus pending when pending counts within the limit.
 *  3. Pool — groups for the child's age and Base, with an offered difficulty: published, plan OK,
 *     not country-blocked, area Level unlocked (two gates, decision 4a), not mastered.
 *  4. Sort — mandatory (until completed once) → skill below the group's benchmark → least recently
 *     done → name. 5. Fill, with per-area caps from area-specific overrides. Unfilled = gap.
 *  Stage of a group: starts at the highest difficulty ≤ the starting difficulty (Base or override);
 *  moves up when independent completions reach that difficulty's mastery count (Q23: Strong);
 *  with help stays (Developing); could not complete + "easier" steps down to the nearest
 *  unmastered lower difficulty (Needs support).
 */

export type EngineOutcome = 'INDEPENDENT' | 'WITH_HELP' | 'UNABLE';

export interface EngineSettings {
  /** In order: Base 1, 2, 3. */
  bases: { from: number; start: number }[];
  weekly: number;
  maxVisible: number | null;
  pendingEnabled: boolean;
  pendingLimit: number;
  /** 0 = never expires. */
  pendingDays: number;
  pendingCounts: boolean;
  recent: number;
  continueCount: number;
  reinforcement: 'same' | 'easier';
  /** 'anniversary' or a UTC weekday '0'..'6'. */
  resetDay: string;
  /** 'All' or a value: age '4', base 'Base 2', area id, plan 'PLUS'. */
  overrides: { age: string; base: string; area: string; plan: string; limit: number; start: number }[];
}

export interface EngineDifficulty {
  activityId: string;
  title: string;
  /** Difficulty number in the group. */
  difficulty: number;
  masteryTarget: number;
  baseMarks: number;
  /** The activity's area Level number (null = none). */
  areaLevel: number | null;
  minimumPlan: PlanTier;
  published: boolean;
  blockedInCountry: boolean;
}

export interface EngineGroup {
  id: string;
  name: string;
  areaId: string;
  age: number;
  skillId: string | null;
  skillName: string | null;
  /** Expected skill score %. */
  benchmark: number;
  mandatory: boolean;
  /** Eligible Base numbers (1–3); empty = all. */
  bases: number[];
  difficulties: EngineDifficulty[];
}

export interface SampleChild {
  age: number;
  plan: PlanTier;
  questionnaireDone: boolean;
  /** Assessment %. */
  score: number;
  /** Area Level unlocked (the same for every area in the preview). */
  level: number;
  /** Skill % by skill id (null = unknown). */
  skills: Record<string, number | null>;
}

export interface Card {
  /** `"<week>:<activityId>"` — record outcomes against this. */
  id: string;
  activityId: string;
  name: string;
  difficulty: number;
  reason: string;
  /** The week it was first assigned. */
  week: number;
}

export interface WeekResult {
  week: number;
  base: string;
  nextRefresh: string;
  continue: Card[];
  current: Card[];
  pending: Card[];
  recent: { name: string; level: number; outcome: EngineOutcome }[];
  adminOutcomes: { name: string; outcome: EngineOutcome; points: number }[];
  gap: number;
  /** Which weekly-count rule was used (Q1), for the explanation. */
  limitRule: string;
}

export class EngineError extends Error {}

const DAY = 86_400_000;

/** Highest Base whose "from %" ≤ the score; no questionnaire → Base 1 (guide §6). Returns 1..3. */
export function baseFor(score: number, questionnaireDone: boolean, bases: { from: number }[]): number {
  if (!questionnaireDone) return 1;
  let base = 1;
  bases.forEach((b, i) => {
    if (score >= b.from) base = i + 1;
  });
  return base;
}

/** The most specific matching override (most non-'All' fields; ties: list order). */
export function matchOverride(
  overrides: EngineSettings['overrides'],
  key: { age: number; base: number; areaId: string | null; plan: PlanTier },
  areaOnly: boolean,
) {
  const matches = overrides.filter(
    (o) =>
      (o.age === 'All' || o.age === String(key.age)) &&
      (o.base === 'All' || o.base === `Base ${key.base}`) &&
      (o.plan === 'All' || o.plan === key.plan) &&
      (areaOnly ? key.areaId !== null && o.area === key.areaId : o.area === 'All' || o.area === key.areaId),
  );
  const specificity = (o: EngineSettings['overrides'][number]) => [o.age, o.base, o.area, o.plan].filter((v) => v !== 'All').length;
  return matches.reduce<(typeof matches)[number] | undefined>((best, o) => (!best || specificity(o) > specificity(best) ? o : best), undefined);
}

/** The next weekly refresh after week `week` started (ISO date). */
export function refreshDateFor(cycleStart: Date, week: number, resetDay: string): string {
  if (resetDay === 'anniversary') return new Date(cycleStart.getTime() + week * 7 * DAY).toISOString().slice(0, 10);
  const target = Number(resetDay);
  let first = new Date(cycleStart.getTime() + DAY);
  while (first.getUTCDay() !== target) first = new Date(first.getTime() + DAY);
  return new Date(first.getTime() + (week - 1) * 7 * DAY).toISOString().slice(0, 10);
}

interface Assignment {
  id: string;
  week: number;
  /** The week it was first assigned (pending keeps the original week). */
  firstWeek: number;
  groupId: string;
  activityId: string;
  outcome?: EngineOutcome;
}

export function simulateWeek(input: {
  settings: EngineSettings;
  groups: EngineGroup[];
  child: SampleChild;
  week: number;
  outcomes: { assignmentId: string; outcome: EngineOutcome }[];
  cycleStart: Date;
}): WeekResult {
  const { settings, child } = input;
  const base = baseFor(child.score, child.questionnaireDone, settings.bases);
  const groups = input.groups.filter((g) => g.difficulties.length > 0);
  const outcomeById = new Map(input.outcomes.map((o) => [o.assignmentId, o.outcome]));
  const known = new Set<string>();

  const assignments: Assignment[] = [];
  const stage = new Map<string, number | 'done'>(); // group → difficulty number, or every difficulty mastered
  const independent = new Map<string, number>(); // activity → independent completions
  const scored = new Map<string, number>(); // activity → scored completions (for the halving)
  const lastDone = new Map<string, number>(); // group → last week completed
  const lastAttempt = new Map<string, number>(); // group → last week with any outcome
  const mandatoryCleared = new Set<string>();
  const history: { week: number; groupId: string; activityId: string; outcome: EngineOutcome; points: number }[] = [];
  let lastWeekCompletions = 0;

  const startFor = (g: EngineGroup) =>
    matchOverride(settings.overrides, { age: child.age, base, areaId: g.areaId, plan: child.plan }, false)?.start ?? settings.bases[base - 1]?.start ?? 1;
  const mastered = (d: EngineDifficulty) => (independent.get(d.activityId) ?? 0) >= d.masteryTarget;
  const eligible = (d: EngineDifficulty) =>
    d.published && !d.blockedInCountry && planAllows(child.plan, d.minimumPlan) && d.areaLevel !== null && d.areaLevel <= child.level;

  /** The difficulty a group offers now, or why it offers none. */
  const offered = (g: EngineGroup): EngineDifficulty | null => {
    let current = stage.get(g.id);
    if (current === 'done') return null;
    if (current === undefined) {
      const start = startFor(g);
      const atOrBelow = g.difficulties.filter((d) => d.difficulty <= start);
      current = (atOrBelow.length ? atOrBelow[atOrBelow.length - 1]! : g.difficulties[0]!).difficulty;
      stage.set(g.id, current);
    }
    // The difficulty at the stage if it can be offered, otherwise the nearest lower one that can —
    // but never below a difficulty the child has already mastered: after a success, a locked next
    // step means the group waits (e.g. for the area Level to unlock), it never sends them back.
    const floor = Math.max(0, ...g.difficulties.filter(mastered).map((d) => d.difficulty));
    const options = g.difficulties.filter((d) => d.difficulty <= current && d.difficulty > floor && eligible(d) && !mastered(d));
    return options[options.length - 1] ?? null;
  };

  let result: WeekResult | null = null;
  for (let w = 1; w <= input.week; w++) {
    // ---- 1. Pending ----
    const pending: Assignment[] = [];
    if (settings.pendingEnabled) {
      const latestByGroup = new Map<string, Assignment>();
      for (const a of assignments) if (a.week < w) latestByGroup.set(a.groupId, a);
      const open = [...latestByGroup.values()]
        .filter((a) => !a.outcome || a.outcome === 'UNABLE')
        .filter((a) => settings.pendingDays === 0 || (w - a.firstWeek) * 7 <= settings.pendingDays)
        .sort((x, y) => y.week - x.week || x.groupId.localeCompare(y.groupId));
      for (const a of open) {
        if (pending.length >= settings.pendingLimit) break;
        const g = groups.find((x) => x.id === a.groupId)!;
        const d = offered(g);
        if (!d) continue;
        pending.push({ id: `${w}:${d.activityId}`, week: w, firstWeek: a.firstWeek, groupId: g.id, activityId: d.activityId });
      }
    }

    // ---- 2. Limit (Q1) ----
    const totalOverride = matchOverride(settings.overrides, { age: child.age, base, areaId: null, plan: child.plan }, false);
    const weekly = totalOverride?.limit ?? settings.weekly;
    let limit = weekly;
    let limitRule = totalOverride ? `Allocation override: ${weekly} a week` : `Weekly limit: ${weekly}`;
    if (settings.maxVisible !== null) {
      limit = w === 1 ? Math.min(weekly, settings.maxVisible) : Math.min(lastWeekCompletions + 5, settings.maxVisible);
      limitRule = w === 1 ? `Week 1: ${weekly}, capped at ${settings.maxVisible}` : `Last week's ${lastWeekCompletions} completions + 5, capped at ${settings.maxVisible}`;
    }
    const capacity = Math.max(0, limit - (settings.pendingCounts ? pending.length : 0));

    // ---- 3–5. Pool, sort, fill ----
    const pendingGroups = new Set(pending.map((p) => p.groupId));
    const reasonOf = new Map<string, string>();
    const pool = groups
      .filter((g) => g.age === child.age && (g.bases.length === 0 || g.bases.includes(base)) && !pendingGroups.has(g.id))
      .map((g) => ({ g, d: offered(g) }))
      .filter((x): x is { g: EngineGroup; d: EngineDifficulty } => x.d !== null);
    const isMandatory = (g: EngineGroup) => g.mandatory && !mandatoryCleared.has(g.id);
    const belowBenchmark = (g: EngineGroup) => {
      const pct = g.skillId ? child.skills[g.skillId] : null;
      return pct !== null && pct !== undefined && pct < g.benchmark;
    };
    pool.sort(
      (a, b) =>
        Number(isMandatory(b.g)) - Number(isMandatory(a.g)) ||
        Number(belowBenchmark(b.g)) - Number(belowBenchmark(a.g)) ||
        (lastDone.get(a.g.id) ?? 0) - (lastDone.get(b.g.id) ?? 0) ||
        a.g.name.localeCompare(b.g.name),
    );
    const current: Assignment[] = [];
    const perArea = new Map<string, number>();
    for (const { g, d } of pool) {
      if (current.length >= capacity) break;
      const cap = matchOverride(settings.overrides, { age: child.age, base, areaId: g.areaId, plan: child.plan }, true)?.limit;
      if (cap !== undefined && (perArea.get(g.areaId) ?? 0) >= cap) continue;
      perArea.set(g.areaId, (perArea.get(g.areaId) ?? 0) + 1);
      current.push({ id: `${w}:${d.activityId}`, week: w, firstWeek: w, groupId: g.id, activityId: d.activityId });
      const pct = g.skillId ? child.skills[g.skillId] : null;
      reasonOf.set(
        g.id,
        isMandatory(g)
          ? 'Mandatory during initial assessment'
          : belowBenchmark(g)
            ? `${g.skillName ?? 'Skill'} ${pct}% is below the ${g.benchmark}% benchmark`
            : lastDone.has(g.id)
              ? `Least recently done (week ${lastDone.get(g.id)})`
              : 'Not done yet',
      );
    }
    const gap = Math.max(0, capacity - current.length);

    // ---- Record this week's outcomes ----
    const thisWeek = [...pending, ...current];
    thisWeek.forEach((a) => known.add(a.id));
    assignments.push(...thisWeek);
    let completions = 0;
    for (const a of thisWeek) {
      const outcome = outcomeById.get(a.id);
      if (!outcome) continue;
      a.outcome = outcome;
      const g = groups.find((x) => x.id === a.groupId)!;
      const d = g.difficulties.find((x) => x.activityId === a.activityId)!;
      const prior = scored.get(d.activityId) ?? 0;
      const score = scoreCompletion(d.baseMarks, prior, outcome === 'UNABLE' ? 'NOT_COMPLETED' : outcome);
      if (score.scored) scored.set(d.activityId, prior + 1);
      history.push({ week: w, groupId: g.id, activityId: d.activityId, outcome, points: score.points });
      lastAttempt.set(g.id, w);
      if (outcome !== 'UNABLE') {
        completions++;
        lastDone.set(g.id, w);
        mandatoryCleared.add(g.id);
      }
      if (outcome === 'INDEPENDENT') {
        independent.set(d.activityId, (independent.get(d.activityId) ?? 0) + 1);
        if (mastered(d)) {
          const next = g.difficulties.find((x) => x.difficulty > d.difficulty);
          stage.set(g.id, next ? next.difficulty : 'done');
        }
      } else if (outcome === 'UNABLE' && settings.reinforcement === 'easier') {
        const easier = g.difficulties.filter((x) => x.difficulty < d.difficulty && !mastered(x));
        if (easier.length) stage.set(g.id, easier[easier.length - 1]!.difficulty);
      }
    }
    lastWeekCompletions = completions;

    if (w === input.week) {
      const card = (a: Assignment, reason: string): Card => {
        const g = groups.find((x) => x.id === a.groupId)!;
        const d = g.difficulties.find((x) => x.activityId === a.activityId)!;
        return { id: a.id, activityId: d.activityId, name: d.title, difficulty: d.difficulty, reason: `${reason} · Difficulty ${d.difficulty}`, week: a.firstWeek };
      };
      // Completed and could-not-complete cards leave the list for the rest of the week (guide §11–12).
      const open = (a: Assignment) => !a.outcome;
      const currentCards = current.filter(open).map((a) => card(a, reasonOf.get(a.groupId) ?? ''));
      // Continue Learning: this week's cards for groups attempted before, most recent first.
      const cont = currentCards
        .filter((c) => lastAttempt.has(current.find((a) => a.id === c.id)!.groupId))
        .sort((x, y) => (lastAttempt.get(current.find((a) => a.id === y.id)!.groupId) ?? 0) - (lastAttempt.get(current.find((a) => a.id === x.id)!.groupId) ?? 0))
        .slice(0, settings.continueCount);
      const contIds = new Set(cont.map((c) => c.id));
      const titleOf = (activityId: string) => groups.flatMap((g) => g.difficulties).find((d) => d.activityId === activityId)!;
      result = {
        week: w,
        base: `Base ${base}`,
        nextRefresh: refreshDateFor(input.cycleStart, w, settings.resetDay),
        continue: cont,
        current: currentCards.filter((c) => !contIds.has(c.id)),
        pending: pending.filter(open).map((a) => {
          const last = assignments.filter((x) => x.groupId === a.groupId && x.week < w).pop();
          return card(a, last?.outcome === 'UNABLE' ? `Could not complete in week ${last.week}` : `Not done in week ${a.firstWeek}`);
        }),
        recent: history
          .filter((h) => h.outcome !== 'UNABLE')
          .slice(-settings.recent)
          .reverse()
          .map((h) => ({ name: titleOf(h.activityId).title, level: titleOf(h.activityId).difficulty, outcome: h.outcome })),
        adminOutcomes: history.map((h) => ({ name: titleOf(h.activityId).title, outcome: h.outcome, points: h.points })),
        gap,
        limitRule,
      };
    }
  }

  const unknown = input.outcomes.filter((o) => !known.has(o.assignmentId));
  if (unknown.length) throw new EngineError('Record outcomes only for activities shown in the preview.');
  return result!;
}
