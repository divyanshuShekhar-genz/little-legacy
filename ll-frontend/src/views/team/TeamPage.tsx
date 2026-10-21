import { useState } from 'react';
import { plural } from '@/utils/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { Note, Panel } from '@/components/ui/Panel';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ROLE_LABELS } from '@/constants/permissions';
import { useAdmins, type TeamMember } from '@/api/admins';
import { AdminFormModal } from './AdminFormModal';

/**
 * Reference implementation for a feature module: query hook → table → form modal → mutation.
 * Guide §2 · prototype accounts.js.
 */
export function TeamPage() {
  const { data: admins, isLoading } = useAdmins();
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [open, setOpen] = useState(false);

  const openEditor = (admin: TeamMember | null) => {
    setEditing(admin);
    setOpen(true);
  };

  return (
    <>
      <PageHeader
        eyebrow="Team & Permissions"
        title="Team & Permissions"
        subtitle="Each Sub Admin has a separate account and its own section access."
        actions={
          <Button variant="primary" onClick={() => openEditor(null)}>
            + Add Sub Admin
          </Button>
        }
      />

      <Panel>
        <DataTable
          loading={isLoading}
          rows={admins}
          rowKey={(a) => a.id}
          columns={[
            { header: 'Admin', cell: (a) => <b>{a.name}</b> },
            { header: 'Email', cell: (a) => a.email },
            { header: 'Role', cell: (a) => ROLE_LABELS[a.role] },
            { header: 'Permissions', cell: (a) => (a.role === 'SUPER_ADMIN' ? 'All sections' : plural(a.permissions.length, 'section')) },
            {
              header: 'Publishing',
              className: 'whitespace-normal',
              cell: (a) =>
                a.role === 'SUPER_ADMIN' || a.directPublish ? 'Direct publish enabled' : 'Drafts require Super Admin approval',
            },
            // Ours: the prototype has no account status.
            { header: 'Status', cell: (a) => (a.active ? <Badge tone="success">Active</Badge> : <Badge tone="neutral">Inactive</Badge>) },
            {
              header: '',
              cell: (a) =>
                a.role === 'SUPER_ADMIN' ? <Badge tone="success">Full access</Badge> : <Button onClick={() => openEditor(a)}>Edit permissions</Button>,
            },
          ]}
        />
      </Panel>

      <Note>
        Super Admin alone manages accounts and views audit history. The direct-publish toggle does not grant access to
        extra sections.
      </Note>

      <AdminFormModal open={open} admin={editing} onClose={() => setOpen(false)} />
    </>
  );
}
