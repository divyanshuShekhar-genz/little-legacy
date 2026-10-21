import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import { draftKeys } from './drafts';
import type { SaveMode } from '@/components/DecisionActions';
import type { SaveResult } from './community';

/** One country (docs/API_REQUESTS.md #3). Prices are per country and never converted. */
export interface Country {
  code: string;
  name: string;
  currency: string;
  /** One charge per order, in the country's own currency. */
  deliveryCharge: number;
  deliveryEstimate: string | null;
  /** "Availability". */
  enabled: boolean;
  /** null = the default regional learning category applies. */
  learningRegion: { id: string; name: string } | null;
}

export interface CountryInput {
  name: string;
  code: string;
  currency: string;
  deliveryCharge: number;
  deliveryEstimate: string | null;
  enabled: boolean;
}

export const countryKeys = { all: ['countries'] as const };

export function useCountries() {
  return useQuery({
    queryKey: countryKeys.all,
    queryFn: async () => (await api.get<{ countries: Country[] }>('/countries')).data.countries,
  });
}

/** Add (no `code` yet) or edit. Code and currency can't change after creation. */
export function useSaveCountry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ code, mode, input }: { code?: string; mode: SaveMode; input: CountryInput }) =>
      code
        ? // Code and currency are fixed once created, so an edit doesn't send them.
          (await api.patch<SaveResult>(`/countries/${code}`, {
            mode,
            name: input.name,
            deliveryCharge: input.deliveryCharge,
            deliveryEstimate: input.deliveryEstimate,
            enabled: input.enabled,
          })).data
        : (await api.post<SaveResult & { notice?: string }>('/countries', { mode, ...input })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: countryKeys.all });
      qc.invalidateQueries({ queryKey: ['regions'] });
      qc.invalidateQueries({ queryKey: ['country-access'] });
      qc.invalidateQueries({ queryKey: draftKeys.all });
    },
  });
}
