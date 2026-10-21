/** Moves one item to a new index (clamped to the list), leaving every other item in its order. */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  const target = Math.max(0, Math.min(list.length - 1, to));
  if (from === target || from < 0 || from >= list.length) return [...list];
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(target, 0, item!);
  return next;
}

/** Sets `position` from list order, starting at 1 (the number staff see and type). */
export const withPositions = <T extends { position: number }>(list: readonly T[]): T[] =>
  list.map((item, i) => (item.position === i + 1 ? item : { ...item, position: i + 1 }));
