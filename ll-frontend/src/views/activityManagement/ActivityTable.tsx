import { DataTable } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import type { ActivityRow } from '@/api/activities';

/**
 * Prototype folder-alignment.js `activityTable()`: used by a level's activities list and by the
 * Activities registry. Buttons are separated by a space, as in the prototype. Edit and Delete
 * show only to admins who can change activities.
 */
export function ActivityTable({ rows, loading, error, onView, onEdit, onDelete }: {
  rows: ActivityRow[] | undefined;
  loading?: boolean;
  error?: string;
  onView: (a: ActivityRow) => void;
  onEdit?: (a: ActivityRow) => void;
  onDelete?: (a: ActivityRow) => void;
}) {
  return (
    <DataTable
      rows={rows}
      loading={loading}
      error={error}
      rowKey={(a) => a.id}
      columns={[
        {
          header: 'Title',
          cell: (a) => (
            <>
              {a.title}
              <small className="mt-[5px] block text-[12px] text-muted">{a.description.slice(0, 60)}</small>
            </>
          ),
        },
        { header: 'Age band', cell: (a) => `${a.age} years` },
        { header: 'Duration', cell: (a) => `${a.durationMinutes} mins` },
        { header: 'Steps', cell: (a) => a.counts.steps },
        { header: 'Previews', cell: (a) => a.counts.previews },
        {
          header: 'Actions',
          cell: (a) => (
            <>
              <Button onClick={() => onView(a)}>View</Button>
              {onEdit && (
                <>
                  {' '}
                  <Button onClick={() => onEdit(a)}>Edit</Button>
                </>
              )}
              {onDelete && (
                <>
                  {' '}
                  <Button onClick={() => onDelete(a)}>Delete</Button>
                </>
              )}
            </>
          ),
        },
      ]}
    />
  );
}
