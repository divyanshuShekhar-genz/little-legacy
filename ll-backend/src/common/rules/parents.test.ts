import { describe, expect, it } from 'vitest';
import { ageOn } from './age';
import { blocksChildren, canCorrectDob, dobChange, estimateDob, isAdult, isParentLanguage, profileGaps } from './parents';

const day = (s: string) => new Date(`${s}T00:00:00Z`);

describe('isAdult', () => {
  it('is 18 on the 18th birthday, not the day before', () => {
    expect(isAdult(day('2008-10-28'), day('2026-10-28'))).toBe(true);
    expect(isAdult(day('2008-10-29'), day('2026-10-28'))).toBe(false);
  });
});

describe('profileGaps', () => {
  const full = { countryCode: 'IN', dob: day('1990-01-01'), phone: '+919876543210', termsAcceptedAt: new Date() };
  it('is empty for a complete profile', () => expect(profileGaps(full)).toEqual([]));
  it('lists what a Google / Apple account still needs', () => {
    expect(profileGaps({ countryCode: null, dob: null, phone: null, termsAcceptedAt: null })).toEqual(['country', 'dob', 'phone', 'terms']);
  });
  it('only country and terms stop adding a child', () => {
    expect(blocksChildren(['dob', 'phone'])).toEqual([]);
    expect(blocksChildren(['country', 'dob', 'terms'])).toEqual(['country', 'terms']);
  });
});

describe('estimateDob (Q24: age in years and months)', () => {
  it('gives a child that is exactly that old today', () => {
    const today = day('2026-10-28');
    const dob = estimateDob({ years: 4, months: 8 }, today);
    expect(dob.toISOString().slice(0, 10)).toBe('2022-02-28');
    expect(ageOn(dob, today)).toEqual({ years: 4, months: 8 });
  });
  it('keeps the day inside a shorter month', () => {
    const today = day('2026-03-31');
    const dob = estimateDob({ years: 3, months: 1 }, today);
    expect(dob.toISOString().slice(0, 10)).toBe('2023-02-28');
    expect(ageOn(dob, today)).toEqual({ years: 3, months: 1 });
  });
  it('0 years 0 months is today', () => expect(estimateDob({ years: 0, months: 0 }, day('2026-10-28')).toISOString().slice(0, 10)).toBe('2026-10-28'));
});

describe('dobChange (corrected once, guide §7)', () => {
  const fresh = { dobEstimated: false, dobCorrectedAt: null };
  it('the first correction is allowed and counts', () => expect(dobChange(fresh, false)).toEqual({ allowed: true, countsAsCorrection: true }));
  it('a second correction is refused', () =>
    expect(dobChange({ dobEstimated: false, dobCorrectedAt: new Date() }, false)).toEqual({ allowed: false, countsAsCorrection: false }));
  it('replacing an estimate with the real date is free, even after a correction', () => {
    expect(dobChange({ dobEstimated: true, dobCorrectedAt: null }, false)).toEqual({ allowed: true, countsAsCorrection: false });
    expect(dobChange({ dobEstimated: true, dobCorrectedAt: new Date() }, false)).toEqual({ allowed: true, countsAsCorrection: false });
  });
  it('correcting an estimated age counts as the one correction', () => {
    expect(dobChange({ dobEstimated: true, dobCorrectedAt: null }, true)).toEqual({ allowed: true, countsAsCorrection: true });
    expect(dobChange({ dobEstimated: true, dobCorrectedAt: new Date() }, true).allowed).toBe(false);
  });
  it('canCorrectDob follows the category: a real date is offered when it collects the DOB', () => {
    const used = { dobEstimated: true, dobCorrectedAt: new Date() };
    expect(canCorrectDob(used, true)).toBe(true);
    expect(canCorrectDob(used, false)).toBe(false);
  });
});

describe('languages', () => {
  it('only English for now', () => {
    expect(isParentLanguage('en')).toBe(true);
    expect(isParentLanguage('fr')).toBe(false);
  });
});
