/** Visibility rules for capped lists (guide §16, §22). */

/** Community: pinned posts are neither counted nor hidden by the regular-message limit. */
export function visibleCommunityPosts<T extends { pinned: boolean; approvedAt: Date }>(
  posts: T[],
  regularLimit: number,
): T[] {
  const pinned = posts.filter((p) => p.pinned);
  const regular = posts
    .filter((p) => !p.pinned)
    .sort((a, b) => b.approvedAt.getTime() - a.approvedAt.getTime())
    .slice(0, regularLimit);
  return [...pinned, ...regular];
}

/**
 * Parent checklist: new items take priority; remaining slots go to pending items, newest first.
 * The oldest pending items drop out of view first — they are NOT marked completed.
 */
export function visibleChecklist<T extends { week: number; pending: boolean }>(
  items: T[],
  limit: number,
): T[] {
  const fresh = items.filter((i) => !i.pending);
  const pending = items.filter((i) => i.pending).sort((a, b) => b.week - a.week);
  return [...fresh, ...pending].slice(0, limit);
}
