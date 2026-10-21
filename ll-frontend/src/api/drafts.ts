import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';

export interface DraftApproval {
  id: string;
  authorName: string;
  section: string;
  entityType: string;
  entityId: string | null;
  status: 'PENDING' | 'PUBLISHED' | 'REJECTED';
  /** The region the change belongs to (Activity Management), if any. */
  regionId?: string | null;
  /** Published snapshot when the draft was made (null for something new). */
  before: unknown;
  /** The submitted payload. Its shape differs from `before`; views/drafts/formatters.ts reads both. */
  after: unknown;
  reason: string | null;
  createdAt: string;
  // Requested in docs/API_REQUESTS.md #19, not returned yet; the formatters fall back without them.
  /** The label given when the draft was saved, e.g. "Reply to Priya Sharma". */
  label?: string | null;
  /** Display names for the ids in `before` / `after` and for `regionId`. */
  names?: Record<string, string>;
  /** One line of context, e.g. the enquiry being answered or the parent's post. */
  context?: string | null;
  reviewerName?: string | null;
  reviewedAt?: string | null;
}

export const draftKeys = { all: ['drafts'] as const };

export function useDrafts() {
  return useQuery({
    queryKey: draftKeys.all,
    queryFn: async () => (await api.get<{ drafts: DraftApproval[] }>('/drafts')).data.drafts,
  });
}

/** Approve publishes the draft (refused if the content changed since); reject needs a reason. */
export function useDecideDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, decision, reason }: { id: string; decision: 'approve' | 'reject'; reason?: string }) =>
      api.post(`/drafts/${id}/${decision}`, decision === 'reject' ? { reason } : {}),
    // A published draft can change any section's data, so refresh everything.
    onSuccess: () => qc.invalidateQueries(),
  });
}
