import { useDeferredValue, useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { Toolbar } from '@/components/ui/Toolbar';
import { DataTable } from '@/components/ui/DataTable';
import { errorMessage } from '@/api/client';
import { DIFFICULTY_ANSWERS, useActivityReviews, type DifficultyAnswer } from '@/api/activityReviews';
import { formatDuration, formatStamp } from '@/utils/format';

const orDash = (v: string | null) => v || '—';

/**
 * Guide §2 · prototype folder-alignment.js "Activity Reviews" + activity-timing.js (time column).
 * Completed activity records. Read only: these are records, not an approval queue. There is no
 * import: records come only from the parent-app API (OPEN_QUESTIONS Q18).
 */
export function ActivityReviewsPage() {
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState<DifficultyAnswer | ''>('');
  const { data, isLoading, isError, error } = useActivityReviews(difficulty);
  const term = useDeferredValue(search.trim().toLowerCase());

  // The endpoint filters by difficulty; search matches any field, as in the prototype.
  const rows = data?.filter((r) => !term || JSON.stringify(r).toLowerCase().includes(term));

  return (
    <>
      <PageHeader
        back={{ to: '/users', label: 'User Management' }}
        eyebrow="Activity Reviews"
        title="Activity reviews"
        subtitle="Completed activity records and parent feedback. These are records, not an approval queue."
      />
      <Toolbar
        search={search}
        onSearch={setSearch}
        filter={difficulty}
        onFilter={(v) => setDifficulty(v as DifficultyAnswer | '')}
        filters={DIFFICULTY_ANSWERS.map((d) => ({ value: d, label: d }))}
      />
      <Panel>
        <DataTable
          loading={isLoading}
          rows={rows}
          rowKey={(r) => r.id}
          error={isError ? errorMessage(error) : undefined}
          columns={[
            { header: 'Completed', cell: (r) => formatStamp(r.completedAt) },
            {
              header: 'Child',
              cell: (r) => (
                <>
                  {r.childName}
                  <small className="mt-[5px] block text-[12px] text-muted">{r.parentEmail}</small>
                </>
              ),
            },
            { header: 'Activity', cell: (r) => r.activity },
            { header: 'Repeat', cell: (r) => r.repeat },
            { header: 'Completion', cell: (r) => `${r.completionPercent}%` },
            { header: 'Difficulty', cell: (r) => orDash(r.difficulty) },
            { header: 'Enjoyment', cell: (r) => orDash(r.enjoyment) },
            { header: 'Parent note', className: 'whitespace-normal', cell: (r) => orDash(r.note) },
            { header: 'Time taken (active)', cell: (r) => formatDuration(r.elapsedSeconds) },
          ]}
        />
      </Panel>
    </>
  );
}
