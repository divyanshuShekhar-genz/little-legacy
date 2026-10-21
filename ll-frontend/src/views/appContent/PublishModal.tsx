import { useState } from 'react';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/Modal';
import { DataTable } from '@/components/ui/DataTable';
import { DecisionActions, type SaveMode } from '@/components/DecisionActions';
import { RejectReasonModal } from '@/components/RejectReasonModal';
import { errorMessage } from '@/api/client';
import { useAppContent, usePublishVersion } from '@/api/appContent';
import { useDecideDraft } from '@/api/drafts';
import { useAuth } from '@/hooks/useAuth';
import { useApprovePending } from '@/hooks/useApprovePending';
import { DRAFT_SAVED } from '@/constants/messages';
import { sameEntries, toVersionEntries, versionChanges, type EntryChange } from './data';

const pText = 'mb-6 mt-2 leading-[1.7] text-muted';
const KIND_LABELS: Record<EntryChange['kind'], string> = { added: 'Added', changed: 'Changed', removed: 'Removed' };
const show = (e: EntryChange['before']) => (e ? `${e.title} — ${e.body.length > 120 ? `${e.body.slice(0, 120)}…` : e.body}` : '—');

/**
 * Prototype "Publish App Content" confirmation, through the draft flow: an admin who can publish
 * creates version n+1 from the working draft; anyone else submits it for approval. With a version
 * waiting, a Super Admin's Approve on an unchanged working draft approves that submitted snapshot
 * (useApprovePending); after edits it publishes the working draft instead, closing the original.
 * Reject asks for a reason. The dialog lists what the version changes compared with the published
 * one, entry by entry; before the first publish every entry counts as added. The server's messages
 * ("Nothing has changed since version {n}.", a newer version published meanwhile) show as toasts.
 */
export function PublishModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { isSuperAdmin } = useAuth();
  const { data } = useAppContent();
  const publish = usePublishVersion();
  const decide = useDecideDraft();
  const [rejecting, setRejecting] = useState(false);

  const working = toVersionEntries(data.entries);
  const waiting = data.pending;
  const pending = useApprovePending(waiting?.draftId, Boolean(waiting) && sameEntries(working, waiting!.entries));
  const reviewing = isSuperAdmin && waiting?.status === 'PENDING_APPROVAL';
  // What Approve would publish: the submitted snapshot when approving it as it is, else the working draft.
  const next = pending.viaDraft && waiting ? waiting.entries : working;
  const published = data.latest?.entries ?? {};
  const changes = versionChanges(published, next);
  const version = (data.latest?.version ?? 0) + 1;

  const onSave = async (mode: SaveMode) => {
    try {
      if (mode === 'publish' && pending.viaDraft) {
        await pending.approve();
        toast.success(`Published App Content version ${version}`);
        return onClose();
      }
      const result = await publish.mutateAsync(mode);
      toast.success(result.status === 'draft' ? DRAFT_SAVED : `Published App Content version ${result.id}`);
      onClose();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const onReject = async (reason: string) => {
    try {
      await decide.mutateAsync({ id: waiting!.draftId, decision: 'reject', reason });
      toast.success('App Content version rejected');
      setRejecting(false);
      onClose();
    } catch (e) {
      toast.error(errorMessage(e));
      throw e;
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Publish App Content"
      footer={
        <DecisionActions
          onClose={onClose}
          onSave={onSave}
          onReject={() => setRejecting(true)}
          showReject={reviewing}
          busy={publish.isPending || decide.isPending || pending.isPending}
          note={pending.note}
        />
      }
    >
      {open && (
        <>
          <p className={pText}>
            {reviewing && `${waiting!.authorName} submitted this version for approval. `}
            Publish all {Object.keys(next).length} draft entries as version {version}? Existing versions remain available for parent sessions already
            using them.
          </p>
          <h3>{data.latest ? `Changes from version ${data.latest.version}` : 'Nothing published yet'}</h3>
          {!data.latest && <p className={pText}>This is the first version: every entry is new to parents.</p>}
          {changes.length ? (
            <DataTable
              rows={changes}
              rowKey={(c) => c.key}
              columns={[
                { header: 'Change', cell: (c) => KIND_LABELS[c.kind] },
                { header: 'Key', cell: (c) => c.key },
                { header: 'Before', className: 'whitespace-normal', cell: (c) => show(c.before) },
                { header: 'After', className: 'whitespace-normal', cell: (c) => show(c.after) },
              ]}
            />
          ) : (
            <p className={pText}>No changes: the draft matches the published version.</p>
          )}
        </>
      )}
      <RejectReasonModal
        open={rejecting}
        onClose={() => setRejecting(false)}
        onReject={onReject}
        busy={decide.isPending}
        title="Reject this version?"
        text="Nothing is published and the working draft stays as it is. The author sees the reason in Draft approvals."
      />
    </Modal>
  );
}
