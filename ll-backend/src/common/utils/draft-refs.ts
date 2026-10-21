/**
 * Finds the references inside a draft (API_REQUESTS #19) so Draft approvals can show names instead
 * of ids: every value — and every object key — that looks like one of our cuids, anywhere in
 * `before` / `after` (e.g. `areaId`, mandatory picks keyed by area id, skill-map stages keyed by
 * option id), plus country codes under `countryCode`, `countryCodes` and a Country draft's `code`.
 * Generic on purpose: new draft types are covered without a list per type.
 */

/** Prisma cuid(): 'c' + lower-case letters and digits, 25 characters. */
const CUID = /^c[a-z0-9]{20,30}$/;
const COUNTRY = /^[A-Z]{2}$/;
const COUNTRY_KEYS = new Set(['countryCode', 'countryCodes', 'code']);

export interface DraftRefs {
  ids: Set<string>;
  countryCodes: Set<string>;
}

export function collectRefs(values: unknown[], refs: DraftRefs = { ids: new Set(), countryCodes: new Set() }): DraftRefs {
  const visit = (value: unknown, key: string | null) => {
    if (typeof value === 'string') {
      if (CUID.test(value)) refs.ids.add(value);
      else if (key && COUNTRY_KEYS.has(key) && COUNTRY.test(value)) refs.countryCodes.add(value);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((v) => visit(v, key)); // array items keep their key: countryCodes: ['IN', 'LK']
      return;
    }
    if (value && typeof value === 'object') {
      for (const [k, v] of Object.entries(value)) {
        if (CUID.test(k)) refs.ids.add(k);
        visit(v, k);
      }
    }
  };
  values.forEach((v) => visit(v, null));
  return refs;
}
