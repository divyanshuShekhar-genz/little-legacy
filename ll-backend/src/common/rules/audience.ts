import type { ChildGender, PlanTier } from './domain';

/**
 * Notification audiences (guide §18, PRODUCT_SPEC §17; API_REQUESTS #23). Every given filter must
 * match (AND); a filter left out means "All".
 */
export interface AudienceFilters {
  /** The child's regional learning category (fixed at creation). */
  regionIds?: string[];
  /** The parent's country. */
  countryCodes?: string[];
  areaId?: string;
  /** The child's content age: the age group whose content they get. */
  age?: number;
  /** The child's level in `areaId` (only with an area). */
  level?: number;
  /** The child's current plan (subscriptions are per child). */
  plan?: PlanTier;
  /** The child's gender (CR7). Children whose gender wasn't given never match. */
  gender?: ChildGender;
  storyCategoryId?: string;
  rhymeCategoryId?: string;
}

export interface AudienceChild {
  regionId: string;
  /** Content age; null when the child has no date of birth or no age group applies. */
  age: number | null;
  plan: PlanTier;
  gender: ChildGender | null;
  /** Level in the filter's area; null when it wasn't worked out (no area filter, or another region). */
  level: number | null;
}

export interface AudienceParent {
  countryCode: string | null;
  children: AudienceChild[];
  /** Library categories with recorded reading / listening, or a favourite item in them. Never assumed. */
  categoryIds: Set<string>;
}

/** True when the filters say anything about the child (a parent then needs a matching child). */
export const hasChildFilters = (f: AudienceFilters) =>
  Boolean(f.regionIds?.length || f.areaId || f.age !== undefined || f.level !== undefined || f.plan || f.gender);

/** One child against the child filters. With an area, the child must be in that area's region (`areaRegionId`). */
export function childMatches(c: AudienceChild, f: AudienceFilters, areaRegionId?: string): boolean {
  if (f.regionIds?.length && !f.regionIds.includes(c.regionId)) return false;
  if (f.areaId && c.regionId !== areaRegionId) return false;
  if (f.age !== undefined && c.age !== f.age) return false;
  if (f.plan && c.plan !== f.plan) return false;
  if (f.gender && c.gender !== f.gender) return false;
  if (f.level !== undefined && c.level !== f.level) return false;
  return true;
}

/**
 * A parent matches when they match the parent filters (country, story and rhyme categories) and —
 * if any child filter is given — at least one child matches all of them. With no child filters,
 * every parent counts, including one who hasn't added a child yet ("All parents"). However many
 * children match, the parent counts once.
 */
export function parentMatches(p: AudienceParent, f: AudienceFilters, areaRegionId?: string): boolean {
  if (f.countryCodes?.length && (!p.countryCode || !f.countryCodes.includes(p.countryCode))) return false;
  if (f.storyCategoryId && !p.categoryIds.has(f.storyCategoryId)) return false;
  if (f.rhymeCategoryId && !p.categoryIds.has(f.rhymeCategoryId)) return false;
  if (!hasChildFilters(f)) return true;
  return p.children.some((c) => childMatches(c, f, areaRegionId));
}
