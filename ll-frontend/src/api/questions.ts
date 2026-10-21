import { useQuery } from '@tanstack/react-query';
import { api } from './client';
import type { SaveMode } from '@/components/DecisionActions';
import type { SaveResult } from './community';
import type { SkillStage } from './activities';
import { useCatalogueMutation } from './areas';

/**
 * Questionnaire questions (docs/API_REQUESTS.md #8). ADMIN API: difficulty and marks are admin-only
 * and never reach parents. Reading: any signed-in admin. Writes: `questionnairesLevels` or
 * `developmentalMilestones`, through drafts. "Map answers" (#16) needs `skillPersonalisation`.
 */
export type QuestionDifficulty = 'EASY' | 'MEDIUM' | 'HARD';
export const QUESTION_DIFFICULTIES: QuestionDifficulty[] = ['EASY', 'MEDIUM', 'HARD'];

export interface QuestionOption {
  id: string;
  label: string;
  marks: number;
  /** The stage this answer indicates for the question's skill (Skill Personalisation); null = Unknown. */
  skillStage: SkillStage | null;
}

export interface Question {
  id: string;
  area: { id: string; name: string };
  text: string;
  difficulty: QuestionDifficulty;
  /** null = all supported ages. */
  age: number | null;
  position: number;
  skill: { id: string; name: string } | null;
  options: QuestionOption[];
}

/** The whole question, as POST and PATCH take it. An option keeps its `id` when edited; new ones have none. */
export interface QuestionInput {
  text: string;
  difficulty: QuestionDifficulty;
  age: number | null;
  options: { id?: string; label: string; marks: number }[];
}

/** One area's questions, or (with `regionId`) every current area's, in order. */
export function useQuestions(scope: { areaId?: string | null; regionId?: string | null }) {
  const params = scope.areaId ? { areaId: scope.areaId } : { regionId: scope.regionId };
  return useQuery({
    queryKey: ['questions', params],
    queryFn: async () => (await api.get<{ questions: Question[] }>('/questions', { params })).data.questions,
    enabled: Boolean(scope.areaId || scope.regionId),
  });
}

export const useSaveQuestion = () =>
  useCatalogueMutation(async ({ id, mode, areaId, input }: { id?: string; mode: SaveMode; areaId: string; input: QuestionInput }) =>
    id ? (await api.patch<SaveResult>(`/questions/${id}`, { mode, ...input })).data : (await api.post<SaveResult>('/questions', { mode, areaId, ...input })).data,
  );

/** Deletes the question (children's answers are kept as copies). An area keeps at least one. */
export const useDeleteQuestion = () =>
  useCatalogueMutation(async ({ id, mode }: { id: string; mode: SaveMode }) => (await api.delete<SaveResult>(`/questions/${id}`, { data: { mode } })).data);

/** "Map answers" (#16): the question's skill and a stage per option id (null / left out = Unknown). */
export const useSaveSkillMap = () =>
  useCatalogueMutation(async ({ id, mode, skillId, stages }: { id: string; mode: SaveMode; skillId: string | null; stages: Record<string, SkillStage | null> }) =>
    (await api.put<SaveResult>(`/questions/${id}/skill-map`, { mode, skillId, stages })).data,
  );
