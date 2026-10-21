import { useLayoutEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Modal } from '@/components/ui/Modal';
import { SelectField } from '@/components/ui/Field';
import { DecisionActions, type SaveMode } from '@/components/DecisionActions';
import type { ActivityRow } from '@/api/activities';
import { useLinkActivity, type ActivityGroup } from '@/api/progression';
import { pText } from '../ConfirmModal';
import { saveWith } from '../saved';

/** Ungrouped activities that may join a group: same area, category and age. */
export const linkCandidates = (activities: ActivityRow[], g: ActivityGroup) =>
  activities.filter((a) => !a.group && a.area.id === g.areaId && a.age === g.age && (a.category?.id ?? null) === g.categoryId);

/**
 * Prototype activity-progression.js `progressionLink()`: move existing content into a group,
 * keeping its id (and so its history). Its Level number becomes its difficulty in the group
 * (POST /api/activity-groups/:id/link, docs/API_REQUESTS.md #14). Needs only Activity Progression.
 */
export function LinkContentModal({ group, candidates, onClose }: { group: ActivityGroup | null; candidates: ActivityRow[]; onClose: () => void }) {
  const link = useLinkActivity();
  const { register, reset, getValues } = useForm<{ activityId: string }>();

  useLayoutEffect(() => {
    if (group) reset({ activityId: candidates[0]?.id ?? '' });
    // Values are taken when the dialog opens only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group, reset]);

  const onSave = async (mode: SaveMode) => {
    if (!group) return;
    const activityId = getValues('activityId');
    const result = await saveWith(() => link.mutateAsync({ id: group.id, mode, activityId }), `Linked content to ${group.name}`);
    if (result) onClose();
  };

  return (
    <Modal
      open={Boolean(group)}
      onClose={onClose}
      title="Link existing content"
      footer={<DecisionActions onClose={onClose} onSave={onSave} showReject={false} busy={link.isPending} />}
    >
      {group && (
        <form onSubmit={(e) => e.preventDefault()}>
          <p className={pText}>
            This preserves the content and its ID. It moves into {group.name} for future progression previews. Existing child history is
            unchanged.
          </p>
          <SelectField
            label="Content"
            options={candidates.map((a) => ({ value: a.id, label: `${a.title} · Level ${a.level?.number ?? '—'}` }))}
            {...register('activityId')}
          />
        </form>
      )}
    </Modal>
  );
}
