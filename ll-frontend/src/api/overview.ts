import { useQuery } from '@tanstack/react-query';
import { api } from './client';

export interface OverviewStats {
  childProfiles: number;
  activities: number;
  communityQueue: number;
  openEnquiries: number;
  childrenByLevel: { level: number; count: number }[];
}

export const overviewKeys = { all: ['overview'] as const };

export function useOverview() {
  return useQuery({
    queryKey: overviewKeys.all,
    queryFn: async () => (await api.get<OverviewStats>('/overview')).data,
  });
}
