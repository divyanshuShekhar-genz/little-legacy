import { useQuery } from '@tanstack/react-query';
import { api } from './client';
import type { SaveMode } from '@/components/DecisionActions';
import type { PlanTier } from '@/constants/plans';
import type { SaveResult } from './community';
import { useCatalogueMutation } from './areas';

/**
 * Activities (docs/API_REQUESTS.md #7): the registry, a level's activity list, the editor and
 * View. Reading: any signed-in admin. Writes: `activities` or `developmentalMilestones`, through
 * drafts. "Availability" (status) decides whether children are offered it once the edit is live.
 * An activity can be one difficulty of an activity group (Activity Progression, #14): `group` +
 * `difficulty`. PATCH takes the whole activity, so an edit must send `groupId` and `difficulty` back,
 * or the activity leaves its group.
 */
export type SkillStage = 'STARTING' | 'PRACTISING' | 'CONFIDENT';
export const SKILL_STAGES: SkillStage[] = ['STARTING', 'PRACTISING', 'CONFIDENT'];
export type ActivityStatus = 'DRAFT' | 'PUBLISHED';

export interface ActivityRow {
  id: string;
  title: string;
  description: string;
  area: { id: string; name: string };
  category: { id: string; name: string } | null;
  level: { id: string; number: number } | null;
  age: number;
  durationMinutes: number;
  minimumPlan: PlanTier;
  baseMarks: number;
  masteryTarget: number;
  skill: { id: string; name: string } | null;
  skillStage: SkillStage;
  /** The activity group this is one difficulty of (Activity Progression), or null. */
  group: { id: string; name: string } | null;
  /** Its difficulty in the group (Level 1…N), or null when not grouped. */
  difficulty: number | null;
  status: ActivityStatus;
  counts: { steps: number; previews: number };
}

export interface ActivityStep {
  title: string;
  description: string;
}

/** A preview card: an uploaded image, a caption, or both. */
export interface ActivityPreview {
  imageUrl: string | null;
  caption: string | null;
}

export interface ActivityDetail extends Omit<ActivityRow, 'level' | 'counts'> {
  materials: string | null;
  level: { id: string; number: number; title: string | null } | null;
  steps: ActivityStep[];
  previews: ActivityPreview[];
  /** True once any child has done it: the area can't change, and Delete becomes Withdraw. */
  hasChildRecords: boolean;
}

/** The whole activity, as POST and PATCH take it. */
export interface ActivityInput {
  title: string;
  areaId: string;
  categoryId: string | null;
  levelId: string;
  age: number;
  durationMinutes: number;
  materials: string | null;
  description: string;
  minimumPlan: PlanTier;
  baseMarks: number;
  masteryTarget: number;
  skillId: string | null;
  skillStage: SkillStage;
  status: ActivityStatus;
  /** Send back unchanged when editing; null = not grouped. */
  groupId: string | null;
  /** Required with `groupId`. */
  difficulty: number | null;
  steps: ActivityStep[];
  previews: ActivityPreview[];
}

export interface ActivityFilters {
  regionId: string | null;
  areaId?: string;
  categoryId?: string;
  levelId?: string;
  age?: number;
}

/** Withdrawn activities are never listed. */
export function useActivities(filters: ActivityFilters, enabled = true) {
  return useQuery({
    queryKey: ['activities', filters],
    queryFn: async () => (await api.get<{ activities: ActivityRow[] }>('/activities', { params: filters })).data.activities,
    enabled: enabled && Boolean(filters.regionId),
  });
}

export function useActivity(id: string | null | undefined) {
  return useQuery({
    queryKey: ['activity', id],
    queryFn: async () => (await api.get<{ activity: ActivityDetail }>(`/activities/${id}`)).data.activity,
    enabled: Boolean(id),
  });
}

export const useSaveActivity = () =>
  useCatalogueMutation(async ({ id, mode, input }: { id?: string; mode: SaveMode; input: ActivityInput }) =>
    id ? (await api.patch<SaveResult>(`/activities/${id}`, { mode, ...input })).data : (await api.post<SaveResult>('/activities', { mode, ...input })).data,
  );

/**
 * "Remove from group" (Activity Progression): the activity leaves its group and stays as an
 * ordinary activity. PATCH takes the whole activity, so it is read first and sent back unchanged
 * except for `groupId` and `difficulty`. Needs `activities` or `developmentalMilestones`.
 */
export const useRemoveFromGroup = () =>
  useCatalogueMutation(async ({ id, mode }: { id: string; mode: SaveMode }) => {
    const a = (await api.get<{ activity: ActivityDetail }>(`/activities/${id}`)).data.activity;
    const input: ActivityInput = {
      title: a.title,
      areaId: a.area.id,
      categoryId: a.category?.id ?? null,
      levelId: a.level?.id ?? '',
      age: a.age,
      durationMinutes: a.durationMinutes,
      materials: a.materials,
      description: a.description,
      minimumPlan: a.minimumPlan,
      baseMarks: a.baseMarks,
      masteryTarget: a.masteryTarget,
      skillId: a.skill?.id ?? null,
      skillStage: a.skillStage,
      status: a.status,
      groupId: null,
      difficulty: null,
      steps: a.steps,
      previews: a.previews,
    };
    return (await api.patch<SaveResult>(`/activities/${id}`, { mode, ...input })).data;
  });

/** Deletes the activity, or withdraws it when children have done it (history and scores stay). */
export const useDeleteActivity = () =>
  useCatalogueMutation(async ({ id, mode }: { id: string; mode: SaveMode }) => (await api.delete<SaveResult>(`/activities/${id}`, { data: { mode } })).data);

/** Skills for the editor's "Primary skill" list (docs/API_REQUESTS.md #16; read by any signed-in admin). */
export { useSkills as useSkillOptions } from './skills';
