import { useLayoutEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Modal } from '@/components/ui/Modal';
import { FormGrid, SelectField, TextField } from '@/components/ui/Field';
import { DecisionActions, type SaveMode } from '@/components/DecisionActions';
import { useSaveProgression, type ProgressionSettings } from '@/api/progression';
import { pText } from '../ConfirmModal';
import { saveWith } from '../saved';

type SettingsForm = Record<string, string>;

const COUNTS = ['weekly', 'pendingLimit', 'pendingDays', 'recent', 'continueCount'] as const;
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const RESET_OPTIONS = [
  { value: 'anniversary', label: 'Every 7 days from cycle start' },
  ...WEEKDAYS.map((d, i) => ({ value: String(i), label: `${d} · 00:00 UTC` })),
];

/**
 * Prototype activity-progression.js `progressionSettings()`: Development Bases and weekly
 * assignment settings, saved with the allocation overrides in one PUT (docs/API_REQUESTS.md #14).
 * Messages come from the API. Added: "Maximum visible activities" (`maxVisible`, guide §11), next
 * to the weekly limit: both weekly rules stay configurable (OPEN_QUESTIONS Q1). Blank = not used.
 */
export function SettingsModal({ open, regionId, settings, onClose }: { open: boolean; regionId: string; settings: ProgressionSettings; onClose: () => void }) {
  const save = useSaveProgression();
  const { register, reset, getValues } = useForm<SettingsForm>();

  useLayoutEffect(() => {
    if (!open) return;
    const values: SettingsForm = {
      pendingEnabled: settings.pendingEnabled ? 'On' : 'Off',
      pendingCounts: settings.pendingCounts ? 'Yes' : 'No',
      reinforcement: settings.reinforcement,
      resetDay: settings.resetDay,
      maxVisible: settings.maxVisible === null ? '' : String(settings.maxVisible),
    };
    settings.bases.forEach((b, i) => {
      values[`from${i}`] = String(b.from);
      values[`start${i}`] = String(b.start);
    });
    for (const k of COUNTS) values[k] = String(settings[k]);
    reset(values);
    // Values are taken when the dialog opens only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reset]);

  const onSave = async (mode: SaveMode) => {
    const v = getValues();
    const next: ProgressionSettings = {
      ...settings,
      bases: settings.bases.map((b, i) => ({ ...b, from: Number(v[`from${i}`]), start: Number(v[`start${i}`]) })),
      weekly: Number(v.weekly),
      maxVisible: (v.maxVisible ?? '').trim() === '' ? null : Number(v.maxVisible),
      pendingLimit: Number(v.pendingLimit),
      pendingDays: Number(v.pendingDays),
      recent: Number(v.recent),
      continueCount: Number(v.continueCount),
      pendingEnabled: v.pendingEnabled === 'On',
      pendingCounts: v.pendingCounts === 'Yes',
      reinforcement: v.reinforcement === 'easier' ? 'easier' : 'same',
      resetDay: v.resetDay ?? 'anniversary',
    };
    const result = await saveWith(() => save.mutateAsync({ regionId, mode, settings: next }), 'Updated activity progression settings');
    if (result) onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Activity progression settings"
      footer={<DecisionActions onClose={onClose} onSave={onSave} showReject={false} busy={save.isPending} />}
    >
      {open && (
        <form onSubmit={(e) => e.preventDefault()}>
          <h3>Development Base · starting point only</h3>
          <p className={pText}>
            Questionnaire answers are normalised against their maximum marks, then averaged using development-area weights to produce a result
            out of 100. Incomplete answers have no result. A Base chooses a starting difficulty; it does not increase all activities together.
            These initial ranges are editable.
          </p>
          <FormGrid>
            {settings.bases.map((b, i) => (
              <div key={b.name} className="contents">
                <TextField label={`${b.name} starts at (%)`} type="number" min={0} step="any" {...register(`from${i}`)} />
                <TextField label={`${b.name} starting activity difficulty`} type="number" min={0} step="any" {...register(`start${i}`)} />
              </div>
            ))}
          </FormGrid>
          <h3>Weekly assignments</h3>
          <FormGrid>
            <TextField label="New activities per week" type="number" min={0} step="any" {...register('weekly')} />
            <TextField
              label="Maximum visible activities"
              type="number"
              min={1}
              step={1}
              hint="Optional. When set, next week's count is last week's completions + 5, capped here. Blank = not used."
              {...register('maxVisible')}
            />
            <SelectField label="Pending activities" options={[{ value: 'On', label: 'On' }, { value: 'Off', label: 'Off' }]} {...register('pendingEnabled')} />
            <TextField label="Maximum pending displayed" type="number" min={0} step="any" {...register('pendingLimit')} />
            <TextField label="Pending expiry in days · 0 means no expiry" type="number" min={0} step="any" {...register('pendingDays')} />
            <SelectField
              label="Pending counts within weekly limit"
              options={[{ value: 'No', label: 'No' }, { value: 'Yes', label: 'Yes' }]}
              {...register('pendingCounts')}
            />
            <TextField label="Recent completions shown" type="number" min={0} step="any" {...register('recent')} />
            <TextField label="Continue Learning cards" type="number" min={0} step="any" {...register('continueCount')} />
            <SelectField
              label="After an unable outcome"
              options={[{ value: 'same', label: 'same' }, { value: 'easier', label: 'easier' }]}
              {...register('reinforcement')}
            />
            <SelectField label="Weekly boundary" options={RESET_OPTIONS} {...register('resetDay')} />
          </FormGrid>
          <p className={pText}>
            Default: 20 new activities plus up to 10 pending. Expired or excess pending cards leave the display and may be selected again later. No
            history or points are deleted. A fixed UTC weekday may give a shorter first week; device timezone changes never grant another attempt.
          </p>
          <p className={pText}>
            Same: retry the same difficulty next week. Easier: offer the nearest lower difficulty without repetitions complete, when available. Earned levels remain
            recorded. An activity disappears for the week after any outcome; only Independent counts toward repetitions.
          </p>
        </form>
      )}
    </Modal>
  );
}
