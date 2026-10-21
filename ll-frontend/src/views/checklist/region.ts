import { useMemo, useState } from 'react';
import { useRegions } from '@/api/regions';

/**
 * The category filter on the Parent Checklist page: real categories, the default one selected first
 * (then the first). The selection is this page's own (Activity Management keeps its own).
 */
export function useChecklistRegion() {
  const { data: regions, isLoading, isError, error } = useRegions();
  const [picked, setPicked] = useState<string | null>(null);
  const region = useMemo(() => regions?.find((r) => r.id === picked) ?? regions?.find((r) => r.isDefault) ?? regions?.[0] ?? null, [regions, picked]);
  return { regions: regions ?? [], region, regionId: region?.id ?? null, select: setPicked, isLoading, isError, error };
}
