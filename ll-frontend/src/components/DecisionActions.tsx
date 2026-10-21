import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';

/**
 * How a save should be applied. The API is the enforcer: a `publish` request from a Sub Admin
 * without direct publishing is stored as a draft for Super Admin review regardless.
 */
export type SaveMode = 'publish' | 'draft';

/**
 * The prototype's standard editor footer, used by every publishable editor:
 * Close · Save in draft · Reject · Approve.
 * - Save in draft: keeps the change unpublished (even for Super Admin).
 * - Reject: by default discards this unsaved edit (never the saved item). Editors where Reject
 *   is a real decision (e.g. Community moderation) pass their own `onReject`.
 * - Approve: publishes if allowed, otherwise submits for Super Admin approval.
 * Editors where Reject only applies in some cases (e.g. a change pending approval) pass `showReject`.
 * `note` is a line above the buttons saying what Approve will do (useApprovePending).
 * `loading` (the item hasn't arrived yet) disables the decisions but leaves Close usable.
 */
export function DecisionActions({ onClose, onSave, onReject, busy, loading = false, showDraft = true, showReject = true, note }: {
  onClose: () => void;
  onSave: (mode: SaveMode) => void;
  onReject?: () => void;
  busy?: boolean;
  loading?: boolean;
  showDraft?: boolean;
  showReject?: boolean;
  note?: string;
}) {
  const { canPublish } = useAuth();
  return (
    <>
      {note && <p className="basis-full text-right text-[12px] leading-[1.7] text-muted">{note}</p>}
      <Button onClick={onClose} disabled={busy}>
        Close
      </Button>
      {showDraft && (
        <Button onClick={() => onSave('draft')} disabled={busy || loading}>
          Save in draft
        </Button>
      )}
      {showReject && (
        <Button onClick={onReject ?? onClose} disabled={busy || loading}>
          Reject
        </Button>
      )}
      <Button variant="primary" onClick={() => onSave('publish')} disabled={busy || loading}>
        {canPublish ? 'Approve' : 'Submit for approval'}
      </Button>
    </>
  );
}
