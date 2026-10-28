"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasChildFilters = void 0;
exports.childMatches = childMatches;
exports.parentMatches = parentMatches;
const hasChildFilters = (f) => Boolean(f.regionIds?.length || f.areaId || f.age !== undefined || f.level !== undefined || f.plan || f.gender);
exports.hasChildFilters = hasChildFilters;
function childMatches(c, f, areaRegionId) {
    if (f.regionIds?.length && !f.regionIds.includes(c.regionId))
        return false;
    if (f.areaId && c.regionId !== areaRegionId)
        return false;
    if (f.age !== undefined && c.age !== f.age)
        return false;
    if (f.plan && c.plan !== f.plan)
        return false;
    if (f.gender && c.gender !== f.gender)
        return false;
    if (f.level !== undefined && c.level !== f.level)
        return false;
    return true;
}
function parentMatches(p, f, areaRegionId) {
    if (f.countryCodes?.length && (!p.countryCode || !f.countryCodes.includes(p.countryCode)))
        return false;
    if (f.storyCategoryId && !p.categoryIds.has(f.storyCategoryId))
        return false;
    if (f.rhymeCategoryId && !p.categoryIds.has(f.rhymeCategoryId))
        return false;
    if (!(0, exports.hasChildFilters)(f))
        return true;
    return p.children.some((c) => childMatches(c, f, areaRegionId));
}
//# sourceMappingURL=audience.js.map