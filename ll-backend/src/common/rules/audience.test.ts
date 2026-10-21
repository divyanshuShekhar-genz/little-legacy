import { describe, expect, it } from 'vitest';
import { parentMatches, type AudienceChild, type AudienceParent } from './audience';

const IN = 'region-in';
const EU = 'region-eu';
const child = (c: Partial<AudienceChild>): AudienceChild => ({ regionId: IN, age: 4, plan: 'FREE', level: null, ...c });
const parent = (p: Partial<AudienceParent>): AudienceParent => ({ countryCode: 'IN', children: [child({})], categoryIds: new Set(), ...p });

describe('notification audience (§17)', () => {
  it('no filters = all parents, including one with no children yet', () => {
    expect(parentMatches(parent({ children: [] }), {})).toBe(true);
  });

  it('a child filter needs a matching child', () => {
    expect(parentMatches(parent({ children: [] }), { age: 4 })).toBe(false);
    expect(parentMatches(parent({}), { age: 4 })).toBe(true);
    expect(parentMatches(parent({}), { age: 5 })).toBe(false);
  });

  it('filters combine with AND on the same child', () => {
    const p = parent({ children: [child({ age: 4, plan: 'FREE' }), child({ age: 5, plan: 'PLUS' })] });
    expect(parentMatches(p, { age: 5, plan: 'PLUS' })).toBe(true);
    // Age 4 matches one child and Plus the other, but no single child matches both.
    expect(parentMatches(p, { age: 4, plan: 'PLUS' })).toBe(false);
  });

  it('country is the parent’s; region is the child’s', () => {
    expect(parentMatches(parent({ countryCode: 'LK' }), { countryCodes: ['IN'] })).toBe(false);
    expect(parentMatches(parent({ countryCode: null }), { countryCodes: ['IN'] })).toBe(false);
    expect(parentMatches(parent({}), { regionIds: [EU] })).toBe(false);
    expect(parentMatches(parent({}), { regionIds: [IN, EU] })).toBe(true);
  });

  it('an area filter only matches children in that area’s region, at the chosen level', () => {
    const p = parent({ children: [child({ regionId: EU, level: 2 }), child({ regionId: IN, level: 2 })] });
    expect(parentMatches(p, { areaId: 'cognitive-in', level: 2 }, IN)).toBe(true);
    expect(parentMatches(p, { areaId: 'cognitive-in', level: 3 }, IN)).toBe(false);
    expect(parentMatches(parent({ children: [child({ regionId: EU, level: 2 })] }), { areaId: 'cognitive-in' }, IN)).toBe(false);
  });

  it('story and rhyme categories need recorded engagement or a favourite: never assumed', () => {
    expect(parentMatches(parent({}), { storyCategoryId: 'nature' })).toBe(false);
    const p = parent({ categoryIds: new Set(['nature', 'bedtime']) });
    expect(parentMatches(p, { storyCategoryId: 'nature', rhymeCategoryId: 'bedtime' })).toBe(true);
    expect(parentMatches(p, { storyCategoryId: 'nature', rhymeCategoryId: 'kindness' })).toBe(false);
  });
});
