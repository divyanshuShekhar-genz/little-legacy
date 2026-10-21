"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.basePosition = exports.baseName = void 0;
exports.listGroups = listGroups;
const baseName = (position) => `Base ${position}`;
exports.baseName = baseName;
const basePosition = (name) => Number(/^Base ([1-3])$/.exec(name)?.[1] ?? NaN);
exports.basePosition = basePosition;
async function listGroups(db, regionId) {
    const groups = await db.activityFamily.findMany({
        where: { regionId, area: { removedAt: null } },
        include: {
            area: { select: { position: true } },
            activities: { where: { withdrawnAt: null }, orderBy: { difficultyLevel: 'asc' } },
        },
        orderBy: [{ area: { position: 'asc' } }, { age: 'asc' }, { name: 'asc' }],
    });
    return groups.map((g) => ({
        id: g.id,
        name: g.name,
        areaId: g.areaId,
        age: g.age,
        categoryId: g.categoryId,
        skillId: g.skillId,
        benchmark: g.benchmark,
        mandatory: g.mandatory,
        bases: [...g.baseEligibility].sort().map(exports.baseName),
        archived: g.archived,
        levels: g.activities.map((a) => ({
            id: a.id,
            level: a.difficultyLevel,
            title: a.title,
            mastery: a.masteryTarget,
            requiredPlan: a.minimumPlan,
            status: a.status,
        })),
    }));
}
//# sourceMappingURL=groups.query.js.map