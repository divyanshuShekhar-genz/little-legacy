import { describe, expect, it } from 'vitest';
import { toParentAccount, toParentChild } from './parent-views';

const day = (s: string) => new Date(`${s}T00:00:00Z`);
const region = { id: 'r1', name: 'Category 2', active: true, childFieldSettings: [] };

const account = {
  id: 'p1',
  name: 'Meera',
  email: 'meera@example.com',
  countryCode: 'IN',
  dob: day('1990-05-01'),
  phone: '+919876543210',
  language: 'en',
  passwordHash: '$2a$10$secret',
  googleId: 'google-sub-123',
  appleId: null,
  termsAcceptedAt: new Date('2026-10-28T10:00:00Z'),
  createdAt: new Date('2026-10-28T10:00:00Z'),
  country: { code: 'IN', name: 'India', currency: 'INR', learningRegionId: 'r1', learningRegion: region },
};

describe('toParentAccount', () => {
  it('never returns the password hash or provider ids', () => {
    const json = JSON.stringify(toParentAccount(account));
    expect(json).not.toContain('$2a$10$secret');
    expect(json).not.toContain('google-sub-123');
    expect(toParentAccount(account).linked).toEqual({ google: true, apple: false });
    expect(toParentAccount(account).hasPassword).toBe(true);
  });
  it('gives the category a new child would get, with its DOB switch', () => {
    expect(toParentAccount(account).childCategory).toEqual({ id: 'r1', name: 'Category 2', collectDob: true });
    const off = { ...account, country: { ...account.country, learningRegion: { ...region, childFieldSettings: [{ collected: false }] } } };
    expect(toParentAccount(off).childCategory?.collectDob).toBe(false);
  });
  it('has no category without a country, or when the country\'s category is inactive (CR2)', () => {
    expect(toParentAccount({ ...account, countryCode: null, country: null }).childCategory).toBeNull();
    const inactive = { ...account, country: { ...account.country, learningRegion: { ...region, active: false } } };
    expect(toParentAccount(inactive).childCategory).toBeNull();
  });
  it('lists the gaps of a Google / Apple account', () => {
    const social = { ...account, countryCode: null, country: null, dob: null, phone: null, termsAcceptedAt: null, passwordHash: null };
    expect(toParentAccount(social).missing).toEqual(['country', 'dob', 'phone', 'terms']);
  });
});

describe('toParentChild', () => {
  const child = {
    id: 'c1',
    name: 'Aria',
    gender: 'GIRL' as const,
    dob: day('2022-02-10'),
    dobEstimated: false,
    dobCorrectedAt: null,
    createdAt: new Date('2026-10-28T10:00:00Z'),
    region: { id: 'r1', name: 'Category 2', childFieldSettings: [] },
  };
  it('shows age in years and months and only the category id and name', () => {
    const v = toParentChild(child, day('2026-10-28'));
    expect(v.age).toEqual({ years: 4, months: 8 });
    expect(v.dob).toBe('2022-02-10');
    expect(v.category).toEqual({ id: 'r1', name: 'Category 2' });
    expect(v.canCorrectDob).toBe(true);
    expect(Object.keys(v)).not.toContain('dobCorrectedAt');
  });
  it('no more corrections after the one', () => {
    expect(toParentChild({ ...child, dobCorrectedAt: new Date() }).canCorrectDob).toBe(false);
  });
});
