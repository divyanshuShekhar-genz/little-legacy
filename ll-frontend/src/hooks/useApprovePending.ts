import { useDecideDraft } from '@/api/drafts';
import { useAuth } from './useAuth';

/**
 * Approve in an editor that opened on a pending change (Stories, Rhymes, plans, products).
 * Super Admin only: if nothing was edited, Approve approves that pending draft through Draft
 * approvals' own endpoint, so it's recorded as approved (a direct publish would close it as
 * "Replaced by a published change"). If something was edited, the editor publishes directly as
 * before. `note` says which will happen, for the editor footer.
 */
export function useApprovePending(draftId: string | null | undefined, unchanged: boolean) {
  const { isSuperAdmin } = useAuth();
  const decide = useDecideDraft();
  const applies = isSuperAdmin && Boolean(draftId);
  return {
    /** Approve should approve the pending draft rather than publish the editor's content. */
    viaDraft: applies && unchanged,
    note: !applies
      ? undefined
      : unchanged
        ? 'Approve publishes the pending change as it is, and Draft approvals records it as approved.'
        : 'You’ve edited the pending change: Approve publishes your version instead, and the original is closed as replaced.',
    approve: () => decide.mutateAsync({ id: draftId!, decision: 'approve' }),
    isPending: decide.isPending,
  };
}
