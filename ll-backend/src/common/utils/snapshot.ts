/**
 * Compares a live entity snapshot with the `before` JSON stored on a draft (modules/drafts/drafts.service.ts).
 * PostgreSQL `jsonb` re-orders object keys on save, and Dates come back as ISO strings, so the
 * comparison uses a canonical form — never raw JSON.stringify of both sides.
 */
export function sameSnapshot(a: unknown, b: unknown): boolean {
  return canonical(a) === canonical(b);
}

function canonical(value: unknown): string {
  const sort = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(sort);
    if (v && typeof v === 'object') {
      return Object.fromEntries(
        Object.keys(v)
          .sort()
          .map((k) => [k, sort((v as Record<string, unknown>)[k])]),
      );
    }
    return v;
  };
  // Round-trip first so Dates and undefined normalise exactly as they were stored.
  return JSON.stringify(sort(JSON.parse(JSON.stringify(value ?? null))));
}
