import { useMemo } from 'react';
import { useRegions } from '@/api/regions';
import { createLocalStore } from '@/utils/localStore';

/**
 * The regional learning category picked in the filter at the top of each Activity Management
 * card, shared by all the cards while the app is open. UI state only: the regions come from the
 * API (#4). Until someone picks one, the default category is used (then the first).
 */
const selection = createLocalStore<{ regionId: string | null }>({ regionId: null });

export const selectRegion = (regionId: string) => selection.set(() => ({ regionId }));

export function useSelectedRegion() {
  const { data: regions, isLoading, isError, error } = useRegions();
  const { regionId: picked } = selection.useState();
  const region = useMemo(
    () => regions?.find((r) => r.id === picked) ?? regions?.find((r) => r.isDefault) ?? regions?.[0] ?? null,
    [regions, picked],
  );
  return { regions: regions ?? [], region, regionId: region?.id ?? null, isLoading, isError, error };
}
