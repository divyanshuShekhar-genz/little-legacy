/** Age rules (guide §6–7). Content is selected by completed years only. */

export interface AgeParts {
  years: number;
  months: number;
}

/** Years and whole months between date of birth and `on`. A child aged 4y 8m uses age-4 content. */
export function ageOn(dob: Date, on: Date = new Date()): AgeParts {
  let months = (on.getFullYear() - dob.getFullYear()) * 12 + (on.getMonth() - dob.getMonth());
  if (on.getDate() < dob.getDate()) months -= 1;
  months = Math.max(0, months);
  return { years: Math.floor(months / 12), months: months % 12 };
}

export function completedYears(dob: Date, on: Date = new Date()): number {
  return ageOn(dob, on).years;
}

/**
 * Content age to use. Above the highest supported age the child keeps the highest supported
 * content (the parent is informed separately). Null when no supported age applies — that is a
 * content gap, never a reason to silently serve another age's content.
 */
export function contentAge(years: number, supportedAges: number[]): number | null {
  const sorted = [...supportedAges].sort((a, b) => a - b);
  const max = sorted[sorted.length - 1];
  if (max === undefined) return null;
  if (sorted.includes(years)) return years;
  if (years > max) return max;
  return null;
}
