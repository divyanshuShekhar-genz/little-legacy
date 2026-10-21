import { describe, expect, it } from 'vitest';
import { collectRefs } from './draft-refs';

const AREA = 'cmuzcx2kc00046qx9x33w3dyq';
const ACTIVITY = 'cmuzcx52d00209mfa01q4ywkq';
const OPTION = 'cmuzcx5210001c9mfa01q4ywkq';

describe('collectRefs (API_REQUESTS #19)', () => {
  it('finds ids in values, nested objects, arrays and object keys', () => {
    const rules = { areas: [{ areaId: AREA, formula: 'questionnaire + activity' }], mandatory: { '4': { [AREA]: [ACTIVITY] } } };
    const skillMap = { skillId: null, stages: { [OPTION]: 'STARTING' } };
    const refs = collectRefs([rules, skillMap]);
    expect([...refs.ids].sort()).toEqual([ACTIVITY, AREA, OPTION].sort());
  });
  it('finds country codes only under country keys', () => {
    const refs = collectRefs([{ countryCodes: ['IN', 'LK'], countryCode: 'US', code: 'JP', currency: 'JPY', plan: 'IN' }]);
    expect([...refs.countryCodes].sort()).toEqual(['IN', 'JP', 'LK', 'US']);
  });
  it('ignores ordinary text', () => {
    expect(collectRefs([{ title: 'Colour hunt', body: 'cats', mode: 'publish' }]).ids.size).toBe(0);
  });
});
