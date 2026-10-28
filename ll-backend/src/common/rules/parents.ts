/** Parent accounts and child profiles in the parent app (docs/PARENT_API.md, Phase 1). */
import { ageOn, type AgeParts } from './age';

/** Languages a parent can choose at sign-up. Only English until the client names others (OPEN_QUESTIONS Q38). */
export const PARENT_LANGUAGES = [{ code: 'en', name: 'English' }] as const;
export type ParentLanguage = (typeof PARENT_LANGUAGES)[number]['code'];
export const isParentLanguage = (code: string): code is ParentLanguage => PARENT_LANGUAGES.some((l) => l.code === code);

/** The account holder must be an adult (interim rule, OPEN_QUESTIONS Q37). */
export const PARENT_MIN_AGE = 18;
export const PASSWORD_MIN_LENGTH = 8;

export const isAdult = (dob: Date, on: Date = new Date()) => ageOn(dob, on).years >= PARENT_MIN_AGE;

/** What a parent still has to give before the app is fully usable (Google / Apple accounts start with gaps). */
export type ProfileGap = 'country' | 'dob' | 'phone' | 'terms';

export function profileGaps(p: { countryCode: string | null; dob: Date | null; phone: string | null; termsAcceptedAt: Date | null }): ProfileGap[] {
  const gaps: ProfileGap[] = [];
  if (!p.countryCode) gaps.push('country');
  if (!p.dob) gaps.push('dob');
  if (!p.phone) gaps.push('phone');
  if (!p.termsAcceptedAt) gaps.push('terms');
  return gaps;
}

/** Gaps that stop a parent adding a child: the country picks the category; the terms must be accepted. */
export const blocksChildren = (gaps: ProfileGap[]) => gaps.filter((g) => g === 'country' || g === 'terms');

/**
 * The date of birth recorded when the category doesn't collect it (client answer Q24): the parent
 * gives years and months, and the child is that old today. Dates are UTC days.
 */
export function estimateDob(age: AgeParts, today: Date = new Date()): Date {
  const total = today.getUTCFullYear() * 12 + today.getUTCMonth() - (age.years * 12 + age.months);
  const year = Math.floor(total / 12);
  const month = total - year * 12;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(today.getUTCDate(), lastDay)));
}

export interface DobState {
  dobEstimated: boolean;
  dobCorrectedAt: Date | null;
}

/**
 * Changing a child's date of birth (guide §7: corrected once). Replacing an estimate with the real
 * date — possible once the category collects it — doesn't use up the correction.
 */
export function dobChange(child: DobState, newIsEstimate: boolean): { allowed: boolean; countsAsCorrection: boolean } {
  if (child.dobEstimated && !newIsEstimate) return { allowed: true, countsAsCorrection: false };
  if (child.dobCorrectedAt) return { allowed: false, countsAsCorrection: false };
  return { allowed: true, countsAsCorrection: true };
}

/** Whether the app should offer "Correct date of birth" (or age) for this child. */
export const canCorrectDob = (child: DobState, collectDob: boolean) =>
  dobChange(child, !collectDob).allowed;
