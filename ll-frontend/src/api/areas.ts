import { useMutation, useQueries, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { api } from './client';
import type { SaveMode } from '@/components/DecisionActions';
import type { SaveResult } from './community';

/**
 * Development areas and age groups, per regional learning category (docs/API_REQUESTS.md #5).
 * Reading: any signed-in admin. Writes: `developmentalMilestones`, through drafts.
 */
export interface DevelopmentArea {
  id: string;
  name: string;
  description: string | null;
  /** Display order. */
  position: number;
  /** activities = not withdrawn. */
  counts: { questions: number; categories: number; levels: number; activities: number };
}

export interface AgeGroup {
  id: string;
  age: number;
}

export const areaKeys = {
  list: (regionId: string | null) => ['areas', regionId] as const,
  ages: (regionId: string | null) => ['age-groups', regionId] as const,
};

/**
 * Everything an Activity Management write can change: counts on areas and categories, levels,
 * activities, questions, skills, assessment rules, progression, activity groups, the region's counts
 * and the drafts list.
 */
export function invalidateCatalogue(qc: QueryClient) {
  for (const key of ['areas', 'age-groups', 'categories', 'levels', 'activities', 'activity', 'questions', 'skills', 'assessment-rules', 'progression', 'activity-groups', 'regions', 'drafts']) {
    void qc.invalidateQueries({ queryKey: [key] });
  }
}

/** A write that refreshes the catalogue when it succeeds. */
export function useCatalogueMutation<T>(send: (input: T) => Promise<SaveResult>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: send, onSuccess: () => invalidateCatalogue(qc) });
}

export function useAreas(regionId: string | null) {
  return useQuery({
    queryKey: areaKeys.list(regionId),
    queryFn: async () => (await api.get<{ areas: DevelopmentArea[] }>('/areas', { params: { regionId } })).data.areas,
    enabled: Boolean(regionId),
  });
}

export const useSaveArea = () =>
  useCatalogueMutation(async ({ id, mode, regionId, name, description }: { id?: string; mode: SaveMode; regionId: string; name: string; description: string | null }) =>
    id
      ? (await api.patch<SaveResult>(`/areas/${id}`, { mode, name, description })).data
      : (await api.post<SaveResult>('/areas', { mode, regionId, name, description })).data,
  );

/** Deletes the area, or removes it (hidden, history kept) when children have used it. */
export const useDeleteArea = () => useCatalogueMutation(async ({ id, mode }: { id: string; mode: SaveMode }) => (await api.delete<SaveResult>(`/areas/${id}`, { data: { mode } })).data);

export function useAgeGroups(regionId: string | null) {
  return useQuery({
    queryKey: areaKeys.ages(regionId),
    queryFn: async () => (await api.get<{ ageGroups: AgeGroup[] }>('/age-groups', { params: { regionId } })).data.ageGroups,
    enabled: Boolean(regionId),
  });
}

/** Every age offered across several regions (e.g. the Notifications age filter with "All" categories), sorted. */
export function useAgesAcross(regionIds: string[]) {
  const results = useQueries({
    queries: regionIds.map((regionId) => ({
      queryKey: areaKeys.ages(regionId),
      queryFn: async () => (await api.get<{ ageGroups: AgeGroup[] }>('/age-groups', { params: { regionId } })).data.ageGroups,
    })),
  });
  return [...new Set(results.flatMap((r) => (r.data ?? []).map((g) => g.age)))].sort((a, b) => a - b);
}

/** Ages can only be added (no delete, as in the prototype). */
export const useAddAgeGroup = () =>
  useCatalogueMutation(async ({ mode, regionId, age }: { mode: SaveMode; regionId: string; age: number }) => (await api.post<SaveResult>('/age-groups', { mode, regionId, age })).data);
