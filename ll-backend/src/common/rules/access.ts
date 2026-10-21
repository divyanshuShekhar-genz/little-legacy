import { PLAN_RANK, type PlanTier, type RestrictionType } from './domain';

/** Access gates (guide §9, §19, §21). Every gate must pass; none bypasses another. */

export interface AccessInput {
  childPlan: PlanTier;
  minimumPlan: PlanTier;
  childLevel: number;
  requiredLevel: number;
  sectionBlockedInCountry: boolean;
  itemBlockedInCountry: boolean;
}

export function planAllows(childPlan: PlanTier, minimumPlan: PlanTier): boolean {
  return PLAN_RANK[childPlan] >= PLAN_RANK[minimumPlan];
}

export function canAccess(i: AccessInput): boolean {
  if (i.sectionBlockedInCountry || i.itemBlockedInCountry) return false;
  return planAllows(i.childPlan, i.minimumPlan) && i.childLevel >= i.requiredLevel;
}

// ---- Country restrictions (guide §20) ----

export interface CountryRule {
  countryCode: string;
  type: RestrictionType;
  /** Activity or Level id for item rules; null for whole-section rules. */
  targetId: string | null;
  enabled: boolean;
  message: string;
}

export type CountryCheck =
  | { status: 'COUNTRY_REQUIRED' }
  | { status: 'BLOCKED'; message: string }
  | { status: 'ALLOWED' };

/**
 * Is `item` available in `countryCode`?
 * - No country known → COUNTRY_REQUIRED (never guess location from language, IP or currency).
 * - Any *enabled* matching rule blocks; a disabled rule never cancels another rule.
 * - A blocked section blocks every item inside it: ACTIVITY / LEVEL items also match an
 *   ACTIVITIES_SECTION rule.
 */
export function countryCheck(
  rules: CountryRule[],
  countryCode: string | null,
  item: { type: RestrictionType; targetId?: string | null },
): CountryCheck {
  if (!countryCode) return { status: 'COUNTRY_REQUIRED' };
  const isItem = item.type === 'ACTIVITY' || item.type === 'LEVEL';
  const match = rules.find(
    (r) =>
      r.enabled &&
      r.countryCode === countryCode &&
      ((r.type === item.type && (r.targetId ?? null) === (item.targetId ?? null)) || (isItem && r.type === 'ACTIVITIES_SECTION')),
  );
  return match ? { status: 'BLOCKED', message: match.message } : { status: 'ALLOWED' };
}
