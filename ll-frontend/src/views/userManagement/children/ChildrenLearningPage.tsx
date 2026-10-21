import { useDeferredValue, useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { Toolbar } from '@/components/ui/Toolbar';
import { DataTable } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { formatMarks } from '@/utils/format';
import { useChildren, type ChildLearningRow } from '@/api/children';
import { LearningRecordModal } from './LearningRecordModal';

const marks = (n: number | null) => (n === null ? '—' : formatMarks(n));

/**
 * Guide §4, §7 · prototype assessment-ui.js `renderAssessmentChildren` + admin-rebuild.js
 * (read-only learning record). Questionnaire and activity marks stay separate.
 */
export function ChildrenLearningPage() {
  const [search, setSearch] = useState('');
  const [area, setArea] = useState('');
  const [open, setOpen] = useState<ChildLearningRow | null>(null);
  const deferredSearch = useDeferredValue(search.trim());
  const { data, isLoading } = useChildren({ search: deferredSearch, area });

  return (
    <>
      <PageHeader
        back={{ to: '/users', label: 'User Management' }}
        eyebrow="Children & Learning"
        title="Children & Learning"
        subtitle="Separate questionnaire and activity records for every child."
      />
      <Toolbar
        search={search}
        onSearch={setSearch}
        filter={area}
        onFilter={setArea}
        filters={(data?.areas ?? []).map((a) => ({ value: a, label: a }))}
      />
      <Panel>
        <DataTable
          loading={isLoading}
          rows={data?.rows}
          rowKey={(c) => c.id}
          columns={[
            {
              header: 'Child / Parent',
              cell: (c) => (
                <>
                  {c.name}
                  <br />
                  <small className="text-muted">{c.parentName}</small>
                </>
              ),
            },
            { header: 'Age', cell: (c) => c.age ?? '—' },
            {
              header: 'Assessment',
              className: 'whitespace-normal',
              cell: (c) =>
                c.assessmentStartedAt ? `Started ${new Date(c.assessmentStartedAt).toLocaleDateString()}` : 'Questionnaire not recorded',
            },
            { header: 'Questionnaire marks', cell: (c) => marks(c.questionnaireMarks) },
            { header: 'Activity marks', cell: (c) => marks(c.activityMarks) },
            { header: 'Rules', cell: (c) => (c.ruleVersion === null ? 'Assigned on submission' : `Version ${c.ruleVersion}`) },
            {
              header: '',
              cell: (c) => (
                <Button onClick={() => setOpen(c)}>{c.assessmentStartedAt ? 'Assessment details' : 'First questionnaire'}</Button>
              ),
            },
          ]}
        />
      </Panel>
      <LearningRecordModal childId={open?.id ?? null} childName={open?.name ?? ''} onClose={() => setOpen(null)} />
    </>
  );
}
