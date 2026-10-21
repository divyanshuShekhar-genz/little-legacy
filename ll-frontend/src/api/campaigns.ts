import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type { SaveResult } from './community';
import type { SaveMode } from '@/components/DecisionActions';
import type { AudiencePreview, Campaign, CampaignContent, CampaignFilters, Reminder } from '@/views/notifications/data';

/**
 * Notification campaigns (docs/API_REQUESTS.md #23), Notifications only. Sent campaigns are final;
 * the ones waiting (saved in draft or submitted) are drafts, listed in `pending` with their
 * `draftId` and approved or rejected through Draft approvals. Sending recounts the audience on the
 * server, so the count is never sent. The filters combine with AND; a parent gets one message.
 */
export const campaignKeys = {
  all: ['campaigns'] as const,
  audience: (filters: CampaignFilters) => ['campaigns', 'audience', filters] as const,
  reminders: ['campaigns', 'reminders'] as const,
};

type SentRow = Omit<Campaign, 'draftId' | 'status'> & { status: 'PUBLISHED' };
type PendingRow = Omit<Campaign, 'id' | 'draftId' | 'sentAt' | 'status'> & { draftId: string; status: 'DRAFT' | 'PENDING_APPROVAL' };

/** One list for the page: the ones waiting (their id is the draft's) and the sent ones. */
export function useCampaigns() {
  return useQuery({
    queryKey: campaignKeys.all,
    queryFn: async () => {
      const { campaigns, pending } = (await api.get<{ campaigns: SentRow[]; pending: PendingRow[] }>('/campaigns')).data;
      return [
        ...pending.map((p): Campaign => ({ ...p, id: p.draftId, sentAt: null })),
        ...campaigns.map((c): Campaign => ({ ...c, draftId: null })),
      ];
    },
  });
}

/** The matching parents for the filters (saves nothing): an exact `count`, and up to 50 names. */
export function useAudience(filters: CampaignFilters) {
  return useQuery({
    queryKey: campaignKeys.audience(filters),
    queryFn: async () => (await api.post<AudiencePreview>('/campaigns/audience', { filters })).data,
    placeholderData: keepPreviousData,
  });
}

/**
 * Send (an admin who can publish) or save in draft / submit for approval. `draftId` edits a
 * saved campaign in place (a Sub Admin only their own).
 */
export function useSaveCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ mode, content, draftId }: { mode: SaveMode; content: CampaignContent; draftId?: string | null }) =>
      (await api.post<SaveResult>('/campaigns', { mode, ...content, ...(draftId ? { draftId } : {}) })).data,
    onSuccess: () => {
      for (const key of ['campaigns', 'drafts', 'audit']) void qc.invalidateQueries({ queryKey: [key] });
    },
  });
}

/** "Daily mandatory-activity reminders" (read only; the daily job isn't built yet, so only seeded rows). */
export function useReminders() {
  return useQuery({
    queryKey: campaignKeys.reminders,
    queryFn: async () => (await api.get<{ reminders: Reminder[] }>('/notifications/reminders')).data.reminders,
  });
}
