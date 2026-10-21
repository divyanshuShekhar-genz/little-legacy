import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { DataTable } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { CountryAccessButton } from '@/components/CountryAccessButton';
import { humanize } from '@/components/ui/Badge';
import { errorMessage } from '@/api/client';
import { useAuth } from '@/hooks/useAuth';
import { useCommunity, useSaveVisibleLimit, type ParentPost, type PostStatus, type TeamPost } from '@/api/community';
import { ReviewPostModal } from './ReviewPostModal';
import { TeamPostModal } from './TeamPostModal';
import { DRAFT_SAVED } from '@/constants/messages';

const statusLabel = (p: { status: PostStatus; pinned: boolean }) => humanize(p.status) + (p.pinned && p.status === 'PUBLISHED' ? ' · Pinned' : '');
const expiryLabel = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : 'Not set');

/** Guide §16 · prototype admin-rebuild.js `communityWorkspace()`. */
export function CommunityPage() {
  const { data, isLoading } = useCommunity();
  const [reviewing, setReviewing] = useState<ParentPost | null>(null);
  const [teamPost, setTeamPost] = useState<{ open: boolean; post: TeamPost | null }>({ open: false, post: null });

  return (
    <>
      <PageHeader
        back={{ to: '/users', label: 'User Management' }}
        eyebrow="Community"
        title="Community"
        subtitle="Review parent messages manually. Team messages can be posted directly."
        actions={
          <>
            <CountryAccessButton types={['COMMUNITY']} />
            <Button onClick={() => setTeamPost({ open: true, post: null })}>Add team post</Button>
          </>
        }
      />

      <Panel title="Parent messages">
        <DataTable
          loading={isLoading}
          rows={data?.parentPosts}
          rowKey={(p) => p.id}
          columns={[
            { header: 'Parent', cell: (p) => p.parentName },
            { header: 'Message', className: 'whitespace-normal', cell: (p) => p.message },
            { header: 'Status', cell: statusLabel },
            { header: 'Expiry', cell: (p) => expiryLabel(p.expiresAt) },
            { header: '', cell: (p) => <Button onClick={() => setReviewing(p)}>Review message</Button> },
          ]}
        />
      </Panel>

      <Panel title="Team messages">
        <DataTable
          loading={isLoading}
          rows={data?.teamPosts}
          rowKey={(p) => p.id}
          columns={[
            { header: 'Title', cell: (p) => (p.pinned && p.status === 'PUBLISHED' ? `${p.title} · Pinned` : p.title) },
            { header: 'Message', className: 'whitespace-normal', cell: (p) => p.message },
            { header: 'Expiry', cell: (p) => expiryLabel(p.expiresAt) },
            { header: '', cell: (p) => <Button onClick={() => setTeamPost({ open: true, post: p })}>Edit</Button> },
          ]}
        />
      </Panel>

      {data && <VisibleLimitPanel current={data.settings.regularVisibleLimit} />}

      <p className="mb-6 mt-2 leading-[1.7] text-muted">Public attribution: Posted by a parent or Posted by Little Legacy team.</p>

      <ReviewPostModal post={reviewing} onClose={() => setReviewing(null)} />
      <TeamPostModal open={teamPost.open} post={teamPost.post} onClose={() => setTeamPost({ open: false, post: null })} />
    </>
  );
}

/** Guide §16: maximum regular messages visible at once; pinned ones are extra. */
function VisibleLimitPanel({ current }: { current: number }) {
  const { canPublish } = useAuth();
  const save = useSaveVisibleLimit();
  const [value, setValue] = useState(String(current));
  useEffect(() => setValue(String(current)), [current]);

  const submit = async () => {
    const limit = Number(value);
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      toast.error('Enter a whole number from 1 to 100.');
      return;
    }
    try {
      const result = await save.mutateAsync({ mode: 'publish', regularVisibleLimit: limit });
      toast.success(result.status === 'draft' ? DRAFT_SAVED : 'Visible limit saved');
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <Panel title="Feed settings">
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid gap-[7px] text-xs text-body">
          <label htmlFor="visible-limit">Regular messages visible at once</label>
          <input
            id="visible-limit"
            className="input w-[120px]"
            type="number"
            min={1}
            max={100}
            step={1}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
        <Button variant="primary" onClick={submit} disabled={save.isPending || value === String(current)}>
          {canPublish ? 'Approve' : 'Submit for approval'}
        </Button>
      </div>
      <p className="mt-3 text-xs leading-[1.7] text-muted">
        Pinned messages are not counted or hidden by this limit. For example, a limit of {current} with 2 pinned messages shows{' '}
        {current + 2} messages.
      </p>
    </Panel>
  );
}
