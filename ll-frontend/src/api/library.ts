import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { api } from './client';
import type { SaveMode } from '@/components/DecisionActions';
import type { LibraryCategoryRow, LibraryKind, SaveResult } from '@/components/library/types';
import type { LibraryContent, LibraryItem, LibraryRow } from '@/views/library/data';

/**
 * Stories and rhymes (docs/API_REQUESTS.md #17, #18). One shape for both kinds; the kind picks the
 * path and the permission (`stories` / `rhymes`). Every save sends the whole item and goes through
 * drafts, with one pending change per item. A never-published item's id is its draft's id until
 * the first publish returns the real item id. Reject is Super Admin only.
 */
const PATH: Record<LibraryKind, string> = { STORY: '/stories', RHYME: '/rhymes' };

export const libraryKeys = {
  list: (kind: LibraryKind) => ['library', kind, 'list'] as const,
  item: (kind: LibraryKind, id: string | null) => ['library', kind, 'item', id] as const,
  categories: (kind: LibraryKind) => ['library-categories', kind] as const,
};

/** A save can change the list, the item, category counts and the drafts list. */
function invalidate(qc: QueryClient) {
  for (const key of ['library', 'library-categories', 'drafts']) void qc.invalidateQueries({ queryKey: [key] });
}

export function useLibraryItems(kind: LibraryKind) {
  return useQuery({
    queryKey: libraryKeys.list(kind),
    queryFn: async () => (await api.get<{ rows: LibraryRow[] }>(PATH[kind])).data.rows,
  });
}

/** Live content plus its pending change, or a never-published item (its draft is the content). */
export function useLibraryItem(kind: LibraryKind, id: string | null) {
  return useQuery({
    queryKey: libraryKeys.item(kind, id),
    queryFn: async () => (await api.get<LibraryItem>(`${PATH[kind]}/${id}`)).data,
    enabled: Boolean(id),
  });
}

/** The body the API takes: the whole tree, ids sent back (new rows keep their `new-` ids). */
const body = (kind: LibraryKind, mode: SaveMode, c: LibraryContent) => ({
  mode,
  title: c.title,
  categoryId: c.categoryId,
  coverUrl: c.coverUrl,
  description: c.description,
  minimumPlan: c.minimumPlan,
  mediaUrl: kind === 'RHYME' ? c.mediaUrl : null,
  lyrics: kind === 'RHYME' ? c.lyrics : null,
  chapters: c.chapters.map((ch) => ({
    id: ch.id,
    title: ch.title,
    musicUrl: ch.musicUrl,
    pages: ch.pages.map((p) => ({ id: p.id, description: p.description, images: p.images.map((i) => ({ id: i.id, imageUrl: i.imageUrl })) })),
  })),
});

export function useSaveLibraryItem(kind: LibraryKind) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, mode, content }: { id?: string; mode: SaveMode; content: LibraryContent }) =>
      id
        ? (await api.patch<SaveResult>(`${PATH[kind]}/${id}`, body(kind, mode, content))).data
        : (await api.post<SaveResult>(PATH[kind], body(kind, mode, content))).data,
    onSuccess: () => invalidate(qc),
  });
}

/**
 * The editor's Reject (Super Admin), for a change waiting for approval: a published item's change
 * is discarded (`rejected`); a never-published item goes back to Draft (`draft`).
 */
export function useRejectLibraryItem(kind: LibraryKind) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (await api.post<{ status: 'rejected'; id: string } | { status: 'draft'; draftId: string }>(`${PATH[kind]}/${id}/reject`, {})).data,
    onSuccess: () => invalidate(qc),
  });
}

// ---- Categories (separate lists per kind) ------------------------------------------------------

export function useLibraryCategories(kind: LibraryKind) {
  return useQuery({
    queryKey: libraryKeys.categories(kind),
    queryFn: async () =>
      (await api.get<{ rows: LibraryCategoryRow[] }>('/library-categories', { params: { kind } })).data.rows.sort((a, b) => a.name.localeCompare(b.name)),
  });
}

/** Add, or rename. Renaming to another category's name merges the two (`merged: true`). */
export function useSaveLibraryCategory(kind: LibraryKind) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id?: string; name: string }) =>
      id
        ? (await api.patch<SaveResult & { merged?: boolean }>(`/library-categories/${id}`, { mode: 'publish', name })).data
        : (await api.post<SaveResult>('/library-categories', { mode: 'publish', kind, name })).data,
    onSuccess: () => invalidate(qc),
  });
}

/** Delete. A category in use needs a replacement of the same kind; its content moves there first. */
export function useDeleteLibraryCategory(_kind: LibraryKind) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, replacementId }: { id: string; replacementId: string | null }) =>
      (await api.delete<SaveResult>(`/library-categories/${id}`, { data: { mode: 'publish', replacementId } })).data,
    onSuccess: () => invalidate(qc),
  });
}
