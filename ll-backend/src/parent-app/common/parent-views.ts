import type { Prisma } from '@prisma/client';
import { ageOn, canCorrectDob, profileGaps, resolveRegionForCountry } from '../../common/rules';
import { DOB_FIELD } from '../../modules/regions/regions.service';

/**
 * The only shapes parents get for their account and children (decision 3, 2026-10-26). Built
 * field by field, so hashes, provider ids, admin data and anything added to the tables later
 * never leak by accident. Dates of birth are "YYYY-MM-DD".
 */

type Db = Prisma.TransactionClient;

const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

/** A category's "collect date of birth" switch (Q24); on unless turned off. */
const collectsDob = (settings: { collected: boolean }[]) => settings[0]?.collected ?? true;
const dobSetting = { where: { field: DOB_FIELD }, select: { collected: true } } as const;

const accountSelect = {
  id: true,
  name: true,
  email: true,
  countryCode: true,
  dob: true,
  phone: true,
  language: true,
  passwordHash: true,
  googleId: true,
  appleId: true,
  termsAcceptedAt: true,
  createdAt: true,
  country: {
    select: {
      code: true,
      name: true,
      currency: true,
      learningRegionId: true,
      learningRegion: { select: { id: true, name: true, active: true, childFieldSettings: dobSetting } },
    },
  },
} satisfies Prisma.ParentSelect;
type AccountRow = Prisma.ParentGetPayload<{ select: typeof accountSelect }>;

export function toParentAccount(p: AccountRow) {
  const region = p.country ? resolveRegionForCountry(p.country.learningRegionId, p.country.learningRegion ? [p.country.learningRegion] : []) : null;
  return {
    id: p.id,
    name: p.name,
    email: p.email,
    country: p.country ? { code: p.country.code, name: p.country.name, currency: p.country.currency } : null,
    dob: day(p.dob),
    phone: p.phone,
    language: p.language,
    hasPassword: Boolean(p.passwordHash),
    linked: { google: Boolean(p.googleId), apple: Boolean(p.appleId) },
    termsAcceptedAt: p.termsAcceptedAt?.toISOString() ?? null,
    /** What the parent still has to give (Google / Apple accounts start with gaps). */
    missing: profileGaps(p),
    /** The category a new child gets, from the parent's country; null = not available there yet. */
    childCategory: region ? { id: region.id, name: region.name, collectDob: collectsDob(region.childFieldSettings) } : null,
    createdAt: p.createdAt.toISOString(),
  };
}
export type ParentAccountView = ReturnType<typeof toParentAccount>;

export async function loadParentAccount(db: Db, parentId: string): Promise<ParentAccountView> {
  return toParentAccount(await db.parent.findUniqueOrThrow({ where: { id: parentId }, select: accountSelect }));
}

export const childSelect = {
  id: true,
  name: true,
  gender: true,
  dob: true,
  dobEstimated: true,
  dobCorrectedAt: true,
  createdAt: true,
  region: { select: { id: true, name: true, childFieldSettings: dobSetting } },
} satisfies Prisma.ChildSelect;
type ChildRow = Prisma.ChildGetPayload<{ select: typeof childSelect }>;

export function toParentChild(c: ChildRow, now = new Date()) {
  const collectDob = collectsDob(c.region.childFieldSettings);
  return {
    id: c.id,
    name: c.name,
    gender: c.gender,
    dob: day(c.dob),
    /** True when the date of birth was worked out from an age in years and months (Q24). */
    dobEstimated: c.dobEstimated,
    age: c.dob ? ageOn(c.dob, now) : null,
    /** Fixed when the child was added. */
    category: { id: c.region.id, name: c.region.name },
    /** Ask for a date of birth (true) or an age in years and months (false) when editing. */
    collectDob,
    canCorrectDob: canCorrectDob(c, collectDob),
    createdAt: c.createdAt.toISOString(),
  };
}
export type ParentChildView = ReturnType<typeof toParentChild>;
