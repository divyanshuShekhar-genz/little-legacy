import { useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/ui/PageHeader';
import { Note, Panel } from '@/components/ui/Panel';
import { DataTable } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { SelectField } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/hooks/useAuth';
import { formatDateTime, plural } from '@/utils/format';
import { errorMessage } from '@/api/client';
import { useAppContent, useDeleteEntry } from '@/api/appContent';
import { SURFACES, SURFACE_LABELS, type AppContentEntry, type AppContentSurface } from './data';
import { EntryModal } from './EntryModal';
import { PublishModal } from './PublishModal';

const ALL = 'All';

/**
 * App Content (guide §22). Prototype parent-content.js `renderAppContent()`: the words on Terms,
 * Privacy, Help / enquiry and per-page FAQs. Entry edits change a working draft that parents never
 * see; "Publish new version" snapshots the whole draft as version n+1 through the draft flow.
 * Deliberately unlike the prototype's global rule, entry edits don't need approval (guide §22:
 * static text has its own draft and publication process). Plan benefits aren't here (Q30).
 * The prototype's export buttons are left out. On the API (#24); before the first publish there is
 * no version ("Nothing published yet").
 */
export function AppContentPage() {
  const { isSuperAdmin } = useAuth();
  const { data, isLoading, isError, error } = useAppContent();
  const remove = useDeleteEntry();
  const [surface, setSurface] = useState<AppContentSurface>('TERMS');
  const [page, setPage] = useState(ALL);
  const [editing, setEditing] = useState<AppContentEntry | 'new' | null>(null);
  const [deleting, setDeleting] = useState<AppContentEntry | null>(null);
  const [publishing, setPublishing] = useState(false);

  const pages = [...new Set(data.entries.filter((e) => e.surface === 'PAGE_FAQ').map((e) => e.page!))];
  const rows = data.entries.filter((e) => e.surface === surface && (surface !== 'PAGE_FAQ' || page === ALL || e.page === page));
  const pending = data.pending;

  const onDelete = async () => {
    if (!deleting) return;
    try {
      await remove.mutateAsync(deleting.key);
      toast.success(`Removed draft content: ${deleting.key}`);
      setDeleting(null);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };
  const next = (data.latest?.version ?? 0) + 1;

  return (
    <>
      <PageHeader
        title="App Content"
        subtitle="Edit a draft, then publish a complete version. Existing parent sessions retain their selected version."
        actions={
          <Button variant="primary" onClick={() => setEditing('new')}>
            Add entry
          </Button>
        }
      />

      <div className="mb-[18px] flex flex-wrap gap-2.5">
        {SURFACES.map((s) => (
          <Button key={s} variant={s === surface ? 'primary' : 'default'} aria-pressed={s === surface} onClick={() => setSurface(s)}>
            {SURFACE_LABELS[s]}
          </Button>
        ))}
      </div>

      <Note>
        {isLoading
          ? 'Loading App Content…'
          : data.latest
          ? `Published version ${data.latest.version} · ${data.dirty ? 'Unpublished changes' : 'Draft matches published version'}.`
          : `Nothing published yet · ${plural(data.entries.length, 'entry', 'entries')} in the draft, all new to parents.`}{' '}
        Legal text remains placeholder wording until approved content is supplied.
        {pending?.status === 'PENDING_APPROVAL' && ` Version ${next} from ${pending.authorName} is waiting for Super Admin approval.`}
        {pending?.status === 'DRAFT' && ` A saved draft of version ${next} from ${pending.authorName} hasn’t been submitted yet.`}
        {isError && <span className="block text-danger">{errorMessage(error)}</span>}
      </Note>

      <Panel>
        {surface === 'PAGE_FAQ' && (
          <div className="mb-[18px] max-w-[320px]">
            <SelectField
              label="Parent page"
              value={page}
              onChange={(e) => setPage(e.target.value)}
              options={[{ value: ALL, label: 'All' }, ...pages.map((p) => ({ value: p, label: p }))]}
            />
          </div>
        )}
        <DataTable
          loading={isLoading}
          rows={rows}
          rowKey={(e) => e.key}
          columns={[
            {
              header: 'Key / page',
              cell: (e) => (
                <>
                  {e.key}
                  {e.page && (
                    <>
                      <br />
                      {e.page}
                    </>
                  )}
                </>
              ),
            },
            { header: 'Title', className: 'whitespace-normal', cell: (e) => e.title },
            { header: 'Body', className: 'whitespace-normal', cell: (e) => (e.body.length > 150 ? `${e.body.slice(0, 150)}…` : e.body) },
            {
              header: '',
              cell: (e) => (
                <div className="flex gap-2">
                  <Button onClick={() => setEditing(e)}>Edit</Button>
                  <Button onClick={() => setDeleting(e)}>Delete</Button>
                </div>
              ),
            },
          ]}
        />
      </Panel>

      <div className="mb-[25px] flex flex-wrap gap-2.5">
        <Button variant="primary" onClick={() => setPublishing(true)}>
          {isSuperAdmin && pending?.status === 'PENDING_APPROVAL' ? 'Review version for approval' : 'Publish new version'}
        </Button>
      </div>

      <Panel title="Published history">
        <DataTable
          loading={isLoading}
          rows={data.versions}
          rowKey={(v) => v.version}
          columns={[
            { header: 'Version', cell: (v) => v.version },
            { header: 'Published', cell: (v) => formatDateTime(v.publishedAt) },
            { header: 'Entries', cell: (v) => v.entryCount },
            // Ours: who asked for the publish (the approver is in Draft approvals / Audit History).
            { header: 'Published by', cell: (v) => v.publishedByName ?? '—' },
          ]}
        />
      </Panel>

      <EntryModal
        open={editing !== null}
        entry={editing === 'new' ? undefined : (editing ?? undefined)}
        defaultSurface={surface}
        defaultPage={surface === 'PAGE_FAQ' && page !== ALL ? page : ''}
        onClose={() => setEditing(null)}
      />
      <Modal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Delete draft entry"
        footer={
          <div className="flex flex-wrap justify-end gap-2.5">
            <Button onClick={() => setDeleting(null)}>Close</Button>
            <Button variant="primary" onClick={onDelete} disabled={remove.isPending}>
              Delete
            </Button>
          </div>
        }
      >
        {deleting && <p className="mb-6 mt-2 leading-[1.7] text-muted">Remove {deleting.key} from the next version? Published versions are preserved.</p>}
      </Modal>
      <PublishModal open={publishing} onClose={() => setPublishing(false)} />
    </>
  );
}
