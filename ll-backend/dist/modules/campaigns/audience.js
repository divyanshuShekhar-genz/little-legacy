"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeFilters = normalizeFilters;
exports.checkFilters = checkFilters;
exports.findAudience = findAudience;
const common_1 = require("@nestjs/common");
const rules_1 = require("../../common/rules");
const child_levels_1 = require("../../common/utils/child-levels");
const FILTERS = 'Choose filters from the lists.';
function normalizeFilters(dto) {
    const f = {};
    if (!dto)
        return f;
    const list = (v, upper = false) => [...new Set((v ?? []).map((s) => (upper ? s.trim().toUpperCase() : s.trim())).filter(Boolean))];
    const regionIds = list(dto.regionIds);
    const countryCodes = list(dto.countryCodes, true);
    if (regionIds.length)
        f.regionIds = regionIds;
    if (countryCodes.length)
        f.countryCodes = countryCodes;
    if (dto.areaId)
        f.areaId = dto.areaId;
    if (dto.age !== undefined)
        f.age = dto.age;
    if (dto.level !== undefined)
        f.level = dto.level;
    if (dto.plan)
        f.plan = dto.plan;
    if (dto.storyCategoryId)
        f.storyCategoryId = dto.storyCategoryId;
    if (dto.rhymeCategoryId)
        f.rhymeCategoryId = dto.rhymeCategoryId;
    return f;
}
async function checkFilters(db, f) {
    const fail = () => {
        throw new common_1.BadRequestException(FILTERS);
    };
    if (f.regionIds && (await db.learningRegion.count({ where: { id: { in: f.regionIds } } })) !== f.regionIds.length)
        fail();
    if (f.countryCodes && (await db.country.count({ where: { code: { in: f.countryCodes } } })) !== f.countryCodes.length)
        fail();
    if (f.level !== undefined && !f.areaId)
        fail();
    let areaRegionId;
    if (f.areaId) {
        const area = await db.developmentArea.findFirst({ where: { id: f.areaId, removedAt: null }, select: { regionId: true } });
        if (!area || (f.regionIds && !f.regionIds.includes(area.regionId)))
            fail();
        areaRegionId = area.regionId;
        if (f.level !== undefined && !(await db.level.count({ where: { areaId: f.areaId, number: f.level } })))
            fail();
    }
    if (f.age !== undefined) {
        const regions = areaRegionId ? [areaRegionId] : f.regionIds;
        if (!(await db.ageGroup.count({ where: { age: f.age, ...(regions ? { regionId: { in: regions } } : {}) } })))
            fail();
    }
    if (f.storyCategoryId && !(await db.libraryCategory.count({ where: { id: f.storyCategoryId, kind: 'STORY' } })))
        fail();
    if (f.rhymeCategoryId && !(await db.libraryCategory.count({ where: { id: f.rhymeCategoryId, kind: 'RHYME' } })))
        fail();
    return { areaRegionId };
}
const engagedWith = (categoryId) => ({
    OR: [{ engagement: { some: { categoryId } } }, { favorites: { some: { item: { categoryId } } } }],
});
async function findAudience(db, f, now = new Date()) {
    const { areaRegionId } = await checkFilters(db, f);
    const childFilters = (0, rules_1.hasChildFilters)(f);
    const regionIds = areaRegionId ? [areaRegionId] : f.regionIds;
    const and = [];
    if (f.countryCodes)
        and.push({ countryCode: { in: f.countryCodes } });
    if (f.storyCategoryId)
        and.push(engagedWith(f.storyCategoryId));
    if (f.rhymeCategoryId)
        and.push(engagedWith(f.rhymeCategoryId));
    const [parents, ageGroups] = await Promise.all([
        db.parent.findMany({
            where: { AND: and },
            orderBy: [{ name: 'asc' }, { id: 'asc' }],
            select: {
                id: true,
                name: true,
                countryCode: true,
                children: {
                    where: regionIds ? { regionId: { in: regionIds } } : {},
                    ...(childFilters ? {} : { take: 0 }),
                    select: {
                        id: true,
                        regionId: true,
                        dob: true,
                        subscriptions: { where: { startsAt: { lte: now }, OR: [{ endsAt: null }, { endsAt: { gt: now } }] }, orderBy: { startsAt: 'desc' }, take: 1, select: { plan: true } },
                    },
                },
            },
        }),
        f.age !== undefined ? db.ageGroup.findMany({ select: { regionId: true, age: true } }) : Promise.resolve([]),
    ]);
    const agesByRegion = new Map();
    for (const g of ageGroups)
        agesByRegion.set(g.regionId, [...(agesByRegion.get(g.regionId) ?? []), g.age]);
    const rows = parents.map((p) => ({
        ...p,
        children: p.children.map((c) => {
            const child = {
                id: c.id,
                regionId: c.regionId,
                age: f.age !== undefined && c.dob ? (0, rules_1.contentAge)((0, rules_1.completedYears)(c.dob, now), agesByRegion.get(c.regionId) ?? []) : null,
                plan: c.subscriptions[0]?.plan ?? 'FREE',
                level: null,
            };
            return child;
        }),
    }));
    if (f.areaId && f.level !== undefined) {
        const withoutLevel = { ...f, level: undefined };
        const ids = rows.flatMap((p) => p.children.filter((c) => (0, rules_1.childMatches)(c, withoutLevel, areaRegionId)).map((c) => c.id));
        const levels = ids.length ? await (0, child_levels_1.childAreaLevels)(db, f.areaId, ids) : new Map();
        const candidates = new Set(ids);
        for (const p of rows)
            for (const c of p.children)
                if (candidates.has(c.id))
                    c.level = Math.max(1, levels.get(c.id)?.level ?? 0);
    }
    const matched = new Set([f.storyCategoryId, f.rhymeCategoryId].filter((id) => Boolean(id)));
    return rows.filter((p) => (0, rules_1.parentMatches)({ countryCode: p.countryCode, children: p.children, categoryIds: matched }, f, areaRegionId)).map(({ id, name }) => ({ id, name }));
}
//# sourceMappingURL=audience.js.map