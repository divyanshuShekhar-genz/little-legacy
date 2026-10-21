import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { formatMarks } from '@/utils/format';
import { useLearningRecord } from '@/api/children';

const OUTCOME_LABELS = { INDEPENDENT: 'Independently', WITH_HELP: 'With some help' } as const;

/** Prototype admin-rebuild.js `readChild()`: "{name} · Learning record", read only. */
export function LearningRecordModal({ childId, childName, onClose }: { childId: string | null; childName: string; onClose: () => void }) {
  const { data: record, isLoading } = useLearningRecord(childId);

  return (
    <Modal open={Boolean(childId)} onClose={onClose} title={`${childName} · Learning record`} footer={<Button onClick={onClose}>Close</Button>}>
      {isLoading || !record ? (
        <p className="leading-[1.7] text-muted">Loading…</p>
      ) : !record.hasRecords ? (
        <p className="leading-[1.7] text-muted">No assessment recorded. Parents complete the questionnaire in the parent app.</p>
      ) : (
        <>
          <p className="mb-6 leading-[1.7] text-muted">
            Read-only · {record.child.parentName} ·{' '}
            {record.ruleVersion === null ? 'Questionnaire not recorded' : `Rule version ${record.ruleVersion}`}
          </p>
          <DataTable
            rows={record.areas}
            rowKey={(a) => a.name}
            columns={[
              { header: 'Area', cell: (a) => a.name },
              { header: 'Questionnaire', cell: (a) => formatMarks(a.questionnaire) },
              { header: 'Activity', cell: (a) => formatMarks(a.activity) },
              { header: 'Level', cell: (a) => a.level },
            ]}
          />
          <h3>Activity outcomes</h3>
          <DataTable
            rows={record.outcomes}
            rowKey={(o) => `${o.activity}-${o.at}`}
            columns={[
              { header: 'Activity', cell: (o) => o.activity },
              { header: 'Outcome', cell: (o) => OUTCOME_LABELS[o.outcome] },
              { header: 'Score', cell: (o) => formatMarks(o.score) },
            ]}
          />
          <h3>Unsuccessful attempts · admin only</h3>
          <DataTable
            rows={record.unsuccessful}
            rowKey={(u) => `${u.activity}-${u.at}`}
            columns={[
              { header: 'Activity', cell: (u) => u.activity },
              { header: 'Date', cell: (u) => new Date(u.at).toLocaleString() },
            ]}
          />
        </>
      )}
    </Modal>
  );
}
