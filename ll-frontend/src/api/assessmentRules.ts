import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from './client';
import type { SaveMode } from '@/components/DecisionActions';
import type { SaveResult } from './community';
import type { QuestionDifficulty } from './questions';
import { useCatalogueMutation } from './areas';

/**
 * Assessment rules per regional learning category (docs/API_REQUESTS.md #9): formulas, weights,
 * question-difficulty weights and the mandatory first-week sets. Reading and changing both need
 * `assessmentRules`. Formulas are only ever evaluated on the server (the safe formula engine).
 * Saving creates the next revision once live; children keep the revision they started with.
 */
export interface AreaRule {
  areaId: string;
  name: string;
  formula: string;
  weight: number;
  questionWeights: Record<QuestionDifficulty, number>;
}

export interface MandatorySet {
  age: number;
  areaId: string;
  /** The ticked activities. */
  activityIds: string[];
  /** Σ base marks of the ticked activities ("Automatic target"). */
  target: number;
  count: number;
  /** "Required completed activities" (0 = off). */
  requiredCount: number;
  candidates: { id: string; title: string; baseMarks: number; status: 'DRAFT' | 'PUBLISHED' }[];
}

export interface AssessmentRules {
  /** "Rules version N" (0 = none saved yet). */
  revision: number;
  areas: AreaRule[];
  ages: number[];
  mandatory: MandatorySet[];
}

/** Sample values for "Test formulas with sample values". `activity` is worked out (mandatory + regular). */
export interface SampleValues {
  questionnaire: number;
  mandatory: number;
  regular: number;
  mastery: number;
  target: number;
}

export type AreaRuleInput = Omit<AreaRule, 'name'>;

export interface RulesPreview {
  areas: { areaId: string; name: string; result: number; weightedValue: number; percent: number | null }[];
  weightedAverage: number | null;
  /** "Not enough assessment data." when everything is 0. */
  message: string | null;
}

export function useAssessmentRules(regionId: string | null) {
  return useQuery({
    queryKey: ['assessment-rules', regionId],
    queryFn: async () => (await api.get<AssessmentRules>('/assessment-rules', { params: { regionId } })).data,
    enabled: Boolean(regionId),
  });
}

/** "Calculate preview": saves nothing; formula problems come back as "{Area}: {problem}". */
export const usePreviewAssessmentRules = () =>
  useMutation({
    mutationFn: async (body: { regionId: string; areas: AreaRuleInput[]; sample: SampleValues }) =>
      (await api.post<RulesPreview>('/assessment-rules/preview', body)).data,
  });

/** Saves the whole page. The API checks every formula with the sample values and with all zeros. */
export const useSaveAssessmentRules = () =>
  useCatalogueMutation(
    async (body: {
      mode: SaveMode;
      regionId: string;
      areas: AreaRuleInput[];
      sample: SampleValues;
      mandatory: { age: number; areaId: string; activityIds: string[]; requiredCount: number }[];
    }) => (await api.put<SaveResult>('/assessment-rules', body)).data,
  );
