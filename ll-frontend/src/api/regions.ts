import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import { draftKeys } from './drafts';
import { countryKeys } from './countries';
import type { SaveMode } from '@/components/DecisionActions';
import type { SaveResult } from './community';

/** A regional learning category (docs/API_REQUESTS.md #4). Writes are Super Admin only. */
export interface LearningRegion {
  id: string;
  name: string;
  /** Exactly one: countries in no category use it (OPEN_QUESTIONS Q8). */
  isDefault: boolean;
  /** Inactive categories are skipped for new children only (OPEN_QUESTIONS Q19). */
  active: boolean;
  countries: { code: string; name: string }[];
  counts: { areas: number; activities: number; children: number };
}

export interface RegionInput {
  name: string;
  /** The full new list; the API upper-cases and de-duplicates. */
  countryCodes: string[];
  active: boolean;
  /** Only `true` moves the default here; to unset it, make another category the default. */
  isDefault?: true;
}

export const regionKeys = { all: ['regions'] as const };

export function useRegions() {
  return useQuery({
    queryKey: regionKeys.all,
    queryFn: async () => (await api.get<{ regions: LearningRegion[] }>('/regions')).data.regions,
  });
}

function useRegionMutation<T>(send: (input: T) => Promise<SaveResult>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: send,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: regionKeys.all });
      qc.invalidateQueries({ queryKey: countryKeys.all }); // a country's category
      qc.invalidateQueries({ queryKey: draftKeys.all });
    },
  });
}

export const useSaveRegion = () =>
  useRegionMutation(async ({ id, mode, input }: { id?: string; mode: SaveMode; input: RegionInput }) =>
    id
      ? (await api.patch<SaveResult>(`/regions/${id}`, { mode, ...input })).data
      : // A new category can't be the default straight away (POST has no isDefault).
        (await api.post<SaveResult>('/regions', { mode, name: input.name, countryCodes: input.countryCodes, active: input.active })).data,
  );

export const useDeleteRegion = () =>
  useRegionMutation(async ({ id, mode }: { id: string; mode: SaveMode }) => (await api.delete<SaveResult>(`/regions/${id}`, { data: { mode } })).data);
