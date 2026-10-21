import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { LibraryImage } from '@/components/library/LibraryImage';
import { useActivity } from '@/api/activities';
import { pText } from './ConfirmModal';
import { EditorCard } from './parts';

/** Prototype folder-alignment.js `act === 'view'`: a read-only look at one activity (docs/API_REQUESTS.md #7). */
export function ViewActivityModal({ activityId, onClose }: { activityId: string | null; onClose: () => void }) {
  const { data: activity, isLoading } = useActivity(activityId);

  return (
    <Modal open={Boolean(activityId)} onClose={onClose} title={activity?.title ?? ''} footer={<Button onClick={onClose}>Close</Button>}>
      {isLoading && <p className="text-muted">Loading…</p>}
      {activity && (
        <>
          <p className={pText}>
            {activity.area.name} · {activity.age} years · {activity.durationMinutes} mins
          </p>
          <div className="mb-[15px] rounded-[12px] bg-message p-5 leading-[1.8]">{activity.description}</div>
          <p className={pText}>
            <b>Materials:</b> {activity.materials || '—'}
          </p>
          <h3>Steps ({activity.steps.length})</h3>
          {activity.steps.map((s, i) => (
            <EditorCard key={i}>
              <h4 className="mb-2.5 font-bold">
                {i + 1}. {s.title}
              </h4>
              <p className={pText}>{s.description}</p>
            </EditorCard>
          ))}
          <h3>Activity Previews</h3>
          <div className="grid grid-cols-3 gap-2.5 max-[650px]:grid-cols-1">
            {activity.previews.map((p, i) => (
              <EditorCard key={i}>
                {p.imageUrl ? (
                  <LibraryImage src={p.imageUrl} label={p.caption ?? 'Preview'} className="h-[110px] w-full" />
                ) : (
                  <div className="bg-canvas px-2 py-[25px] text-center text-[12px] text-faint">No image added</div>
                )}
                <p className={pText}>{p.caption}</p>
              </EditorCard>
            ))}
          </div>
        </>
      )}
    </Modal>
  );
}
