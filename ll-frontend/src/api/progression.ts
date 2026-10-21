import { useMutation, useQuery } from '@tanstack/react-query';
import { api, downloadJson } from './client';
import type { SaveMode } from '@/components/DecisionActions';
import type { PlanTier } from '@/constants/plans';
import type { SaveResult } from './community';
import type { ActivityStatus } from './activities';
import { useCatalogueMutation } from './areas';

/**
 * Activity Progression per regional learning category (docs/API_REQUESTS.md #14): the Development
 * Bases, weekly settings and allocation overrides (one save), activity groups with their own
 * difficulties, the week preview and the export. Everything here needs `activityProgression`,
 * reading too. A group's difficulties are ordinary activities with `groupId` + `difficulty`, saved
 * through api/activities.ts (which needs `activities` or `developmentalMilestones`).
 */
export type BaseName = 'Base 1' | 'Base 2' | 'Base 3';
export const BASE_NAMES: BaseName[] = ['Base 1', 'Base 2', 'Base 3'];

/** An allocation override. 'All' matches anything; the most specific match wins, ties by order. */
export interface AllocationOverride {
  /** 'All' or an age group, e.g. '4'. */
  age: string;
  /** 'All' or a Base name. */
  base: string;
  /** 'All' or a development area id. */
  area: string;
  /** 'All' or a plan tier. */
  plan: string;
  limit: number;
  start: number;
}

export interface ProgressionSettings {
  /** Exactly 3: where each assessment range (%) starts, and its starting difficulty. */
  bases: { name: BaseName; from: number; start: number }[];
  /** New activities per week. */
  weekly: number;
  /** "Maximum visible activities": guide §11's cap on last week's completions + 5; null = not used (Q1). */
  maxVisible: number | null;
  pendingEnabled: boolean;
  pendingLimit: number;
  /** 0 = pending never expires. */
  pendingDays: number;
  pendingCounts: boolean;
  recent: number;
  continueCount: number;
  reinforcement: 'same' | 'easier';
  /** 'anniversary' or a UTC weekday '0' (Sunday) … '6'. */
  resetDay: string;
  overrides: AllocationOverride[];
}

export interface ActivityGroup {
  id: string;
  name: string;
  areaId: string;
  age: number;
  categoryId: string | null;
  skillId: string | null;
  /** Expected skill score (%): below it, the group is suggested first. */
  benchmark: number;
  mandatory: boolean;
  bases: BaseName[];
  archived: boolean;
  /** Its difficulties, in order (not withdrawn). */
  levels: { id: string; level: number; title: string; mastery: number; requiredPlan: PlanTier; status: ActivityStatus }[];
}

export type GroupInput = Omit<ActivityGroup, 'id' | 'archived' | 'levels'>;

export type PreviewOutcome = 'INDEPENDENT' | 'WITH_HELP' | 'UNABLE';

export interface PreviewCard {
  /** "<week>:<activityId>": the assignment id outcomes refer to. */
  id: string;
  activityId: string;
  name: string;
  difficulty: number;
  reason: string;
  /** The week it was first assigned (for pending cards). */
  week: number;
}

export interface WeekPreview {
  week: number;
  base: string;
  nextRefresh: string;
  continue: PreviewCard[];
  current: PreviewCard[];
  pending: PreviewCard[];
  recent: { name: string; level: number; outcome: PreviewOutcome }[];
  adminOutcomes: { name: string; outcome: PreviewOutcome; points: number }[];
  /** Places the pool couldn't fill. */
  gap: number;
  /** Which weekly rule applied, e.g. "Weekly limit: 20". */
  limitRule: string;
}

export interface WeekPreviewInput {
  age: number;
  plan: PlanTier;
  questionnaire: 'COMPLETED' | 'NOT_SUBMITTED';
  score: number;
  /** null = "Unknown / not provided": country-restricted content is never offered. */
  country: string | null;
  /** The sample child's unlocked area Level (default 1). */
  level: number;
  skills: Record<string, number | null>;
  week: number;
  /** Every outcome recorded so far: the server replays from week 1 and stores nothing. */
  outcomes: { assignmentId: string; outcome: PreviewOutcome }[];
}

export function useProgression(regionId: string | null) {
  return useQuery({
    queryKey: ['progression', regionId],
    queryFn: async () => (await api.get<ProgressionSettings>('/progression', { params: { regionId } })).data,
    enabled: Boolean(regionId),
  });
}

/** Saves the Bases, weekly settings and overrides together. */
export const useSaveProgression = () =>
  useCatalogueMutation(async ({ regionId, mode, settings }: { regionId: string; mode: SaveMode; settings: ProgressionSettings }) =>
    (await api.put<SaveResult>('/progression', { mode, ...settings }, { params: { regionId } })).data,
  );

export function useActivityGroups(regionId: string | null) {
  return useQuery({
    queryKey: ['activity-groups', regionId],
    queryFn: async () => (await api.get<{ rows: ActivityGroup[] }>('/activity-groups', { params: { regionId } })).data.rows,
    enabled: Boolean(regionId),
  });
}

export const useSaveGroup = () =>
  useCatalogueMutation(async ({ id, mode, input }: { id?: string; mode: SaveMode; input: GroupInput }) =>
    id ? (await api.patch<SaveResult>(`/activity-groups/${id}`, { mode, ...input })).data : (await api.post<SaveResult>('/activity-groups', { mode, ...input })).data,
  );

/** Removes the group from future assignments; earned scores and history stay. */
export const useArchiveGroup = () =>
  useCatalogueMutation(async ({ id, mode }: { id: string; mode: SaveMode }) => (await api.post<SaveResult>(`/activity-groups/${id}/archive`, { mode })).data);

/** An ungrouped activity (same area, category, age) joins the group; its Level number becomes its difficulty. */
export const useLinkActivity = () =>
  useCatalogueMutation(async ({ id, mode, activityId }: { id: string; mode: SaveMode; activityId: string }) =>
    (await api.post<SaveResult>(`/activity-groups/${id}/link`, { mode, activityId })).data,
  );

/** "Preview a child's week": the server's weekly allocation on a sample child. Saves nothing. */
export const useWeekPreview = () =>
  useMutation({
    mutationFn: async ({ regionId, input }: { regionId: string; input: WeekPreviewInput }) =>
      (await api.post<WeekPreview>('/progression/preview', input, { params: { regionId } })).data,
  });

/** "Export progression rules": the region's settings and groups as a JSON download (audited). */
export const exportProgression = (regionId: string) =>
  downloadJson(`/progression/export?regionId=${encodeURIComponent(regionId)}`, 'little-legacy-activity-progression.json');
