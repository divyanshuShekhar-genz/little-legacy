"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canCorrectDob = exports.blocksChildren = exports.isAdult = exports.PASSWORD_MIN_LENGTH = exports.PARENT_MIN_AGE = exports.isParentLanguage = exports.PARENT_LANGUAGES = void 0;
exports.profileGaps = profileGaps;
exports.estimateDob = estimateDob;
exports.dobChange = dobChange;
const age_1 = require("./age");
exports.PARENT_LANGUAGES = [{ code: 'en', name: 'English' }];
const isParentLanguage = (code) => exports.PARENT_LANGUAGES.some((l) => l.code === code);
exports.isParentLanguage = isParentLanguage;
exports.PARENT_MIN_AGE = 18;
exports.PASSWORD_MIN_LENGTH = 8;
const isAdult = (dob, on = new Date()) => (0, age_1.ageOn)(dob, on).years >= exports.PARENT_MIN_AGE;
exports.isAdult = isAdult;
function profileGaps(p) {
    const gaps = [];
    if (!p.countryCode)
        gaps.push('country');
    if (!p.dob)
        gaps.push('dob');
    if (!p.phone)
        gaps.push('phone');
    if (!p.termsAcceptedAt)
        gaps.push('terms');
    return gaps;
}
const blocksChildren = (gaps) => gaps.filter((g) => g === 'country' || g === 'terms');
exports.blocksChildren = blocksChildren;
function estimateDob(age, today = new Date()) {
    const total = today.getUTCFullYear() * 12 + today.getUTCMonth() - (age.years * 12 + age.months);
    const year = Math.floor(total / 12);
    const month = total - year * 12;
    const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    return new Date(Date.UTC(year, month, Math.min(today.getUTCDate(), lastDay)));
}
function dobChange(child, newIsEstimate) {
    if (child.dobEstimated && !newIsEstimate)
        return { allowed: true, countsAsCorrection: false };
    if (child.dobCorrectedAt)
        return { allowed: false, countsAsCorrection: false };
    return { allowed: true, countsAsCorrection: true };
}
const canCorrectDob = (child, collectDob) => dobChange(child, !collectDob).allowed;
exports.canCorrectDob = canCorrectDob;
//# sourceMappingURL=parents.js.map