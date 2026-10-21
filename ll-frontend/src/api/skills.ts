import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from './client';
import type { SaveMode } from '@/components/DecisionActions';
import type { PlanTier } from '@/constants/plans';
import type { SaveResult } from './community';
import { useCatalogueMutation } from './areas';

/**
 * Skill Personalisation (docs/API_REQUESTS.md #16). Reading skills: any signed-in admin (the
 * activity editor's "Primary skill" list uses it). Adding / editing skills and the selection
 * preview: `skillPersonalisation`. There is no skill delete. Mapping answers is in api/questions.ts
 * (`useSaveSkillMap`).
 */
export interface Skill {
  id: string;
  name: string;
  area: { id: string; name: string };
  /** Expected score (%) per age (guide §10), sorted by age. */
  expected: { age: number; expectedScore: number }[];
  /** What uses the skill. */
  counts: { questions: number; activities: number };
}

export function useSkills(regionId: string | null) {
  return useQuery({
    queryKey: ['skills', regionId],
    queryFn: async () => (await api.get<{ skills: Skill[] }>('/skills', { params: { regionId } })).data.skills,
    enabled: Boolean(regionId),
  });
}

/** `expected`, when sent, replaces the whole list. */
export const useSaveSkill = () =>
  useCatalogueMutation(
    async ({ id, mode, areaId, name, expected }: { id?: string; mode: SaveMode; areaId: string; name: string; expected: Skill['expected'] }) =>
      id
        ? (await api.patch<SaveResult>(`/skills/${id}`, { mode, areaId, name, expected })).data
        : (await api.post<SaveResult>('/skills', { mode, areaId, name, expected })).data,
  );

export type EvidenceStage = 'Unknown' | 'Starting' | 'Practising' | 'Confident';

/** "Preview child selection": a real child's suggestions in one area, and why. Saves nothing. */
export interface SelectionPreview {
  child: { id: string; name: string; years: number; age: number; plan: PlanTier; level: number };
  noAssessment: boolean;
  evidence: { skillId: string; skill: string; stage: EvidenceStage; percent: number | null; expected: number | null; belowExpected: boolean; source: string }[];
  mandatory: { activityId: string; title: string }[];
  suggestions: { activityId: string; title: string; skillId: string; skill: string; reason: string }[];
  gaps: { skillId: string; skill: string; reason: string }[];
  excluded: { activityId: string; title: string; reason: string }[];
}

export const useSelectionPreview = () =>
  useMutation({
    mutationFn: async (body: { childId: string; areaId: string; plan?: PlanTier }) => (await api.post<SelectionPreview>('/skills/preview', body)).data,
  });
