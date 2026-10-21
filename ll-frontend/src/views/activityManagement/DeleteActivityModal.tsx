import { useActivity, useDeleteActivity, type ActivityRow } from '@/api/activities';
import { ApiConfirmModal, pText } from './ConfirmModal';
import { saveWith } from './saved';

/**
 * Delete or withdraw an activity (docs/API_REQUESTS.md #7). Both use the same endpoint: an
 * activity no child has done is deleted; one with child records is withdrawn (no longer offered,
 * gone from every list, history and earned scores kept, guide §13). The dialog says which.
 */
export function DeleteActivityModal({ activity, onClose }: { activity: ActivityRow | null; onClose: () => void }) {
  const { data: detail, isLoading } = useActivity(activity?.id);
  const remove = useDeleteActivity();
  const withdraw = Boolean(detail?.hasChildRecords);

  return (
    <ApiConfirmModal
      open={Boolean(activity)}
      title={isLoading ? 'Delete Activity' : withdraw ? 'Withdraw Activity' : 'Delete Activity'}
      busy={isLoading || remove.isPending}
      onClose={onClose}
      onSave={async (mode) =>
        Boolean(
          activity &&
            (await saveWith(
              () => remove.mutateAsync({ id: activity.id, mode }),
              `${withdraw ? 'Withdrew' : 'Deleted'} activity: ${activity.title}`,
            )),
        )
      }
    >
      {activity && isLoading && <p className={pText}>Checking for child records…</p>}
      {activity && !isLoading && withdraw && (
        <>
          <p className={pText}>
            Children have already done <b>{activity.title}</b>, so it can’t be deleted. Withdraw it instead?
          </p>
          <p className={pText}>It will no longer be offered and leaves every list. Child records, earned scores and history stay unchanged.</p>
        </>
      )}
      {activity && !isLoading && !withdraw && (
        <p className={pText}>Remove {activity.title} from the activity registry? Its activities become unavailable; child records and earned scores remain.</p>
      )}
    </ApiConfirmModal>
  );
}
