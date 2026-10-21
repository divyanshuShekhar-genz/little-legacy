import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { api } from './client';
import type { SaveResult } from './community';
import type { SaveMode } from '@/components/DecisionActions';
import { toVersionEntries, versionChanges, type AppContentEntry, type LatestVersion, type PendingPublish, type VersionSummary } from '@/views/appContent/data';

/**
 * App Content (docs/API_REQUESTS.md #24), App Content only. Two steps (guide §22):
 * 1. Entry edits change the working draft straight away (no approval; parents never see it); the
 *    server audits each one.
 * 2. "Publish new version" goes through drafts (entity `AppContentVersion`): an admin who can publish
 *    creates version n+1 from the working draft at once; anyone else submits it, and Super Admin
 *    approves that submitted snapshot (through Draft approvals, `api/drafts.ts`) or rejects it.
 * `latest` is null until the first publish.
 */
export const appContentKeys = { all: ['app-content'] as const };

interface Response {
  entries: AppContentEntry[];
  versions: VersionSummary[];
  latest: LatestVersion | null;
  pending: PendingPublish | null;
}

function invalidate(qc: QueryClient) {
  for (const key of ['app-content', 'drafts', 'audit']) void qc.invalidateQueries({ queryKey: [key] });
}

/** The working draft, the published history (newest first), the latest version and a waiting publish. */
export function useAppContent() {
  const query = useQuery({
    queryKey: appContentKeys.all,
    queryFn: async () => {
      const r = (await api.get<Response>('/app-content')).data;
      // Unpublished changes: anything differing from the latest version (everything, before the first).
      const dirty = versionChanges(r.latest?.entries ?? {}, toVersionEntries(r.entries)).length > 0;
      return { ...r, dirty };
    },
  });
  return { ...query, data: query.data ?? { entries: [], versions: [], latest: null, pending: null, dirty: false } };
}

/** Add (no `originalKey`) or edit a working-draft entry. The key can't change. */
export function useSaveEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ originalKey, entry }: { originalKey?: string; entry: AppContentEntry }) => {
      const { key, surface, page, title, body } = entry;
      const fields = { surface, page: surface === 'PAGE_FAQ' ? page : null, title, body };
      return originalKey
        ? (await api.patch<AppContentEntry>(`/app-content/entries/${encodeURIComponent(originalKey)}`, fields)).data
        : (await api.post<AppContentEntry>('/app-content/entries', { key, ...fields })).data;
    },
    onSuccess: () => invalidate(qc),
  });
}

/** Removes an entry from the next version only: published versions keep it. */
export function useDeleteEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (key: string) => (await api.delete<{ ok: true }>(`/app-content/entries/${encodeURIComponent(key)}`)).data,
    onSuccess: () => invalidate(qc),
  });
}

/** "Publish new version": the working draft as version n+1, now or after approval (one waiting publish at a time). */
export function usePublishVersion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (mode: SaveMode) => (await api.post<SaveResult>('/app-content/publish', { mode })).data,
    onSuccess: () => invalidate(qc),
  });
}
