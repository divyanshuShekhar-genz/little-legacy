import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from './client';

/** The parent's answer to the difficulty question. Must match the backend's ListActivityReviewsQueryDto. */
export const DIFFICULTY_ANSWERS = ['Just right', 'Easy', 'Challenging'] as const;
export type DifficultyAnswer = (typeof DIFFICULTY_ANSWERS)[number];

export interface ActivityReviewRow {
  id: string;
  completedAt: string;
  childName: string;
  parentEmail: string;
  activity: string;
  repeat: number;
  /** Always 100: every row is a completed record. */
  completionPercent: number;
  difficulty: string | null;
  enjoyment: string | null;
  note: string | null;
  /** Active time in Independent mode, pauses excluded; null = "Not recorded". */
  elapsedSeconds: number | null;
}

export const activityReviewKeys = {
  all: ['activity-reviews'] as const,
  list: (difficulty: DifficultyAnswer | '') => [...activityReviewKeys.all, difficulty] as const,
};

/** Completed activity records, newest first. The difficulty filter runs on the server; blank = all. */
export function useActivityReviews(difficulty: DifficultyAnswer | '') {
  return useQuery({
    queryKey: activityReviewKeys.list(difficulty),
    queryFn: async () =>
      (await api.get<{ rows: ActivityReviewRow[] }>('/activity-reviews', { params: difficulty ? { difficulty } : {} })).data.rows,
    // Keep the current rows on screen while another filter loads.
    placeholderData: keepPreviousData,
  });
}
