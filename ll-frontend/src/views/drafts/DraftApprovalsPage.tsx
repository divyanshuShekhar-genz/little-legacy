import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { errorMessage } from '@/api/client';
import { useDecideDraft, useDrafts, type DraftApproval } from '@/api/drafts';
import { useCountries } from '@/api/countries';
import { formatDateTime } from '@/utils/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { Note, Panel } from '@/components/ui/Panel';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { TextAreaField } from '@/components/ui/Field';
import { useAuth } from '@/hooks/useAuth';
import { formatDraft } from './formatters';
import { DraftChanges } from './DraftChanges';

/**
 * Guide §2. Sub Admins without direct publishing submit here; Super Admin approves or rejects.
 * The API refuses to approve if the published row changed since the draft was made.
 * Deliberate differences from the prototype: a "Change" column saying what each draft is, a
 * Field · Before · Proposed table instead of raw JSON, and a read-only "View" (Sub Admins: every
 * draft; Super Admin: decided ones, which only have Review while pending).
 */
export function DraftApprovalsPage() {
  const { isSuperAdmin } = useAuth();
  const [open, setOpen] = useState<DraftApproval | null>(null);
  const [reason, setReason] = useState('');

  const { data, isLoading, isError, error } = useDrafts();
  // Country names and currencies for price changes (plans, products).
  const { data: countries } = useCountries();
  const rows = useMemo(() => data?.map((d) => ({ draft: d, formatted: formatDraft(d, { countries }) })), [data, countries]);
  const decideDraft = useDecideDraft();
  const reviewing = Boolean(open && isSuperAdmin && open.status === 'PENDING');
  const formatted = useMemo(() => (open ? formatDraft(open, { countries }) : null), [open, countries]);
  const close = () => {
    setOpen(null);
    setReason('');
  };
  const decide = (decision: 'approve' | 'reject') =>
    open &&
    decideDraft.mutate(
      { id: open.id, decision, reason },
      {
        onSuccess: () => {
          toast.success(decision === 'approve' ? 'Draft published' : 'Draft rejected');
          close();
        },
        onError: (e) => toast.error(errorMessage(e)),
      },
    );

  return (
    <>
      <PageHeader
        eyebrow="Draft approvals"
        title="Draft approvals"
        subtitle="Sub Admin changes stay out of published content until Super Admin approves them."
      />
      <Panel>
        <DataTable
          loading={isLoading}
          error={isError ? errorMessage(error) : undefined}
          rows={rows}
          rowKey={(r) => r.draft.id}
          columns={[
            { header: 'Author', cell: ({ draft }) => draft.authorName },
            { header: 'Section', cell: ({ draft }) => draft.section },
            { header: 'Change', cell: ({ formatted: f }) => <span className="whitespace-normal">{f.change}</span> },
            { header: 'Submitted', cell: ({ draft }) => formatDateTime(draft.createdAt) },
            {
              header: 'Status',
              cell: ({ draft }) => (
                <>
                  <StatusBadge status={draft.status} />
                  {draft.reviewerName && draft.reviewedAt && (
                    <small className="mt-[5px] block whitespace-normal text-[12px] text-muted">
                      {draft.reviewerName} · {formatDateTime(draft.reviewedAt)}
                    </small>
                  )}
                </>
              ),
            },
            {
              header: '',
              className: 'whitespace-normal',
              cell: ({ draft }) =>
                isSuperAdmin && draft.status === 'PENDING' ? (
                  <Button onClick={() => setOpen(draft)}>Review</Button>
                ) : (
                  <div className="flex flex-col items-start gap-1.5">
                    <Button onClick={() => setOpen(draft)}>View</Button>
                    {draft.reason && <small className="whitespace-normal text-[12px] text-muted">{draft.reason}</small>}
                  </div>
                ),
            },
          ]}
        />
      </Panel>

      <Modal
        open={Boolean(open)}
        onClose={close}
        title={reviewing ? 'Review draft' : 'View draft'}
        footer={
          open && (
            <>
              <Button onClick={close}>Close</Button>
              {reviewing && (
                <>
                  <Button variant="danger" disabled={!reason.trim() || decideDraft.isPending} onClick={() => decide('reject')}>
                    Reject
                  </Button>
                  <Button variant="primary" disabled={decideDraft.isPending} onClick={() => decide('approve')}>
                    Approve
                  </Button>
                </>
              )}
            </>
          )
        }
      >
        {open && formatted && (
          <>
            <p className="text-body">
              {open.authorName} · {open.section} · {formatDateTime(open.createdAt)}
            </p>
            <h3 className="mb-2 mt-5 text-base">{formatted.change}</h3>
            {formatted.context.map((line) => (
              <p key={line} className="text-[12px] leading-[1.7] text-muted">
                {line}
              </p>
            ))}
            {reviewing ? (
              <Note>
                Published content stays unchanged until you approve. A conflicting newer edit must be reviewed again rather
                than overwritten.
              </Note>
            ) : (
              <Note>
                {open.status === 'PENDING'
                  ? 'Waiting for Super Admin review. Published content stays unchanged until it is approved.'
                  : open.status === 'REJECTED'
                    ? `Rejected${open.reason ? `: ${open.reason}` : '.'}`
                    : 'Published.'}
              </Note>
            )}
            <DraftChanges draft={formatted} />
            {reviewing && (
              <div className="mt-4">
                <TextAreaField label="Reason for rejection (required to reject)" value={reason} onChange={(e) => setReason(e.target.value)} />
              </div>
            )}
          </>
        )}
      </Modal>
    </>
  );
}
