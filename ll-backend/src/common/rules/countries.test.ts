import { describe, expect, it } from 'vitest';
import { isCountryCode, isCurrencyCode, parseCountryCodes, resolveRegionForCountry } from './countries';

describe('country codes (§20)', () => {
  it('accepts real two-letter codes, upper case only', () => {
    expect(isCountryCode('IN')).toBe(true);
    expect(isCountryCode('XK')).toBe(true);
    expect(isCountryCode('in')).toBe(false);
    expect(isCountryCode('IND')).toBe(false);
  });

  it('rejects unassigned codes and groups that are not countries', () => {
    expect(isCountryCode('QQ')).toBe(false);
    expect(isCountryCode('EU')).toBe(false);
    expect(isCountryCode('UN')).toBe(false);
  });

  it('parses "Country codes separated by spaces", dedupes and reports invalid ones', () => {
    expect(parseCountryCodes('in  lk, IN')).toEqual({ codes: ['IN', 'LK'], invalid: [] });
    expect(parseCountryCodes(['US', 'usa', 'QQ'])).toEqual({ codes: ['US'], invalid: ['USA', 'QQ'] });
    expect(parseCountryCodes('   ')).toEqual({ codes: [], invalid: [] });
  });
});

describe('currency codes (§20)', () => {
  it('accepts ISO 4217 codes, upper case only', () => {
    expect(isCurrencyCode('INR')).toBe(true);
    expect(isCurrencyCode('EUR')).toBe(true);
    expect(isCurrencyCode('inr')).toBe(false);
    expect(isCurrencyCode('ABC')).toBe(false);
  });
});

describe('region for a new child (§5, CP §1; no default category, Q8 / CR2)', () => {
  const regions = [
    { id: 'cat1', active: true },
    { id: 'cat3', active: false },
  ];

  it('uses the country\'s own region', () => {
    expect(resolveRegionForCountry('cat1', regions)?.id).toBe('cat1');
  });

  it('gives no region when the country has none: no fallback', () => {
    expect(resolveRegionForCountry(null, regions)).toBeNull();
  });

  it('gives no region when the country\'s region is inactive (Q19 interim)', () => {
    expect(resolveRegionForCountry('cat3', regions)).toBeNull();
  });

  it('gives no region when the country\'s region no longer exists', () => {
    expect(resolveRegionForCountry('gone', regions)).toBeNull();
  });
});
