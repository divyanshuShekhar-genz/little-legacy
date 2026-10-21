import { useQueries, useQuery } from '@tanstack/react-query';
import { api } from './client';
import type { SaveMode } from '@/components/DecisionActions';
import type { SaveResult } from './community';
import { useCatalogueMutation } from './areas';

/**
 * Activity categories inside a development area (docs/API_REQUESTS.md #6). Optional: an area
 * with none keeps its levels directly. The first category takes over the area's levels and
 * activities. Writes: `developmentalMilestones`, through drafts.
 */
export interface ActivityCategory {
  id: string;
  name: string;
  description: string | null;
  counts: { levels: number; activities: number };
}

export function useCategories(areaId: string | null | undefined) {
  return useQuery({
    queryKey: ['categories', areaId],
    queryFn: async () => (await api.get<{ categories: ActivityCategory[] }>('/categories', { params: { areaId } })).data.categories,
    enabled: Boolean(areaId),
  });
}

/** Category names (id → name) across several areas, e.g. to label activity groups. */
export function useCategoryNames(areaIds: string[]) {
  const results = useQueries({
    queries: [...new Set(areaIds)].map((areaId) => ({
      queryKey: ['categories', areaId],
      queryFn: async () => (await api.get<{ categories: ActivityCategory[] }>('/categories', { params: { areaId } })).data.categories,
    })),
  });
  return Object.fromEntries(results.flatMap((r) => (r.data ?? []).map((c) => [c.id, c.name] as const))) as Record<string, string>;
}

export const useSaveCategory = () =>
  useCatalogueMutation(async ({ id, mode, areaId, name, description }: { id?: string; mode: SaveMode; areaId: string; name: string; description: string | null }) =>
    id
      ? (await api.patch<SaveResult>(`/categories/${id}`, { mode, name, description })).data
      : (await api.post<SaveResult>('/categories', { mode, areaId, name, description })).data,
  );

/** Deletes the category, or removes it (hidden, history kept) when children have used it. */
export const useDeleteCategory = () =>
  useCatalogueMutation(async ({ id, mode }: { id: string; mode: SaveMode }) => (await api.delete<SaveResult>(`/categories/${id}`, { data: { mode } })).data);
