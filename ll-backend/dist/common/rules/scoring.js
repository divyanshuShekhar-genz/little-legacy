"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.availableAward = availableAward;
exports.scoreCompletion = scoreCompletion;
exports.isMastered = isMastered;
function availableAward(baseMarks, priorScoredCompletions) {
    return baseMarks / 2 ** priorScoredCompletions;
}
function scoreCompletion(baseMarks, priorScoredCompletions, outcome) {
    const available = availableAward(baseMarks, priorScoredCompletions);
    switch (outcome) {
        case 'INDEPENDENT':
            return { points: available, scored: true, countsTowardMastery: true, countsTowardWeekly: true };
        case 'WITH_HELP':
            return { points: available / 2, scored: true, countsTowardMastery: false, countsTowardWeekly: true };
        case 'NOT_COMPLETED':
            return { points: 0, scored: false, countsTowardMastery: false, countsTowardWeekly: false };
    }
}
function isMastered(independentCompletions, masteryTarget) {
    return independentCompletions >= masteryTarget;
}
//# sourceMappingURL=scoring.js.map