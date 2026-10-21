import type { Prisma } from '@prisma/client';

/** "Base 2" ↔ 2. Bases are stored as positions on ActivityFamily.baseEligibility. */
export const baseName = (position: number) => `Base ${position}`;
export const basePosition = (name: string) => Number(/^Base ([1-3])$/.exec(name)?.[1] ?? NaN);

/**
 * Activity groups of a region (API_REQUESTS #14 shape), each with its difficulty levels: activities
 * linked to the group (`familyId`), not withdrawn, in difficulty order. Archived groups included.
 * Shared by GET /api/activity-groups and the progression export.
 */
export async function listGroups(db: Prisma.TransactionClient, regionId: string) {
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
    bases: [...g.baseEligibility].sort().map(baseName),
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
