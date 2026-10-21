import { BadRequestException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import {
  childMatches,
  completedYears,
  contentAge,
  hasChildFilters,
  parentMatches,
  type AudienceChild,
  type AudienceFilters,
} from '../../common/rules';
import { childAreaLevels } from '../../common/utils/child-levels';
import type { CampaignFiltersDto } from './dto/campaign.dto';

type Db = Prisma.TransactionClient;

const FILTERS = 'Choose filters from the lists.';

/** The DTO as stored in Campaign.filters: empty lists and blanks left out, codes upper case, no duplicates. */
export function normalizeFilters(dto: CampaignFiltersDto | undefined): AudienceFilters {
  const f: AudienceFilters = {};
  if (!dto) return f;
  const list = (v?: string[], upper = false) => [...new Set((v ?? []).map((s) => (upper ? s.trim().toUpperCase() : s.trim())).filter(Boolean))];
  const regionIds = list(dto.regionIds);
  const countryCodes = list(dto.countryCodes, true);
  if (regionIds.length) f.regionIds = regionIds;
  if (countryCodes.length) f.countryCodes = countryCodes;
  if (dto.areaId) f.areaId = dto.areaId;
  if (dto.age !== undefined) f.age = dto.age;
  if (dto.level !== undefined) f.level = dto.level;
  if (dto.plan) f.plan = dto.plan;
  if (dto.storyCategoryId) f.storyCategoryId = dto.storyCategoryId;
  if (dto.rhymeCategoryId) f.rhymeCategoryId = dto.rhymeCategoryId;
  return f;
}

/**
 * Every filter must name something that exists ("Choose filters from the lists."): regions,
 * countries, a current area (inside the chosen region), a level of that area, an age group (of the
 * chosen region or area, else of any region), a story / rhyme category of the right kind.
 * Returns the area's region, which scopes the area and level filters.
 */
export async function checkFilters(db: Db, f: AudienceFilters): Promise<{ areaRegionId?: string }> {
  const fail = () => {
    throw new BadRequestException(FILTERS);
  };
  if (f.regionIds && (await db.learningRegion.count({ where: { id: { in: f.regionIds } } })) !== f.regionIds.length) fail();
  if (f.countryCodes && (await db.country.count({ where: { code: { in: f.countryCodes } } })) !== f.countryCodes.length) fail();
  if (f.level !== undefined && !f.areaId) fail();

  let areaRegionId: string | undefined;
  if (f.areaId) {
    const area = await db.developmentArea.findFirst({ where: { id: f.areaId, removedAt: null }, select: { regionId: true } });
    if (!area || (f.regionIds && !f.regionIds.includes(area.regionId))) fail();
    areaRegionId = area!.regionId;
    if (f.level !== undefined && !(await db.level.count({ where: { areaId: f.areaId, number: f.level } }))) fail();
  }
  if (f.age !== undefined) {
    const regions = areaRegionId ? [areaRegionId] : f.regionIds;
    if (!(await db.ageGroup.count({ where: { age: f.age, ...(regions ? { regionId: { in: regions } } : {}) } }))) fail();
  }
  if (f.storyCategoryId && !(await db.libraryCategory.count({ where: { id: f.storyCategoryId, kind: 'STORY' } }))) fail();
  if (f.rhymeCategoryId && !(await db.libraryCategory.count({ where: { id: f.rhymeCategoryId, kind: 'RHYME' } }))) fail();
  return { areaRegionId };
}

/** Recorded reading / listening in the category, or a favourite item in it. Never assumed. */
const engagedWith = (categoryId: string): Prisma.ParentWhereInput => ({
  OR: [{ engagement: { some: { categoryId } } }, { favorites: { some: { item: { categoryId } } } }],
});

/**
 * The parents a campaign reaches (API_REQUESTS #23, decisions 1–2, 8), by name. Country and the
 * category filters are narrowed in the database; the child filters (region, content age, current
 * plan, level in the area) are checked per child by `parentMatches()`, with levels worked out only
 * for children still in the running. Each parent appears once.
 */
export async function findAudience(db: Db, f: AudienceFilters, now = new Date()): Promise<{ id: string; name: string }[]> {
  const { areaRegionId } = await checkFilters(db, f);
  const childFilters = hasChildFilters(f);
  const regionIds = areaRegionId ? [areaRegionId] : f.regionIds;

  const and: Prisma.ParentWhereInput[] = [];
  if (f.countryCodes) and.push({ countryCode: { in: f.countryCodes } });
  if (f.storyCategoryId) and.push(engagedWith(f.storyCategoryId));
  if (f.rhymeCategoryId) and.push(engagedWith(f.rhymeCategoryId));

  const [parents, ageGroups] = await Promise.all([
    db.parent.findMany({
      where: { AND: and },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        name: true,
        countryCode: true,
        // Without child filters the children aren't needed ("All parents" includes those with none).
        children: {
          where: regionIds ? { regionId: { in: regionIds } } : {},
          ...(childFilters ? {} : { take: 0 }),
          select: {
            id: true,
            regionId: true,
            dob: true,
            // The current plan: the latest subscription running now (a trial is a Plus subscription); none = Free.
            subscriptions: { where: { startsAt: { lte: now }, OR: [{ endsAt: null }, { endsAt: { gt: now } }] }, orderBy: { startsAt: 'desc' }, take: 1, select: { plan: true } },
          },
        },
      },
    }),
    f.age !== undefined ? db.ageGroup.findMany({ select: { regionId: true, age: true } }) : Promise.resolve([]),
  ]);

  const agesByRegion = new Map<string, number[]>();
  for (const g of ageGroups) agesByRegion.set(g.regionId, [...(agesByRegion.get(g.regionId) ?? []), g.age]);

  const rows = parents.map((p) => ({
    ...p,
    children: p.children.map((c) => {
      const child: AudienceChild & { id: string } = {
        id: c.id,
        regionId: c.regionId,
        age: f.age !== undefined && c.dob ? contentAge(completedYears(c.dob, now), agesByRegion.get(c.regionId) ?? []) : null,
        plan: c.subscriptions[0]?.plan ?? 'FREE',
        level: null,
      };
      return child;
    }),
  }));

  // Levels only for children who match every other child filter, in one query for the area.
  if (f.areaId && f.level !== undefined) {
    const withoutLevel = { ...f, level: undefined };
    const ids = rows.flatMap((p) => p.children.filter((c) => childMatches(c, withoutLevel, areaRegionId)).map((c) => c.id));
    const levels = ids.length ? await childAreaLevels(db, f.areaId, ids) : new Map<string, { level: number }>();
    const candidates = new Set(ids);
    // A child with no earned level is on Level 1 (as on Overview).
    for (const p of rows) for (const c of p.children) if (candidates.has(c.id)) c.level = Math.max(1, levels.get(c.id)?.level ?? 0);
  }

  // Country and categories were already matched in the query above.
  const matched = new Set([f.storyCategoryId, f.rhymeCategoryId].filter((id): id is string => Boolean(id)));
  return rows.filter((p) => parentMatches({ countryCode: p.countryCode, children: p.children, categoryIds: matched }, f, areaRegionId)).map(({ id, name }) => ({ id, name }));
}
