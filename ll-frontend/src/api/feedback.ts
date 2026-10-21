import { useQuery } from '@tanstack/react-query';
import { api } from './client';

export interface FeedbackRow {
  id: string;
  childName: string;
  activity: string;
  difficulty: string | null;
  enjoyment: string | null;
  note: string | null;
  completedAt: string;
}

export const feedbackKeys = { all: ['feedback'] as const };

export function useFeedback() {
  return useQuery({
    queryKey: feedbackKeys.all,
    queryFn: async () => (await api.get<{ rows: FeedbackRow[] }>('/feedback')).data.rows,
  });
}
