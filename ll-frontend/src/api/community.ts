import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { SaveMode } from '@/components/DecisionActions';

export type PostStatus = 'AWAITING_MODERATION' | 'DRAFT' | 'PUBLISHED' | 'REJECTED' | 'EXPIRED';

interface PostBase {
  id: string;
  message: string;
  status: PostStatus;
  pinned: boolean;
  /** null = no expiry */
  expiryHours: number | null;
  expiresAt: string | null;
  rejectionReason: string | null;
}
export interface ParentPost extends PostBase {
  parentName: string;
  /** The parent's own words — kept even after rephrasing. */
  originalMessage: string;
}
export interface TeamPost extends PostBase {
  title: string;
}

export interface Decision {
  mode: SaveMode;
  action: 'approve' | 'reject';
  message: string;
  reason: string;
  expiryDays: number;
  expiryHours: number;
  pinned: boolean;
}

/** `draft` = stored for Super Admin review (explicit "Save in draft", or no publishing permission). */
export type SaveResult = { status: 'published'; id: string } | { status: 'draft'; draftId: string };

export const communityKeys = { all: ['community'] as const };

export function useCommunity() {
  return useQuery({
    queryKey: communityKeys.all,
    queryFn: async () =>
      (await api.get<{ parentPosts: ParentPost[]; teamPosts: TeamPost[]; settings: { regularVisibleLimit: number } }>('/community')).data,
  });
}

function useCommunityMutation<T>(send: (input: T) => Promise<SaveResult>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: send,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: communityKeys.all });
      qc.invalidateQueries({ queryKey: ['overview'] }); // community queue counter
      qc.invalidateQueries({ queryKey: ['drafts'] });
    },
  });
}

export const useReviewPost = () =>
  useCommunityMutation(async ({ id, ...d }: Decision & { id: string }) => (await api.post<SaveResult>(`/community/posts/${id}/review`, d)).data);

export const useSaveTeamPost = () =>
  useCommunityMutation(async ({ id, ...d }: Decision & { id?: string; title: string }) =>
    id ? (await api.patch<SaveResult>(`/community/team-posts/${id}`, d)).data : (await api.post<SaveResult>('/community/team-posts', d)).data,
  );

export const useSaveVisibleLimit = () =>
  useCommunityMutation(async (d: { mode: SaveMode; regularVisibleLimit: number }) => (await api.put<SaveResult>('/community/settings', d)).data);
