import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';

// Read only: there are deliberately no mutations for child learning data (guide §4).

export interface ChildLearningRow {
  id: string;
  name: string;
  parentName: string;
  age: number | null;
  /** null = "Questionnaire not recorded" */
  assessmentStartedAt: string | null;
  questionnaireMarks: number | null;
  activityMarks: number | null;
  /** null = "Assigned on submission" */
  ruleVersion: number | null;
}

export interface LearningRecord {
  child: { id: string; name: string; parentName: string };
  hasRecords: boolean;
  ruleVersion: number | null;
  areas: { name: string; questionnaire: number; activity: number; level: number }[];
  outcomes: { activity: string; outcome: 'INDEPENDENT' | 'WITH_HELP'; score: number; at: string }[];
  unsuccessful: { activity: string; at: string }[];
}

export const childKeys = {
  list: (f: { search: string; area: string }) => ['children', f] as const,
  record: (id: string) => ['children', id, 'learning-record'] as const,
};

/** `enabled` = false skips the request (e.g. an admin without Children & Learning). */
export function useChildren(filters: { search: string; area: string }, enabled = true) {
  return useQuery({
    queryKey: childKeys.list(filters),
    queryFn: async () =>
      (
        await api.get<{ rows: ChildLearningRow[]; areas: string[] }>('/children', {
          params: { search: filters.search || undefined, area: filters.area || undefined },
        })
      ).data,
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useLearningRecord(childId: string | null) {
  return useQuery({
    queryKey: childKeys.record(childId ?? ''),
    queryFn: async () => (await api.get<{ record: LearningRecord }>(`/children/${childId}/learning-record`)).data.record,
    enabled: Boolean(childId),
  });
}
