import { useId, useLayoutEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { DataTable } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { TextField } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { DecisionActions, type SaveMode } from '@/components/DecisionActions';
import { RejectReasonModal } from '@/components/RejectReasonModal';
import { useChecklist, useDeleteChecklistItem, useSaveVisibleLimit } from '@/api/checklist';
import { useDecideDraft } from '@/api/drafts';
import { useApprovePending } from '@/hooks/useApprovePending';
import { useAuth } from '@/hooks/useAuth';
import { errorMessage } from '@/api/client';
import { DRAFT_SAVED } from '@/constants/messages';
import { LIMIT_ERROR, WEEKS, WEEK_LABELS, type ChecklistItem, type ChecklistWeek } from './data';
import { useChecklistRegion } from './region';
import { ChecklistItemModal } from './ChecklistItemModal';

const pText = 'mb-6 mt-2 leading-[1.7] text-muted';

/** What the table shows for an item: a pending addition shows its submitted content. */
const shown = (i: ChecklistItem) => (i.isNew && i.pending?.content ? { ...i, ...i.pending.content } : i);

function PendingBadge({ item }: { item: ChecklistItem }) {
  if (!item.pending) return null;
  const what = item.pending.content === null ? 'Removal' : item.isNew ? 'New item' : 'Change';
  return <Badge tone={item.pending.status === 'PENDING_APPROVAL' ? 'warning' : 'neutral'}>{item.pending.status === 'PENDING_APPROVAL' ? `${what} waiting for approval` : `${what} saved as draft`}</Badge>;
}

/**
 * Parent Checklist (guide §22). Prototype checklist.js: helpful tasks for parents, with no points,
 * repetitions or automatic resets. **One checklist per regional category** (Q27, client answer 15
 * Oct; CR5), picked in the filter above the lists, each with Week 1, Week 2 and Later-weeks lists
 * (Q7) and its own maximum number of items visible at once. A new category starts empty. Each
 * list keeps its own display order. Ticks are stored per child and award nothing. The prototype
 * has no parent-view preview, so none is built (the carry-over rule lives in ll-backend
 * rules/lists.ts `visibleChecklist()`). The prototype's "Export published checklist" is left out.
 * On the API (#25): every change is a draft (one pending change per item); a never-published item
 * can be deleted by its author or a Super Admin, which discards its draft.
 */
export function ChecklistPage() {
  const { isSuperAdmin, admin } = useAuth();
  const filterId = useId();
  const { regions, region, regionId, select, isError: regionsFailed, error: regionsError } = useChecklistRegion();
  const { data, isLoading, isError, error } = useChecklist(regionId);
  const remove = useDeleteChecklistItem();
  const decide = useDecideDraft();
  const [rejectingRemoval, setRejectingRemoval] = useState(false);
  const [editing, setEditing] = useState<{ item?: ChecklistItem; week: ChecklistWeek } | null>(null);
  const [deleting, setDeleting] = useState<ChecklistItem | null>(null);
  const [limitOpen, setLimitOpen] = useState(false);

  const removal = deleting?.pending?.content === null ? deleting.pending : null;
  const reviewingRemoval = isSuperAdmin && removal?.status === 'PENDING_APPROVAL';
  // A waiting removal can't be edited: a Super Admin's Approve approves that draft.
  const approveRemoval = useApprovePending(removal?.draftId, true);

  const onDelete = async (mode: SaveMode) => {
    if (!deleting) return;
    try {
      if (mode === 'publish' && approveRemoval.viaDraft) {
        await approveRemoval.approve();
        toast.success(`Deleted parent checklist item: ${deleting.title}`);
        return setDeleting(null);
      }
      const result = await remove.mutateAsync({ id: deleting.id, mode });
      toast.success(
        result.status === 'discarded'
          ? `Deleted draft item: ${shown(deleting).title}`
          : result.status === 'draft'
            ? DRAFT_SAVED
            : `Deleted parent checklist item: ${deleting.title}`,
      );
      setDeleting(null);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  /** A never-published item can be deleted (its draft discarded) by its author or a Super Admin. */
  const canDelete = (i: ChecklistItem) => !i.isNew || isSuperAdmin || i.pending?.authorName === admin?.name;

  return (
    <>
      <PageHeader
        title="Parent checklist"
        subtitle="Helpful tasks for parents. No activity points, repetitions or automatic resets."
        actions={
          <Button variant="primary" disabled={!regionId} onClick={() => setEditing({ week: 1 })}>
            Add checklist item
          </Button>
        }
      />

      {/* Ours (CR5): the regional category filter, as on the Activity Management cards. */}
      <Panel>
        <label htmlFor={filterId} className="mb-2 block">
          Regional learning category
        </label>
        <select id={filterId} className="input" value={regionId ?? ''} onChange={(e) => select(e.target.value)}>
          {regions.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
              {r.isDefault ? ' (default)' : ''}
            </option>
          ))}
        </select>
        {regionsFailed && <p className="mt-3 text-danger">{errorMessage(regionsError)}</p>}
        <p className="mt-3 leading-[1.7] text-muted">
          Each regional category has its own parent checklist and visible limit. A new category starts with an empty checklist.
        </p>
      </Panel>

      <Panel
        title="Visible items"
        actions={<Button onClick={() => setLimitOpen(true)}>Change visible items</Button>}
      >
        <p className={pText}>
          Parents in {region?.name ?? 'this category'} see at most <b>{data.limit.value}</b> items at once. Unfinished items carry over as Pending with their original week. New
          items come first; when space runs out, the oldest pending items drop out of view but are not marked done.
          {data.limit.pending &&
            ` ${data.limit.pending.status === 'PENDING_APPROVAL' ? 'Waiting for approval' : 'Saved as draft'}: ${data.limit.pending.value} (${data.limit.pending.authorName}).`}
          {isError && <span className="block text-danger">{errorMessage(error)}</span>}
        </p>
        <p className={pText}>
          Published items appear from the home-screen Parent checklist button. Ticks are saved separately for each child. Drafts stay hidden.
        </p>
      </Panel>

      {WEEKS.map((week) => (
        <Panel key={week} title={WEEK_LABELS[week]}>
          <DataTable
            loading={isLoading}
            rows={data.items
              .map(shown)
              .filter((i) => i.week === week)
              .sort((a, b) => a.position - b.position || a.title.localeCompare(b.title))}
            rowKey={(i) => i.id}
            columns={[
              { header: 'Order', cell: (i) => i.position },
              {
                header: 'Item',
                className: 'whitespace-normal',
                cell: (i) => (
                  <>
                    <b>{i.title}</b>
                    <p className="mt-1 text-muted">{i.description}</p>
                  </>
                ),
              },
              {
                header: 'Status',
                cell: (i) => {
                  const original = data.items.find((x) => x.id === i.id)!;
                  return (
                    <div className="flex flex-col items-start gap-1.5">
                      {!original.isNew && <StatusBadge status={i.status} />}
                      <PendingBadge item={original} />
                    </div>
                  );
                },
              },
              {
                header: '',
                cell: (i) => {
                  const original = data.items.find((x) => x.id === i.id)!;
                  return (
                    <div className="flex gap-2">
                      <Button onClick={() => setEditing({ item: original, week })}>Edit item</Button>
                      {canDelete(original) && <Button onClick={() => setDeleting(original)}>Delete item</Button>}
                    </div>
                  );
                },
              },
            ]}
          />
        </Panel>
      ))}

      <ChecklistItemModal
        open={editing !== null}
        item={editing?.item}
        regionId={regionId}
        regionName={region?.name ?? ''}
        defaultWeek={editing?.week ?? 1}
        onClose={() => setEditing(null)}
      />
      <Modal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Delete checklist item"
        footer={
          <DecisionActions
            onClose={() => setDeleting(null)}
            onSave={onDelete}
            onReject={() => setRejectingRemoval(true)}
            showReject={reviewingRemoval}
            busy={remove.isPending || approveRemoval.isPending}
            note={approveRemoval.note}
          />
        }
      >
        {deleting && (
          <p className={pText}>
            {reviewingRemoval && `${removal!.authorName} asked to remove this item. `}
            {deleting.isNew
              ? `Delete “${shown(deleting).title}”? It was never published, so its draft is discarded.`
              : `Remove “${deleting.title}” from the parent checklist? This does not change child scores.`}
          </p>
        )}
        <RejectReasonModal
          open={rejectingRemoval}
          onClose={() => setRejectingRemoval(false)}
          busy={decide.isPending}
          text="The item stays on the checklist. The author sees the reason in Draft approvals."
          onReject={async (reason) => {
            try {
              await decide.mutateAsync({ id: removal!.draftId, decision: 'reject', reason });
              toast.success('Change rejected');
              setRejectingRemoval(false);
              setDeleting(null);
            } catch (e) {
              toast.error(errorMessage(e));
              throw e;
            }
          }}
        />
      </Modal>
      <VisibleLimitModal open={limitOpen} regionId={regionId} regionName={region?.name ?? ''} onClose={() => setLimitOpen(false)} />
    </>
  );
}

/** "Maximum items visible at once" for one category (ours: the guide's setting; the prototype has none). */
function VisibleLimitModal({ open, regionId, regionName, onClose }: { open: boolean; regionId: string | null; regionName: string; onClose: () => void }) {
  const { isSuperAdmin } = useAuth();
  const { data } = useChecklist(regionId);
  const save = useSaveVisibleLimit();
  const decide = useDecideDraft();
  const [rejecting, setRejecting] = useState(false);
  const { register, reset, getValues, watch } = useForm<{ value: string }>();
  const waiting = data.limit.pending;
  const reviewing = isSuperAdmin && waiting?.status === 'PENDING_APPROVAL';
  const pending = useApprovePending(waiting?.draftId, Boolean(waiting) && Number(watch('value')) === waiting?.value);

  useLayoutEffect(() => {
    if (open) reset({ value: String(data.limit.pending?.value ?? data.limit.value) });
    // Values are taken when the dialog opens only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reset]);

  const onSave = async (mode: SaveMode) => {
    const value = Number(getValues('value'));
    if (!Number.isSafeInteger(value) || value < 1) return void toast.error(LIMIT_ERROR);
    try {
      if (mode === 'publish' && pending.viaDraft) {
        await pending.approve();
        toast.success('Updated visible checklist items');
        return onClose();
      }
      const result = await save.mutateAsync({ mode, regionId: regionId ?? '', value });
      toast.success(result.status === 'draft' ? DRAFT_SAVED : 'Updated visible checklist items');
      onClose();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Visible checklist items"
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
          <p className={pText}>
            Regional learning category: <b>{regionName}</b>
            {reviewing && ` · ${data.limit.pending!.authorName} submitted this change for approval.`}
          </p>
          <TextField label="Maximum items visible at once" type="number" min={1} step={1} {...register('value')} />
          <p className={pText}>Example: with 5, a parent with 4 new items and 3 pending sees the 4 new items and the newest pending one.</p>
        </form>
      )}
      <RejectReasonModal
        open={rejecting}
        onClose={() => setRejecting(false)}
        busy={decide.isPending}
        text="The limit stays as it is. The author sees the reason in Draft approvals."
        onReject={async (reason) => {
          try {
            await decide.mutateAsync({ id: waiting!.draftId, decision: 'reject', reason });
            toast.success('Change rejected');
            setRejecting(false);
            onClose();
          } catch (e) {
            toast.error(errorMessage(e));
            throw e;
          }
        }}
      />
    </Modal>
  );
}
