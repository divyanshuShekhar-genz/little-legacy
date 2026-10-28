"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.childSelect = void 0;
exports.toParentAccount = toParentAccount;
exports.loadParentAccount = loadParentAccount;
exports.toParentChild = toParentChild;
const rules_1 = require("../../common/rules");
const regions_service_1 = require("../../modules/regions/regions.service");
const day = (d) => (d ? d.toISOString().slice(0, 10) : null);
const collectsDob = (settings) => settings[0]?.collected ?? true;
const dobSetting = { where: { field: regions_service_1.DOB_FIELD }, select: { collected: true } };
const accountSelect = {
    id: true,
    name: true,
    email: true,
    countryCode: true,
    dob: true,
    phone: true,
    language: true,
    passwordHash: true,
    googleId: true,
    appleId: true,
    termsAcceptedAt: true,
    createdAt: true,
    country: {
        select: {
            code: true,
            name: true,
            currency: true,
            learningRegionId: true,
            learningRegion: { select: { id: true, name: true, active: true, childFieldSettings: dobSetting } },
        },
    },
};
function toParentAccount(p) {
    const region = p.country ? (0, rules_1.resolveRegionForCountry)(p.country.learningRegionId, p.country.learningRegion ? [p.country.learningRegion] : []) : null;
    return {
        id: p.id,
        name: p.name,
        email: p.email,
        country: p.country ? { code: p.country.code, name: p.country.name, currency: p.country.currency } : null,
        dob: day(p.dob),
        phone: p.phone,
        language: p.language,
        hasPassword: Boolean(p.passwordHash),
        linked: { google: Boolean(p.googleId), apple: Boolean(p.appleId) },
        termsAcceptedAt: p.termsAcceptedAt?.toISOString() ?? null,
        missing: (0, rules_1.profileGaps)(p),
        childCategory: region ? { id: region.id, name: region.name, collectDob: collectsDob(region.childFieldSettings) } : null,
        createdAt: p.createdAt.toISOString(),
    };
}
async function loadParentAccount(db, parentId) {
    return toParentAccount(await db.parent.findUniqueOrThrow({ where: { id: parentId }, select: accountSelect }));
}
exports.childSelect = {
    id: true,
    name: true,
    gender: true,
    dob: true,
    dobEstimated: true,
    dobCorrectedAt: true,
    createdAt: true,
    region: { select: { id: true, name: true, childFieldSettings: dobSetting } },
};
function toParentChild(c, now = new Date()) {
    const collectDob = collectsDob(c.region.childFieldSettings);
    return {
        id: c.id,
        name: c.name,
        gender: c.gender,
        dob: day(c.dob),
        dobEstimated: c.dobEstimated,
        age: c.dob ? (0, rules_1.ageOn)(c.dob, now) : null,
        category: { id: c.region.id, name: c.region.name },
        collectDob,
        canCorrectDob: (0, rules_1.canCorrectDob)(c, collectDob),
        createdAt: c.createdAt.toISOString(),
    };
}
//# sourceMappingURL=parent-views.js.map