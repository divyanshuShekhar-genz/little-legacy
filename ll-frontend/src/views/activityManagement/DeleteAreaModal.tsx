import { Modal } from '@/components/ui/Modal';
import { DecisionActions, type SaveMode } from '@/components/DecisionActions';
import { useDeleteArea, type DevelopmentArea } from '@/api/areas';
import { plural } from '@/utils/format';
import { saveWith } from './saved';

/**
 * Prototype workspace.js `area-delete` (docs/API_REQUESTS.md #5). Removes the area with its
 * questions, levels and activities; if children have used it, it's hidden instead and their
 * history stays. Review history and child records are never touched.
 */
export function DeleteAreaModal({ area, onClose, onDeleted }: { area: DevelopmentArea | null; onClose: () => void; onDeleted?: () => void }) {
  const remove = useDeleteArea();

  const onSave = async (mode: SaveMode) => {
    if (!area) return;
    const result = await saveWith(() => remove.mutateAsync({ id: area.id, mode }), `Deleted development area: ${area.name}`);
    if (!result) return;
    if (result.status === 'published') onDeleted?.();
    onClose();
  };

  return (
    <Modal
      open={Boolean(area)}
      onClose={onClose}
      title="Delete development area"
      footer={<DecisionActions onClose={onClose} onSave={onSave} showReject={false} busy={remove.isPending} />}
    >
      {area && (
        <>
          <p className="mb-6 mt-2 leading-[1.7] text-muted">
            Delete <b>{area.name}</b>, its {plural(area.counts.questions, 'question')}, {plural(area.counts.levels, 'level')} and {plural(area.counts.activities, 'activity')}?
          </p>
          <p className="mb-6 mt-2 leading-[1.7] text-muted">Saved review history remains. Child records, scores and history remain unchanged.</p>
        </>
      )}
    </Modal>
  );
}
