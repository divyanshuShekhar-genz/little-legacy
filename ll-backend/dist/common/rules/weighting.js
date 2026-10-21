"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.weightAreas = weightAreas;
exports.largestRemainderPercents = largestRemainderPercents;
function weightAreas(areas) {
    const weighted = areas.map((a) => a.value * a.weight);
    const total = weighted.reduce((s, v) => s + v, 0);
    const totalWeight = areas.reduce((s, a) => s + a.weight, 0);
    if (total === 0 || totalWeight === 0)
        return null;
    return {
        weightedAverage: total / totalWeight,
        shares: weighted.map((v) => (v / total) * 100),
    };
}
function largestRemainderPercents(values, decimals = 2) {
    const total = values.reduce((s, v) => s + v, 0);
    if (!(total > 0))
        return null;
    const scale = 10 ** decimals;
    const exact = values.map((v) => (v / total) * 100 * scale);
    const floors = exact.map(Math.floor);
    let left = 100 * scale - floors.reduce((s, v) => s + v, 0);
    const order = exact.map((v, i) => ({ i, frac: v - Math.floor(v) })).sort((a, b) => b.frac - a.frac || a.i - b.i);
    for (const { i } of order) {
        if (left <= 0)
            break;
        floors[i]++;
        left--;
    }
    return floors.map((v) => v / scale);
}
//# sourceMappingURL=weighting.js.map