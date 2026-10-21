"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.earnedLevel = earnedLevel;
exports.areaLevel = areaLevel;
function earnedLevel({ score, mastered, storedLevel, levels }) {
    const reached = levels
        .filter((l) => score >= l.requiredScore && mastered >= l.requiredMastered)
        .map((l) => l.number);
    return Math.max(storedLevel, 0, ...reached);
}
function areaLevel({ score, mastered, ladders, stored }) {
    const storedMax = Math.max(0, ...stored);
    return Math.max(storedMax, ...ladders.map((levels) => earnedLevel({ score, mastered, storedLevel: 0, levels })));
}
//# sourceMappingURL=levels.js.map