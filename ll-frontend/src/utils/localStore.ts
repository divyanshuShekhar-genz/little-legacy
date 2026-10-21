import { useCallback, useState, useSyncExternalStore } from 'react';

/**
 * In-memory state for screens that are UI only (no endpoint yet), behind hook-shaped functions so
 * connecting the API later swaps the hooks' insides, not the screens. Lasts until the page reloads.
 */
export function createLocalStore<S>(initial: S) {
  let state = initial;
  const listeners = new Set<() => void>();
  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };
  return {
    get: () => state,
    set(update: (s: S) => S) {
      state = update(state);
      listeners.forEach((l) => l());
    },
    useState: () => useSyncExternalStore(subscribe, () => state),
  };
}

/** A local read, shaped like a React Query result. */
export const localQuery = <T,>(data: T) => ({ data, isLoading: false, isError: false, error: null });

/** Wraps a local write so it reads like a React Query mutation (`mutateAsync`, `isPending`). */
export function useLocalMutation<I, R>(write: (input: I) => R) {
  const [isPending, setPending] = useState(false);
  const mutateAsync = useCallback(
    async (input: I) => {
      setPending(true);
      try {
        return write(input);
      } finally {
        setPending(false);
      }
    },
    [write],
  );
  return { mutateAsync, isPending };
}

/** The draft-workflow result, as the API returns it. */
export type LocalSaveResult = { status: 'published'; id: string } | { status: 'draft'; draftId: string };

export const localId = (prefix: string) => `new-${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
