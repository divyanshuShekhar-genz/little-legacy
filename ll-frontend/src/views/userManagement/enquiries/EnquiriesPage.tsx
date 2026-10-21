import { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { DataTable } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { errorMessage } from '@/api/client';
import { useEnquiries, type Enquiry } from '@/api/enquiries';
import { ReplyModal } from './ReplyModal';

/**
 * Guide §17 · prototype admin-rebuild.js `enquiryWorkspace()`. One reply popup per enquiry, no live chat.
 * Status is not in the prototype's table: a sent reply moves New → In progress, and nothing marks
 * an enquiry resolved yet (OPEN_QUESTIONS Q17).
 */
export function EnquiriesPage() {
  const { data, isLoading, isError, error } = useEnquiries();
  const [replying, setReplying] = useState<Enquiry | null>(null);

  return (
    <>
      <PageHeader
        back={{ to: '/users', label: 'User Management' }}
        eyebrow="Enquiries"
        title="Enquiries"
        subtitle="Reply to parents through email, in-app notification, or both."
      />
      <Panel>
        <DataTable
          loading={isLoading}
          rows={data}
          rowKey={(q) => q.id}
          error={isError ? errorMessage(error) : undefined}
          columns={[
            { header: 'Parent', cell: (q) => q.parentName },
            { header: 'Enquiry', cell: (q) => q.message },
            { header: 'Status', cell: (q) => <StatusBadge status={q.status} /> },
            { header: '', cell: (q) => <Button onClick={() => setReplying(q)}>Reply</Button> },
          ]}
        />
      </Panel>
      <ReplyModal enquiry={replying} onClose={() => setReplying(null)} />
    </>
  );
}
