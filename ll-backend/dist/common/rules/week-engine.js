"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EngineError = void 0;
exports.baseFor = baseFor;
exports.matchOverride = matchOverride;
exports.refreshDateFor = refreshDateFor;
exports.simulateWeek = simulateWeek;
const access_1 = require("./access");
const scoring_1 = require("./scoring");
class EngineError extends Error {
}
exports.EngineError = EngineError;
const DAY = 86_400_000;
function baseFor(score, questionnaireDone, bases) {
    if (!questionnaireDone)
        return 1;
    let base = 1;
    bases.forEach((b, i) => {
        if (score >= b.from)
            base = i + 1;
    });
    return base;
}
function matchOverride(overrides, key, areaOnly) {
    const matches = overrides.filter((o) => (o.age === 'All' || o.age === String(key.age)) &&
        (o.base === 'All' || o.base === `Base ${key.base}`) &&
        (o.plan === 'All' || o.plan === key.plan) &&
        (areaOnly ? key.areaId !== null && o.area === key.areaId : o.area === 'All' || o.area === key.areaId));
    const specificity = (o) => [o.age, o.base, o.area, o.plan].filter((v) => v !== 'All').length;
    return matches.reduce((best, o) => (!best || specificity(o) > specificity(best) ? o : best), undefined);
}
function refreshDateFor(cycleStart, week, resetDay) {
    if (resetDay === 'anniversary')
        return new Date(cycleStart.getTime() + week * 7 * DAY).toISOString().slice(0, 10);
    const target = Number(resetDay);
    let first = new Date(cycleStart.getTime() + DAY);
    while (first.getUTCDay() !== target)
        first = new Date(first.getTime() + DAY);
    return new Date(first.getTime() + (week - 1) * 7 * DAY).toISOString().slice(0, 10);
}
function simulateWeek(input) {
    const { settings, child } = input;
    const base = baseFor(child.score, child.questionnaireDone, settings.bases);
    const groups = input.groups.filter((g) => g.difficulties.length > 0);
    const outcomeById = new Map(input.outcomes.map((o) => [o.assignmentId, o.outcome]));
    const known = new Set();
    const assignments = [];
    const stage = new Map();
    const independent = new Map();
    const scored = new Map();
    const lastDone = new Map();
    const lastAttempt = new Map();
    const mandatoryCleared = new Set();
    const history = [];
    let lastWeekCompletions = 0;
    const startFor = (g) => matchOverride(settings.overrides, { age: child.age, base, areaId: g.areaId, plan: child.plan }, false)?.start ?? settings.bases[base - 1]?.start ?? 1;
    const mastered = (d) => (independent.get(d.activityId) ?? 0) >= d.masteryTarget;
    const eligible = (d) => d.published && !d.blockedInCountry && (0, access_1.planAllows)(child.plan, d.minimumPlan) && d.areaLevel !== null && d.areaLevel <= child.level;
    const offered = (g) => {
        let current = stage.get(g.id);
        if (current === 'done')
            return null;
        if (current === undefined) {
            const start = startFor(g);
            const atOrBelow = g.difficulties.filter((d) => d.difficulty <= start);
            current = (atOrBelow.length ? atOrBelow[atOrBelow.length - 1] : g.difficulties[0]).difficulty;
            stage.set(g.id, current);
        }
        const floor = Math.max(0, ...g.difficulties.filter(mastered).map((d) => d.difficulty));
        const options = g.difficulties.filter((d) => d.difficulty <= current && d.difficulty > floor && eligible(d) && !mastered(d));
        return options[options.length - 1] ?? null;
    };
    let result = null;
    for (let w = 1; w <= input.week; w++) {
        const pending = [];
        if (settings.pendingEnabled) {
            const latestByGroup = new Map();
            for (const a of assignments)
                if (a.week < w)
                    latestByGroup.set(a.groupId, a);
            const open = [...latestByGroup.values()]
                .filter((a) => !a.outcome || a.outcome === 'UNABLE')
                .filter((a) => settings.pendingDays === 0 || (w - a.firstWeek) * 7 <= settings.pendingDays)
                .sort((x, y) => y.week - x.week || x.groupId.localeCompare(y.groupId));
            for (const a of open) {
                if (pending.length >= settings.pendingLimit)
                    break;
                const g = groups.find((x) => x.id === a.groupId);
                const d = offered(g);
                if (!d)
                    continue;
                pending.push({ id: `${w}:${d.activityId}`, week: w, firstWeek: a.firstWeek, groupId: g.id, activityId: d.activityId });
            }
        }
        const totalOverride = matchOverride(settings.overrides, { age: child.age, base, areaId: null, plan: child.plan }, false);
        const weekly = totalOverride?.limit ?? settings.weekly;
        let limit = weekly;
        let limitRule = totalOverride ? `Allocation override: ${weekly} a week` : `Weekly limit: ${weekly}`;
        if (settings.maxVisible !== null) {
            limit = w === 1 ? Math.min(weekly, settings.maxVisible) : Math.min(lastWeekCompletions + 5, settings.maxVisible);
            limitRule = w === 1 ? `Week 1: ${weekly}, capped at ${settings.maxVisible}` : `Last week's ${lastWeekCompletions} completions + 5, capped at ${settings.maxVisible}`;
        }
        const capacity = Math.max(0, limit - (settings.pendingCounts ? pending.length : 0));
        const pendingGroups = new Set(pending.map((p) => p.groupId));
        const reasonOf = new Map();
        const pool = groups
            .filter((g) => g.age === child.age && (g.bases.length === 0 || g.bases.includes(base)) && !pendingGroups.has(g.id))
            .map((g) => ({ g, d: offered(g) }))
            .filter((x) => x.d !== null);
        const isMandatory = (g) => g.mandatory && !mandatoryCleared.has(g.id);
        const belowBenchmark = (g) => {
            const pct = g.skillId ? child.skills[g.skillId] : null;
            return pct !== null && pct !== undefined && pct < g.benchmark;
        };
        pool.sort((a, b) => Number(isMandatory(b.g)) - Number(isMandatory(a.g)) ||
            Number(belowBenchmark(b.g)) - Number(belowBenchmark(a.g)) ||
            (lastDone.get(a.g.id) ?? 0) - (lastDone.get(b.g.id) ?? 0) ||
            a.g.name.localeCompare(b.g.name));
        const current = [];
        const perArea = new Map();
        for (const { g, d } of pool) {
            if (current.length >= capacity)
                break;
            const cap = matchOverride(settings.overrides, { age: child.age, base, areaId: g.areaId, plan: child.plan }, true)?.limit;
            if (cap !== undefined && (perArea.get(g.areaId) ?? 0) >= cap)
                continue;
            perArea.set(g.areaId, (perArea.get(g.areaId) ?? 0) + 1);
            current.push({ id: `${w}:${d.activityId}`, week: w, firstWeek: w, groupId: g.id, activityId: d.activityId });
            const pct = g.skillId ? child.skills[g.skillId] : null;
            reasonOf.set(g.id, isMandatory(g)
                ? 'Mandatory during initial assessment'
                : belowBenchmark(g)
                    ? `${g.skillName ?? 'Skill'} ${pct}% is below the ${g.benchmark}% benchmark`
                    : lastDone.has(g.id)
                        ? `Least recently done (week ${lastDone.get(g.id)})`
                        : 'Not done yet');
        }
        const gap = Math.max(0, capacity - current.length);
        const thisWeek = [...pending, ...current];
        thisWeek.forEach((a) => known.add(a.id));
        assignments.push(...thisWeek);
        let completions = 0;
        for (const a of thisWeek) {
            const outcome = outcomeById.get(a.id);
            if (!outcome)
                continue;
            a.outcome = outcome;
            const g = groups.find((x) => x.id === a.groupId);
            const d = g.difficulties.find((x) => x.activityId === a.activityId);
            const prior = scored.get(d.activityId) ?? 0;
            const score = (0, scoring_1.scoreCompletion)(d.baseMarks, prior, outcome === 'UNABLE' ? 'NOT_COMPLETED' : outcome);
            if (score.scored)
                scored.set(d.activityId, prior + 1);
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
            }
            else if (outcome === 'UNABLE' && settings.reinforcement === 'easier') {
                const easier = g.difficulties.filter((x) => x.difficulty < d.difficulty && !mastered(x));
                if (easier.length)
                    stage.set(g.id, easier[easier.length - 1].difficulty);
            }
        }
        lastWeekCompletions = completions;
        if (w === input.week) {
            const card = (a, reason) => {
                const g = groups.find((x) => x.id === a.groupId);
                const d = g.difficulties.find((x) => x.activityId === a.activityId);
                return { id: a.id, activityId: d.activityId, name: d.title, difficulty: d.difficulty, reason: `${reason} · Difficulty ${d.difficulty}`, week: a.firstWeek };
            };
            const open = (a) => !a.outcome;
            const currentCards = current.filter(open).map((a) => card(a, reasonOf.get(a.groupId) ?? ''));
            const cont = currentCards
                .filter((c) => lastAttempt.has(current.find((a) => a.id === c.id).groupId))
                .sort((x, y) => (lastAttempt.get(current.find((a) => a.id === y.id).groupId) ?? 0) - (lastAttempt.get(current.find((a) => a.id === x.id).groupId) ?? 0))
                .slice(0, settings.continueCount);
            const contIds = new Set(cont.map((c) => c.id));
            const titleOf = (activityId) => groups.flatMap((g) => g.difficulties).find((d) => d.activityId === activityId);
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
    if (unknown.length)
        throw new EngineError('Record outcomes only for activities shown in the preview.');
    return result;
}
//# sourceMappingURL=week-engine.js.map