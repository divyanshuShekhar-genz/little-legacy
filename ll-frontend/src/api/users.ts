import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';

export interface RegisteredUserRow {
  parentId: string;
  parentName: string;
  email: string;
  childId: string | null;
  childName: string | null;
  /** Completed years; null when DOB is not collected. */
  age: number | null;
  registeredAt: string;
}

export interface UsersFilters {
  search: string;
  age: string;
}

export const userKeys = {
  list: (f: UsersFilters) => ['users', f] as const,
};

export function useRegisteredUsers(filters: UsersFilters) {
  return useQuery({
    queryKey: userKeys.list(filters),
    queryFn: async () =>
      (
        await api.get<{ rows: RegisteredUserRow[]; ages: number[] }>('/users', {
          params: { search: filters.search || undefined, age: filters.age || undefined },
        })
      ).data,
    // Keep the table on screen while a new search is fetched, so typing doesn't flash "Loading…".
    placeholderData: keepPreviousData,
  });
}
