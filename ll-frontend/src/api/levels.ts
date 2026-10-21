import { useQueries, useQuery } from '@tanstack/react-query';
import { api } from './client';
import type { SaveMode } from '@/components/DecisionActions';
import type { SaveResult } from './community';
import { useCatalogueMutation } from './areas';

/**
 * Area levels (docs/API_REQUESTS.md #6): a score and a count of activities with repetitions complete
 * (`requiredMastered`) unlock each one.
 * They live on the area (no categories) or on one category, and are shared by all ages; the age
 * only changes `activityCount`. "Level" means an area level, never a per-activity difficulty (Q2).
 * Writes: `developmentalMilestones` or `questionnairesLevels`, through drafts.
 */
export const LEVEL_ICONS = ['Brain', 'Smile', 'Moon', 'Target', 'Footprints', 'Palette', 'Heart', 'Users', 'Eye', 'Lightbulb'] as const;
export type LevelIcon = (typeof LEVEL_ICONS)[number];

export interface AreaLevel {
  id: string;
  number: number;
  title: string | null;
  icon: LevelIcon | null;
  /** #RRGGBB */
  iconColor: string;
  requiredScore: number;
  requiredMastered: number;
  /** Activities on the level (for the age asked for, if any). */
  activityCount: number;
}

/** The colour a level shows when none is stored (the API returns it for those levels). */
export const DEFAULT_LEVEL_COLOUR = '#5B4DB4';

export interface LevelInput {
  number: number;
  title: string | null;
  /** Editing: left out = unchanged, so a level without an icon or colour keeps none (drafts show real changes only). */
  icon?: LevelIcon | null;
  iconColor?: string;
  requiredScore: number;
  requiredMastered: number;
}

export interface LevelQuery {
  areaId: string | null | undefined;
  /** null = the area's own levels (it has no categories). */
  categoryId?: string | null;
  age?: number;
}

export function useLevels({ areaId, categoryId, age }: LevelQuery) {
  return useQuery({
    queryKey: ['levels', areaId, categoryId ?? null, age ?? null],
    queryFn: async () =>
      (await api.get<{ levels: AreaLevel[]; nextNumber: number }>('/levels', { params: { areaId, categoryId: categoryId ?? undefined, age } })).data,
    enabled: Boolean(areaId),
  });
}

export const useSaveLevel = () =>
  useCatalogueMutation(async ({ id, mode, areaId, categoryId, input }: { id?: string; mode: SaveMode; areaId: string; categoryId: string | null; input: LevelInput }) =>
    id
      ? (await api.patch<SaveResult>(`/levels/${id}`, { mode, ...input })).data
      : (await api.post<SaveResult>('/levels', { mode, areaId, categoryId, ...input })).data,
  );

/** Refused while activities still use the level ("Move or remove this level's activities first."). */
export const useDeleteLevel = () => useCatalogueMutation(async ({ id, mode }: { id: string; mode: SaveMode }) => (await api.delete<SaveResult>(`/levels/${id}`, { data: { mode } })).data);

/**
 * Every level of an area: its own ladder, or one ladder per category (Questionnaires & Levels →
 * level requirements). Each row says which category it belongs to.
 */
export function useAreaLevels(areaId: string | null, categories: { id: string; name: string }[] | undefined) {
  const ladders = categories?.length ? categories.map((c) => ({ id: c.id, name: c.name })) : [{ id: null, name: null }];
  const results = useQueries({
    queries: (areaId && categories ? ladders : []).map((ladder) => ({
      queryKey: ['levels', areaId, ladder.id, null],
      queryFn: async () => (await api.get<{ levels: AreaLevel[]; nextNumber: number }>('/levels', { params: { areaId, categoryId: ladder.id ?? undefined } })).data,
    })),
  });
  const rows = results.flatMap((r, i) => (r.data?.levels ?? []).map((level) => ({ ...level, category: ladders[i]!.id ? { id: ladders[i]!.id!, name: ladders[i]!.name! } : null })));
  return {
    data: rows,
    isLoading: !categories || results.some((r) => r.isLoading),
    error: results.find((r) => r.error)?.error ?? null,
  };
}
