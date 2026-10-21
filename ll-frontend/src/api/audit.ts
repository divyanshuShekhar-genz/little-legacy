import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from './client';

export interface AuditEntry {
  id: string;
  actorName: string;
  actorRole: string;
  action: string;
  section: string | null;
  entityType: string | null;
  entityId: string | null;
  before: unknown;
  after: unknown;
  createdAt: string;
}

export const auditKeys = { all: ['audit'] as const };

/** Entries per page ("Load more" fetches the next page with the API's cursor). */
export const AUDIT_PAGE_SIZE = 50;

/** Newest first, a page at a time (`take` / `cursor`; `nextCursor` is null on the last page). */
export function useAuditLog() {
  return useInfiniteQuery({
    queryKey: auditKeys.all,
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) =>
      (await api.get<{ entries: AuditEntry[]; nextCursor: string | null }>('/audit', { params: { take: AUDIT_PAGE_SIZE, cursor: pageParam ?? undefined } })).data,
    getNextPageParam: (last) => last.nextCursor,
  });
}
