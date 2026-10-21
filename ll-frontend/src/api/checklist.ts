import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { api } from './client';
import type { SaveResult } from './community';
import type { SaveMode } from '@/components/DecisionActions';
import { DEFAULT_VISIBLE_LIMIT, type ChecklistContent, type ChecklistItem, type VisibleLimit } from '@/views/checklist/data';

/**
 * Parent Checklist (docs/API_REQUESTS.md #25), one checklist and visible limit per regional
 * category (Q27). Every change goes through drafts, one pending change per item. A never-published
 * item's id is its draft's id until it's approved. Approve / Reject of a waiting change happen
 * through Draft approvals with its `draftId` (`api/drafts.ts`).
 */
export const checklistKeys = { all: ['checklist'] as const, list: (regionId: string | null) => ['checklist', regionId] as const };

interface ListResponse {
  items: ChecklistItem[];
  visibleLimit: number;
  visibleLimitPending: VisibleLimit['pending'];
}

function invalidate(qc: QueryClient) {
  for (const key of ['checklist', 'drafts', 'audit']) void qc.invalidateQueries({ queryKey: [key] });
}

/** One category's checklist, sorted by week, order and creation (by the server). */
export function useChecklist(regionId: string | null) {
  const query = useQuery({
    queryKey: checklistKeys.list(regionId),
    queryFn: async () => {
      const r = (await api.get<ListResponse>('/checklist-items', { params: { regionId } })).data;
      return { items: r.items, limit: { regionId: regionId!, value: r.visibleLimit, pending: r.visibleLimitPending } satisfies VisibleLimit };
    },
    enabled: Boolean(regionId),
  });
  return { ...query, data: query.data ?? { items: [], limit: { regionId: regionId ?? '', value: DEFAULT_VISIBLE_LIMIT, pending: null } } };
}

/** Add (no id) or edit an item; a never-published item is edited by its draft id. */
export function useSaveChecklistItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, mode, content }: { id?: string; mode: SaveMode; content: ChecklistContent }) =>
      id
        ? (await api.patch<SaveResult>(`/checklist-items/${id}`, { mode, ...content })).data
        : (await api.post<SaveResult>('/checklist-items', { mode, ...content })).data,
    onSuccess: () => invalidate(qc),
  });
}

/** Delete: a live item → a removal through drafts; a never-published one → its draft is discarded. */
export function useDeleteChecklistItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, mode }: { id: string; mode: SaveMode }) =>
      (await api.delete<SaveResult | { status: 'discarded'; draftId: string }>(`/checklist-items/${id}`, { data: { mode } })).data,
    onSuccess: () => invalidate(qc),
  });
}

/** "Maximum items visible at once" for one category. */
export function useSaveVisibleLimit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ mode, regionId, value }: { mode: SaveMode; regionId: string; value: number }) =>
      (await api.put<SaveResult>('/checklist-items/settings', { mode, regionId, visibleLimit: value })).data,
    onSuccess: () => invalidate(qc),
  });
}
