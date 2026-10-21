import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { TextAreaField } from '@/components/ui/Field';

/**
 * "Reject this change?" with the reason Draft approvals requires (`POST /api/drafts/:id/reject`).
 * Opened from an editor over a change waiting for approval; Reject stays disabled until a reason
 * is typed. `onReject` gets the trimmed reason and should throw on failure (the dialog stays open).
 */
export function RejectReasonModal({ open, onClose, onReject, busy, title = 'Reject this change?', text }: {
  open: boolean;
  onClose: () => void;
  onReject: (reason: string) => Promise<void>;
  busy?: boolean;
  title?: string;
  text: string;
}) {
  const [reason, setReason] = useState('');
  useEffect(() => {
    if (open) setReason('');
  }, [open]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button onClick={onClose} disabled={busy}>
            Close
          </Button>
          <Button variant="danger" onClick={() => void onReject(reason.trim()).catch(() => undefined)} disabled={!reason.trim() || busy}>
            Reject
          </Button>
        </>
      }
    >
      <p className="mb-6 mt-2 leading-[1.7] text-muted">{text}</p>
      <TextAreaField label="Reason for rejection (required to reject)" value={reason} onChange={(e) => setReason(e.target.value)} />
    </Modal>
  );
}
