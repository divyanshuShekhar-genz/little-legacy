"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isBelowExpected = exports.stageLabel = exports.SKILL_STAGES = void 0;
exports.stageFromAnswers = stageFromAnswers;
exports.stageFromOutcome = stageFromOutcome;
exports.skillPercent = skillPercent;
exports.weakestFirst = weakestFirst;
exports.ineligibleReason = ineligibleReason;
exports.selectSuggestions = selectSuggestions;
const access_1 = require("./access");
exports.SKILL_STAGES = ['STARTING', 'PRACTISING', 'CONFIDENT'];
const rank = (s) => exports.SKILL_STAGES.indexOf(s);
const clampStage = (i) => exports.SKILL_STAGES[Math.max(0, Math.min(exports.SKILL_STAGES.length - 1, i))];
const titleCase = (s) => s.charAt(0) + s.slice(1).toLowerCase();
const stageLabel = (s) => (s ? titleCase(s) : 'Unknown');
exports.stageLabel = stageLabel;
function stageFromAnswers(stages) {
    const known = stages.filter((s) => s !== null);
    return known.length ? clampStage(Math.min(...known.map(rank))) : null;
}
function stageFromOutcome(activityDifficulty, outcome) {
    const step = outcome === 'INDEPENDENT' ? 1 : outcome === 'NOT_COMPLETED' ? -1 : 0;
    return clampStage(rank(activityDifficulty) + step);
}
function skillPercent(answers) {
    const max = answers.reduce((s, a) => s + a.maxMarks, 0);
    if (!answers.length || max <= 0)
        return null;
    return Math.round((answers.reduce((s, a) => s + a.marks, 0) / max) * 10000) / 100;
}
const isBelowExpected = (e) => e.percent !== null && e.expected !== null && e.percent < e.expected;
exports.isBelowExpected = isBelowExpected;
function weakestFirst(evidence) {
    return [...evidence].sort((a, b) => Number((0, exports.isBelowExpected)(b)) - Number((0, exports.isBelowExpected)(a)) ||
        (a.stage === null ? 9 : rank(a.stage)) - (b.stage === null ? 9 : rank(b.stage)) ||
        (a.percent ?? 101) - (b.percent ?? 101) ||
        a.skill.localeCompare(b.skill));
}
function ineligibleReason(a, c) {
    if (a.areaId !== c.areaId)
        return 'Another development area';
    if (a.age !== c.age)
        return `For age ${a.age}`;
    if (a.withdrawn)
        return 'Withdrawn';
    if (!a.published)
        return 'Not published';
    if (!(0, access_1.planAllows)(c.plan, a.minimumPlan))
        return `Needs the ${titleCase(a.minimumPlan)} plan`;
    if (a.blockedInCountry)
        return "Not available in the child's country";
    if (a.levelNumber === null || a.levelNumber > c.level)
        return `Level ${a.levelNumber ?? '?'} not unlocked yet`;
    if (a.mastered)
        return 'Already mastered';
    if (a.attemptedThisWeek)
        return 'Already attempted this week';
    return null;
}
function selectSuggestions(evidence, eligible, mandatoryIds, ageForReason) {
    const suggestions = [];
    const gaps = [];
    for (const e of weakestFirst(evidence)) {
        if (!e.stage)
            continue;
        const stage = e.stage;
        const pick = eligible
            .filter((a) => a.skillId === e.skillId && !mandatoryIds.has(a.id) && rank(a.difficulty) <= rank(stage))
            .sort((x, y) => rank(y.difficulty) - rank(x.difficulty) || x.baseMarks - y.baseMarks || x.id.localeCompare(y.id))[0];
        if (!pick) {
            gaps.push({ skillId: e.skillId, skill: e.skill, reason: `No eligible ${(0, exports.stageLabel)(stage)}-or-easier activity for age ${ageForReason}` });
            continue;
        }
        const why = (0, exports.isBelowExpected)(e)
            ? `${e.skill} is ${(0, exports.stageLabel)(stage)}, below the expected ${e.expected}% for age ${ageForReason} (${e.percent}%) — more support first`
            : `${e.skill} is ${(0, exports.stageLabel)(stage)}`;
        suggestions.push({ activityId: pick.id, title: pick.title, skillId: e.skillId, skill: e.skill, reason: `${why}; hardest ${(0, exports.stageLabel)(pick.difficulty)} activity at or below that stage` });
    }
    return { suggestions, gaps };
}
//# sourceMappingURL=skills.js.map