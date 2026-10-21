import type { ReactNode } from 'react';
import { Modal } from '@/components/ui/Modal';
import { DecisionActions, type SaveMode } from '@/components/DecisionActions';

/**
 * A removal confirmation with the standard editor footer (the prototype's delete dialogs).
 * `onSave` sends the removal (live, or as a draft for Super Admin) and the dialog closes once it
 * succeeds. Reject is hidden: a removal has nothing pending to reject.
 */
export function ApiConfirmModal({ open, title, children, busy, onSave, onClose }: {
  open: boolean;
  title: string;
  children: ReactNode;
  busy?: boolean;
  onSave: (mode: SaveMode) => Promise<boolean>;
  onClose: () => void;
}) {
  const save = async (mode: SaveMode) => {
    if (await onSave(mode)) onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title={title} footer={<DecisionActions onClose={onClose} onSave={save} showReject={false} busy={busy} />}>
      {children}
    </Modal>
  );
}

/** The prototype's paragraph style (p: muted, line-height 1.7, margin 8px 0 24px). */
export const pText = 'mb-6 mt-2 leading-[1.7] text-muted';
