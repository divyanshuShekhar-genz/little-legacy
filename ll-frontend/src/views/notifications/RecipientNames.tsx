import { useEffect, useState } from 'react';

/** How many names show before "and N more" (only when at least two would be hidden: "and 1 more" saves nothing). */
const FIRST = 3;

/**
 * Matching parents' names: the first few, then "and N more" with a "Show all" link (and
 * "Show fewer" back). Deliberate difference: the prototype lists every name, which doesn't scale
 * to a real audience. `total` is the exact count: the API lists at most 50 names, so "and N more"
 * and the expanded list count from it, not from the names given. `empty` shows when nobody matches.
 */
export function RecipientNames({ names, total = names.length, empty = '' }: { names: string[]; total?: number; empty?: string }) {
  const [all, setAll] = useState(false);
  // A new audience starts collapsed again.
  useEffect(() => setAll(false), [total]);

  if (!total) return <>{empty}</>;
  const extra = total - Math.min(FIRST, names.length);
  if (extra < 2 && total === names.length) return <>{names.join(', ')}</>;
  const unlisted = total - names.length;
  const toggle = (
    <button type="button" className="text-primary underline-offset-2 hover:underline" aria-expanded={all} onClick={() => setAll((v) => !v)}>
      {all ? 'Show fewer' : 'Show all'}
    </button>
  );
  return all ? (
    <>
      {names.join(', ')}
      {unlisted > 0 && ` and ${unlisted} more`} {toggle}
    </>
  ) : (
    <>
      {names.slice(0, FIRST).join(', ')} and {extra} more {toggle}
    </>
  );
}
