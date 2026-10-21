export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

/** Marks as the prototype shows them: up to 4 decimals, no trailing zeros (16, 4, 2.5). */
export const formatMarks = (n: number) => Number(n.toFixed(4)).toString();

/** "2026-09-14 10:30", the prototype's record timestamp (local time). */
export const formatStamp = (iso: string) => {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

/** Active time as the prototype shows it: "4m 12s", or "Not recorded". */
export const formatDuration = (seconds: number | null) =>
  seconds === null ? 'Not recorded' : `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`;

/**
 * Money, everywhere in the panel: currency code first, with that currency's usual decimals
 * ("KES 250.00", "INR 499.00", "JPY 500"). Deliberately unlike the prototype's symbols ("$12.00"):
 * "$" is ambiguous across USD, AUD, CAD, SGD and others. Amounts are never converted.
 */
export function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('en', { style: 'currency', currency, currencyDisplay: 'code' }).format(amount).replace(/ /g, ' ');
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

/** "1 question", "3 questions", "1 category", "2 activities": a count with its noun. */
export function plural(n: number, singular: string, pluralForm?: string) {
  const many = pluralForm ?? (/[^aeiou]y$/.test(singular) ? `${singular.slice(0, -1)}ies` : `${singular}s`);
  return `${n} ${n === 1 ? singular : many}`;
}
