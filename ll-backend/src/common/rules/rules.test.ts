import { describe, expect, it } from 'vitest';
import { ageOn, contentAge } from './age';
import { scoreCompletion } from './scoring';
import { largestRemainderPercents, weightAreas } from './weighting';
import { mandatoryRemains, mandatoryScoreTarget, nextWeekVisibleCount } from './weekly';
import { canAccess, countryCheck, type CountryRule } from './access';
import { visibleChecklist, visibleCommunityPosts } from './lists';
import { isPurchasable, orderStatusChange, orderTotal } from './commerce';

// Every case below is a worked example from the client guide.

describe('age (§6–7)', () => {
  it('4 years 8 months uses age-4 content', () => {
    expect(ageOn(new Date(2022, 0, 15), new Date(2026, 8, 20))).toEqual({ years: 4, months: 8 });
  });
  it('above the highest supported age keeps the highest content', () => {
    expect(contentAge(7, [3, 4, 5])).toBe(5);
  });
});

describe('scoring (§12)', () => {
  it('base 16: independent 16, helped 4, independent 4; two mastery completions', () => {
    const a = scoreCompletion(16, 0, 'INDEPENDENT');
    const b = scoreCompletion(16, 1, 'WITH_HELP');
    const c = scoreCompletion(16, 2, 'INDEPENDENT');
    expect([a.points, b.points, c.points]).toEqual([16, 4, 4]);
    expect([a, b, c].filter((r) => r.countsTowardMastery)).toHaveLength(2);
  });
  it('could not complete gives nothing and consumes no scored completion', () => {
    expect(scoreCompletion(16, 0, 'NOT_COMPLETED')).toMatchObject({ points: 0, scored: false });
  });
});

describe('weighting (§8)', () => {
  it('values 40,20 with weights 2,1 → shares 80/20, average 33.33', () => {
    const r = weightAreas([
      { value: 40, weight: 2 },
      { value: 20, weight: 1 },
    ]);
    expect(r?.shares).toEqual([80, 20]);
    expect(r?.weightedAverage).toBeCloseTo(33.33, 2);
  });
  it('all zero → not enough information', () => {
    expect(weightAreas([{ value: 0, weight: 1 }])).toBeNull();
  });
});

describe('mandatory + weekly refresh (§11)', () => {
  const scoreTarget = mandatoryScoreTarget([15, 25]);
  it('target is 40', () => expect(scoreTarget).toBe(40));
  it.each([
    [0, 0, true],
    [20, 1, true],
    [20, 3, false],
    [40, 2, false],
  ])('score %i, count %i → remains %s', (areaScore, completedCount, remains) => {
    expect(mandatoryRemains({ scoreTarget, requiredCount: 3, areaScore, completedCount })).toBe(remains);
  });
  it('10 completions → 15 next week, or 12 with an admin cap of 12', () => {
    expect(nextWeekVisibleCount(10, 20)).toBe(15);
    expect(nextWeekVisibleCount(10, 12)).toBe(12);
  });
});

describe('access gates (§9)', () => {
  const gate = {
    minimumPlan: 'PLUS',
    requiredLevel: 2,
    sectionBlockedInCountry: false,
    itemBlockedInCountry: false,
  } as const;
  it('Plus alone at Level 1 is not enough', () => {
    expect(canAccess({ ...gate, childPlan: 'PLUS', childLevel: 1 })).toBe(false);
  });
  it('Level 2 on Free is not enough', () => {
    expect(canAccess({ ...gate, childPlan: 'FREE', childLevel: 2 })).toBe(false);
  });
  it('both conditions met', () => {
    expect(canAccess({ ...gate, childPlan: 'PLUS', childLevel: 2 })).toBe(true);
  });
  it('a blocked section cannot be bypassed', () => {
    expect(canAccess({ ...gate, childPlan: 'PREMIUM', childLevel: 5, sectionBlockedInCountry: true })).toBe(false);
  });
});

describe('capped lists (§16, §22)', () => {
  it('regular limit 10 with 2 pinned shows 12', () => {
    const posts = Array.from({ length: 15 }, (_, i) => ({ pinned: i < 2, approvedAt: new Date(2026, 0, i + 1) }));
    expect(visibleCommunityPosts(posts, 10)).toHaveLength(12);
  });
  it('limit 5 with 4 new + 3 pending → 4 new + the newest pending', () => {
    const items = [
      ...[1, 2, 3, 4].map((n) => ({ id: `new${n}`, week: 2, pending: false })),
      { id: 'pending-a', week: 1, pending: true },
      { id: 'pending-b', week: 1, pending: true },
      { id: 'pending-newest', week: 1.5, pending: true },
    ];
    expect(visibleChecklist(items, 5).map((i) => i.id)).toEqual(['new1', 'new2', 'new3', 'new4', 'pending-newest']);
  });
});

describe('commerce (§20)', () => {
  it('two USD 12 kits + USD 3 delivery per order = USD 27', () => {
    expect(orderTotal([{ unitPrice: 12, quantity: 2 }], 3)).toEqual({ subtotal: 24, delivery: 3, total: 27 });
  });
  it('zero price is purchasable; missing price is not', () => {
    expect(isPurchasable(0)).toBe(true);
    expect(isPurchasable(null)).toBe(false);
  });
  it('open orders move freely; no stock change between open statuses', () => {
    expect(orderStatusChange('DELIVERED', 'PACKED')).toEqual({ allowed: true, restock: false });
    expect(orderStatusChange('PAID', 'DISPATCHED')).toEqual({ allowed: true, restock: false });
  });
  it('closing a Paid or Packed order restocks; a Dispatched or Delivered one does not', () => {
    expect(orderStatusChange('PAID', 'CANCELLED')).toEqual({ allowed: true, restock: true });
    expect(orderStatusChange('PACKED', 'REFUNDED')).toEqual({ allowed: true, restock: true });
    expect(orderStatusChange('DISPATCHED', 'CANCELLED')).toEqual({ allowed: true, restock: false });
    expect(orderStatusChange('DELIVERED', 'REFUNDED')).toEqual({ allowed: true, restock: false });
  });
  it('closed orders are final, except Cancelled → Refunded (no stock change)', () => {
    expect(orderStatusChange('CANCELLED', 'REFUNDED')).toEqual({ allowed: true, restock: false });
    expect(orderStatusChange('CANCELLED', 'PAID').allowed).toBe(false);
    expect(orderStatusChange('REFUNDED', 'CANCELLED').allowed).toBe(false);
    expect(orderStatusChange('REFUNDED', 'DELIVERED').allowed).toBe(false);
  });
});

describe('country restrictions (§20)', () => {
  const rule = (over: Partial<CountryRule>): CountryRule => ({ countryCode: 'LK', type: 'ECOMMERCE', targetId: null, enabled: true, message: 'Not available here.', ...over });
  it('India and Sri Lanka share a region, but Ecommerce can be blocked in Sri Lanka only', () => {
    const rules = [rule({})];
    expect(countryCheck(rules, 'LK', { type: 'ECOMMERCE' })).toEqual({ status: 'BLOCKED', message: 'Not available here.' });
    expect(countryCheck(rules, 'IN', { type: 'ECOMMERCE' })).toEqual({ status: 'ALLOWED' });
  });
  it('an unknown country is "country required", never guessed', () => {
    expect(countryCheck([rule({})], null, { type: 'ECOMMERCE' })).toEqual({ status: 'COUNTRY_REQUIRED' });
  });
  it('a disabled rule does not block and does not cancel an enabled one', () => {
    expect(countryCheck([rule({ enabled: false })], 'LK', { type: 'ECOMMERCE' }).status).toBe('ALLOWED');
    expect(countryCheck([rule({ enabled: false }), rule({ message: 'Blocked.' })], 'LK', { type: 'ECOMMERCE' }).status).toBe('BLOCKED');
  });
  it('a blocked Activities section blocks every activity, which cannot bypass it', () => {
    const rules = [rule({ type: 'ACTIVITIES_SECTION' })];
    expect(countryCheck(rules, 'LK', { type: 'ACTIVITY', targetId: 'colour-hunt' }).status).toBe('BLOCKED');
  });
  it('an item rule blocks only that item', () => {
    const rules = [rule({ type: 'ACTIVITY', targetId: 'colour-hunt' })];
    expect(countryCheck(rules, 'LK', { type: 'ACTIVITY', targetId: 'colour-hunt' }).status).toBe('BLOCKED');
    expect(countryCheck(rules, 'LK', { type: 'ACTIVITY', targetId: 'balance-trail' }).status).toBe('ALLOWED');
  });
});

describe('largestRemainderPercents (prototype distribution)', () => {
  it('the guide example: weighted values 80 and 20 → 80% / 20%', () => {
    expect(largestRemainderPercents([80, 20])).toEqual([80, 20]);
  });
  it('always totals exactly 100.00', () => {
    const shares = largestRemainderPercents([1, 1, 1])!;
    expect(shares).toEqual([33.34, 33.33, 33.33]);
    expect(Math.round(shares.reduce((s, v) => s + v, 0) * 100)).toBe(10000);
    const many = largestRemainderPercents([7, 13, 29, 3, 11])!;
    expect(Math.round(many.reduce((s, v) => s + v, 0) * 100)).toBe(10000);
  });
  it('all zeros → not enough assessment data', () => {
    expect(largestRemainderPercents([0, 0])).toBeNull();
  });
});
