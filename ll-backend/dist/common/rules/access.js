"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.planAllows = planAllows;
exports.canAccess = canAccess;
exports.countryCheck = countryCheck;
const domain_1 = require("./domain");
function planAllows(childPlan, minimumPlan) {
    return domain_1.PLAN_RANK[childPlan] >= domain_1.PLAN_RANK[minimumPlan];
}
function canAccess(i) {
    if (i.sectionBlockedInCountry || i.itemBlockedInCountry)
        return false;
    return planAllows(i.childPlan, i.minimumPlan) && i.childLevel >= i.requiredLevel;
}
function countryCheck(rules, countryCode, item) {
    if (!countryCode)
        return { status: 'COUNTRY_REQUIRED' };
    const isItem = item.type === 'ACTIVITY' || item.type === 'LEVEL';
    const match = rules.find((r) => r.enabled &&
        r.countryCode === countryCode &&
        ((r.type === item.type && (r.targetId ?? null) === (item.targetId ?? null)) || (isItem && r.type === 'ACTIVITIES_SECTION')));
    return match ? { status: 'BLOCKED', message: match.message } : { status: 'ALLOWED' };
}
//# sourceMappingURL=access.js.map