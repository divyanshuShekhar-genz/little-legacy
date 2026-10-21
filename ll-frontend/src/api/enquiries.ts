import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import { draftKeys } from './drafts';
import type { SaveMode } from '@/components/DecisionActions';
import type { SaveResult } from './community';

export type ReplyChannel = 'EMAIL' | 'IN_APP';

export const CHANNEL_LABELS: Record<ReplyChannel, string> = { EMAIL: 'Email', IN_APP: 'In-app notification' };

/** Nothing sets RESOLVED yet (OPEN_QUESTIONS Q17). */
export type EnquiryStatus = 'NEW' | 'IN_PROGRESS' | 'RESOLVED';

export interface EnquiryReply {
  /** EnquiryReply id once sent; DraftApproval id while unpublished. */
  id: string;
  body: string;
  channels: ReplyChannel[];
  status: 'DRAFT' | 'PUBLISHED' | 'PENDING_APPROVAL';
  sentAt: string | null;
}

export interface Enquiry {
  id: string;
  parentName: string;
  message: string;
  status: EnquiryStatus;
  createdAt: string;
  /** Sent replies first (oldest first), then unsent drafts. */
  replies: EnquiryReply[];
}

export interface ReplyInput {
  mode: SaveMode;
  body: string;
  channels: ReplyChannel[];
}

export const enquiryKeys = { all: ['enquiries'] as const };

/** Unresolved before resolved, newest first. */
export function useEnquiries() {
  return useQuery({
    queryKey: enquiryKeys.all,
    queryFn: async () => (await api.get<{ rows: Enquiry[] }>('/enquiries')).data.rows,
  });
}

/** Sends the reply (publish), or stores it as a draft ("Save in draft", or no direct publishing). */
export function useReplyToEnquiry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: ReplyInput & { id: string }) =>
      (await api.post<SaveResult>(`/enquiries/${id}/reply`, input)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: enquiryKeys.all });
      qc.invalidateQueries({ queryKey: draftKeys.all });
    },
  });
}
