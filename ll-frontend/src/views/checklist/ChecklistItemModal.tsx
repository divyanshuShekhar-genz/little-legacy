import { useLayoutEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/Modal';
import { FormGrid, SelectField, TextAreaField, TextField } from '@/components/ui/Field';
import { DecisionActions, type SaveMode } from '@/components/DecisionActions';
import { RejectReasonModal } from '@/components/RejectReasonModal';
import { errorMessage } from '@/api/client';
import { useChecklist, useSaveChecklistItem } from '@/api/checklist';
import { useDecideDraft } from '@/api/drafts';
import { useAuth } from '@/hooks/useAuth';
import { useApprovePending } from '@/hooks/useApprovePending';
import { DRAFT_SAVED } from '@/constants/messages';
import { ITEM_ERROR, WEEKS, WEEK_LABELS, itemError, type ChecklistContent, type ChecklistItem, type ChecklistStatus, type ChecklistWeek } from './data';

interface ItemForm {
  title: string;
  description: string;
  week: string;
  position: string;
  status: ChecklistStatus;
}

/** An item's content for comparing (text trimmed, as the API stores it). */
const sameAs = (c: ChecklistContent | null | undefined) =>
  c && JSON.stringify([c.regionId, c.week, c.title.trim(), c.description.trim(), c.position, c.status]);

/**
 * Prototype checklist.js `checklistEditor()`: Title, Instructions, Display order and Status, plus
 * the week list it belongs to (ours: OPEN_QUESTIONS Q7). Saves go through the draft flow (one
 * pending change per item). A Super Admin opening a waiting change sees it: Approve without
 * editing approves that draft (useApprovePending), and Reject asks for a reason. The item belongs to
 * the category selected on the page (Q27) and stays there; its category is shown at the top.
 */
export function ChecklistItemModal({ open, item, regionId, regionName, defaultWeek, onClose }: {
  open: boolean;
  item?: ChecklistItem;
  regionId: string | null;
  regionName: string;
  defaultWeek: ChecklistWeek;
  onClose: () => void;
}) {
  const { isSuperAdmin } = useAuth();
  const { data } = useChecklist(item?.regionId ?? regionId);
  const save = useSaveChecklistItem();
  const decide = useDecideDraft();
  const [rejecting, setRejecting] = useState(false);
  const { register, reset, getValues, setValue, watch } = useForm<ItemForm>();
  const nextPosition = (week: number) => Math.max(0, ...data.items.filter((i) => i.week === week).map((i) => i.position)) + 1;

  useLayoutEffect(() => {
    if (!open) return;
    const c = item?.pending?.content ?? item;
    reset({
      title: c?.title ?? '',
      description: c?.description ?? '',
      week: String(c?.week ?? defaultWeek),
      position: String(c?.position ?? nextPosition(defaultWeek)),
      status: c?.status ?? 'DRAFT',
    });
    // Values are taken when the dialog opens only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item, reset]);

  const content = (): ChecklistContent => {
    const v = getValues();
    return {
      regionId: item?.regionId ?? regionId ?? '',
      title: v.title ?? '',
      description: v.description ?? '',
      week: Number(v.week) as ChecklistWeek,
      position: Number(v.position),
      status: v.status,
    };
  };

  watch(); // re-render on every change, so the footer note stays current
  const waiting = item?.pending && item.pending.content !== null ? item.pending : null;
  const pending = useApprovePending(waiting?.draftId, Boolean(waiting) && sameAs(content()) === sameAs(waiting?.content));
  const reviewing = isSuperAdmin && waiting?.status === 'PENDING_APPROVAL';

  const onSave = async (mode: SaveMode) => {
    const c = content();
    if (itemError(c)) return void toast.error(ITEM_ERROR);
    try {
      if (mode === 'publish' && pending.viaDraft) {
        await pending.approve();
        toast.success(`${item && !item.isNew ? 'Updated' : 'Added'} parent checklist item: ${c.title.trim()}`);
        return onClose();
      }
      const result = await save.mutateAsync({ id: item?.id, mode, content: c });
      toast.success(result.status === 'draft' ? DRAFT_SAVED : `${item && !item.isNew ? 'Updated' : 'Added'} parent checklist item: ${c.title.trim()}`);
      onClose();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const onReject = async (reason: string) => {
    if (!waiting) return;
    try {
      await decide.mutateAsync({ id: waiting.draftId, decision: 'reject', reason });
      toast.success('Change rejected');
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
      title={item ? 'Edit checklist item' : 'Add checklist item'}
      footer={
        <DecisionActions
          onClose={onClose}
          onSave={onSave}
          onReject={() => setRejecting(true)}
          showReject={reviewing}
          busy={save.isPending || decide.isPending || pending.isPending}
          note={pending.note}
        />
      }
    >
      {open && (
        <form onSubmit={(e) => e.preventDefault()}>
          <p className="mb-6 mt-2 leading-[1.7] text-muted">
            Regional learning category: <b>{regionName}</b>
            {reviewing && ` · ${waiting!.authorName} submitted this change for approval.`}
          </p>
          <TextField label="Title" {...register('title')} />
          <TextAreaField label="Instructions" {...register('description')} />
          <FormGrid>
            <SelectField
              label="Week"
              options={WEEKS.map((w) => ({ value: String(w), label: WEEK_LABELS[w] }))}
              {...register('week', { onChange: (e) => !item && setValue('position', String(nextPosition(Number(e.target.value)))) })}
            />
            <TextField label="Display order" type="number" min={1} step={1} {...register('position')} />
            <SelectField
              label="Status"
              options={[
                { value: 'DRAFT', label: 'Draft' },
                { value: 'PUBLISHED', label: 'Published' },
              ]}
              {...register('status')}
            />
          </FormGrid>
        </form>
      )}
      <RejectReasonModal
        open={rejecting}
        onClose={() => setRejecting(false)}
        onReject={onReject}
        busy={decide.isPending}
        text="The change is discarded and parents keep seeing the published checklist. The author sees the reason in Draft approvals."
      />
    </Modal>
  );
}
