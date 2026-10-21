/** Countries and regional learning categories (guide §5, §20; CP §1–2). */

const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
/** Two-letter codes that name a group, not a country. */
const NOT_COUNTRIES = new Set(['EU', 'EZ', 'UN', 'QO', 'ZZ']);
const CURRENCIES = new Set(Intl.supportedValuesOf('currency'));

/** A real ISO 3166-1 alpha-2 country code, upper case (e.g. "IN"; not "QQ", "EU" or "in"). */
export function isCountryCode(code: string): boolean {
  if (!/^[A-Z]{2}$/.test(code) || NOT_COUNTRIES.has(code)) return false;
  const name = regionNames.of(code);
  return name !== undefined && name !== code && name !== 'Unknown Region';
}

/** A current ISO 4217 currency code, upper case (e.g. "INR"). */
export function isCurrencyCode(code: string): boolean {
  return /^[A-Z]{3}$/.test(code) && CURRENCIES.has(code);
}

/**
 * Country codes as typed in "Country codes separated by spaces" (commas also accepted).
 * Upper-cases, removes duplicates and keeps the order. `invalid` lists anything that isn't a
 * real two-letter country code.
 */
export function parseCountryCodes(input: string | string[]): { codes: string[]; invalid: string[] } {
  const parts = (Array.isArray(input) ? input : [input])
    .flatMap((s) => s.split(/[\s,]+/))
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
  const codes = [...new Set(parts)];
  return { codes: codes.filter(isCountryCode), invalid: codes.filter((c) => !isCountryCode(c)) };
}

export interface RegionRef {
  id: string;
  isDefault: boolean;
  active: boolean;
}

/**
 * The learning region a NEW child in this country gets (CP §1; OPEN_QUESTIONS Q19 interim rule).
 * The country's own region if it has one and it is active; otherwise the default region.
 * A child's region is fixed at creation — never call this again for an existing child.
 */
export function resolveRegionForCountry<R extends RegionRef>(countryRegionId: string | null, regions: R[]): R | null {
  const own = countryRegionId ? regions.find((r) => r.id === countryRegionId) : undefined;
  if (own?.active) return own;
  return regions.find((r) => r.isDefault) ?? null;
}
