"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mandatoryScoreTarget = mandatoryScoreTarget;
exports.mandatoryRemains = mandatoryRemains;
exports.nextWeekVisibleCount = nextWeekVisibleCount;
exports.nextRefreshDate = nextRefreshDate;
function mandatoryScoreTarget(mandatoryBaseMarks) {
    return mandatoryBaseMarks.reduce((s, m) => s + m, 0);
}
function mandatoryRemains(c) {
    if (c.wholeSetCompleted)
        return false;
    return c.areaScore < c.scoreTarget && c.completedCount < c.requiredCount;
}
function nextWeekVisibleCount(completedLastWeek, adminCap) {
    return Math.min(completedLastWeek + 5, adminCap);
}
function nextRefreshDate(cycleStart) {
    const d = new Date(cycleStart);
    d.setDate(d.getDate() + 7);
    return d;
}
//# sourceMappingURL=weekly.js.map