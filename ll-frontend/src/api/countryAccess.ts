import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type { SaveMode } from '@/components/DecisionActions';

export type RestrictionType = 'ACTIVITIES_SECTION' | 'ACTIVITY' | 'LEVEL' | 'STORIES' | 'RHYMES' | 'COMMUNITY' | 'ECOMMERCE';

export interface CountryRestriction {
  id: string;
  countryCode: string;
  countryName: string;
  type: RestrictionType;
  targetId: string | null;
  targetName: string;
  message: string;
  enabled: boolean;
}

export interface CountryAccessData {
  countries: { code: string; name: string; enabled: boolean }[];
  /** The types this page (and admin) can manage, with their possible targets. */
  types: { type: RestrictionType; label: string; targets: { id: string | null; name: string }[] }[];
  restrictions: CountryRestriction[];
}

export interface RestrictionInput {
  countryCode: string;
  type: RestrictionType;
  targetId: string | null;
  message: string;
  enabled: boolean;
}

export type SaveResult = { status: 'published'; id: string } | { status: 'draft'; draftId: string };

export const countryAccessKeys = {
  list: (types: RestrictionType[]) => ['country-access', types] as const,
  preview: (country: string) => ['country-access', 'preview', country] as const,
  all: ['country-access'] as const,
};

export function useCountryAccess(types: RestrictionType[], enabled: boolean) {
  return useQuery({
    queryKey: countryAccessKeys.list(types),
    queryFn: async () => (await api.get<CountryAccessData>('/country-access', { params: { types: types.join(',') } })).data,
    enabled,
  });
}

export function useCountryPreview(country: string, enabled: boolean) {
  return useQuery({
    queryKey: countryAccessKeys.preview(country),
    queryFn: async () =>
      (await api.get<{ rows: { label: string; check: string; reason: string }[] }>('/country-access/preview', { params: { country: country || undefined } })).data.rows,
    enabled,
  });
}

export function useSaveRestriction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, mode, input }: { id?: string; mode: SaveMode; input: RestrictionInput }) =>
      id
        ? (await api.patch<SaveResult>(`/country-access/${id}`, { ...input, mode })).data
        : (await api.post<SaveResult>('/country-access', { ...input, mode })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: countryAccessKeys.all });
      qc.invalidateQueries({ queryKey: ['drafts'] });
    },
  });
}

export function useDeleteRestriction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete<SaveResult>(`/country-access/${id}`, { data: { mode: 'publish' } })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: countryAccessKeys.all });
      qc.invalidateQueries({ queryKey: ['drafts'] });
    },
  });
}
