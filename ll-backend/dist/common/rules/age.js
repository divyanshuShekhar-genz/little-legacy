"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ageOn = ageOn;
exports.completedYears = completedYears;
exports.contentAge = contentAge;
function ageOn(dob, on = new Date()) {
    let months = (on.getFullYear() - dob.getFullYear()) * 12 + (on.getMonth() - dob.getMonth());
    if (on.getDate() < dob.getDate())
        months -= 1;
    months = Math.max(0, months);
    return { years: Math.floor(months / 12), months: months % 12 };
}
function completedYears(dob, on = new Date()) {
    return ageOn(dob, on).years;
}
function contentAge(years, supportedAges) {
    const sorted = [...supportedAges].sort((a, b) => a - b);
    const max = sorted[sorted.length - 1];
    if (max === undefined)
        return null;
    if (sorted.includes(years))
        return years;
    if (years > max)
        return max;
    return null;
}
//# sourceMappingURL=age.js.map