import { PageHeader } from '@/components/ui/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { DataTable } from '@/components/ui/DataTable';
import { useFeedback } from '@/api/feedback';

const orDash = (v: string | null) => v || '—';

/** Prototype workspace.js "Feedback": parent notes and satisfaction from activity reviews. Read only. */
export function FeedbackPage() {
  const { data, isLoading } = useFeedback();

  return (
    <>
      <PageHeader
        back={{ to: '/users', label: 'User Management' }}
        eyebrow="Feedback"
        title="Parent feedback"
        subtitle="Parent notes and satisfaction from activity reviews."
      />
      <Panel>
        <DataTable
          loading={isLoading}
          rows={data}
          rowKey={(r) => r.id}
          columns={[
            { header: 'Child', cell: (r) => r.childName },
            { header: 'Activity', cell: (r) => r.activity },
            { header: 'Difficulty', cell: (r) => orDash(r.difficulty) },
            { header: 'Enjoyment', cell: (r) => orDash(r.enjoyment) },
            { header: 'Feedback', cell: (r) => orDash(r.note) },
          ]}
        />
      </Panel>
    </>
  );
}
