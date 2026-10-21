import { useLayoutEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Modal } from '@/components/ui/Modal';
import { FormGrid, SelectField, TextField } from '@/components/ui/Field';
import { DecisionActions, type SaveMode } from '@/components/DecisionActions';
import type { AgeGroup, DevelopmentArea } from '@/api/areas';
import { BASE_NAMES, useSaveProgression, type AllocationOverride, type ProgressionSettings } from '@/api/progression';
import { PLAN_LABELS, PLAN_TIERS } from '@/constants/plans';
import { pText } from '../ConfirmModal';
import { saveWith } from '../saved';

type RuleForm = Record<'age' | 'base' | 'area' | 'plan' | 'limit' | 'start', string>;

const ALL = { value: 'All', label: 'All' };

/**
 * Prototype activity-progression.js `progressionOverride()`: an Age / Base / area / plan allocation
 * rule. Overrides are part of the settings, so saving sends them all in one PUT
 * (docs/API_REQUESTS.md #14). Areas are sent by id and plans as FREE / PLUS / PREMIUM, shown by
 * name. Messages (duplicates, numbers) come from the API.
 */
export function AllocationRuleModal({ open, index, regionId, settings, areas, ageGroups, onClose }: {
  open: boolean;
  /** The row being edited; undefined = a new rule. */
  index?: number;
  regionId: string;
  settings: ProgressionSettings;
  areas: DevelopmentArea[];
  ageGroups: AgeGroup[];
  onClose: () => void;
}) {
  const save = useSaveProgression();
  const { register, reset, getValues } = useForm<RuleForm>();

  useLayoutEffect(() => {
    if (!open) return;
    const r = index === undefined ? undefined : settings.overrides[index];
    reset({
      age: r?.age ?? 'All',
      base: r?.base ?? 'All',
      area: r?.area ?? 'All',
      plan: r?.plan ?? 'All',
      limit: String(r?.limit ?? settings.weekly),
      start: String(r?.start ?? 1),
    });
    // Values are taken when the dialog opens only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, index, reset]);

  const onSave = async (mode: SaveMode) => {
    const v = getValues();
    const row: AllocationOverride = { age: v.age, base: v.base, area: v.area, plan: v.plan, limit: Number(v.limit), start: Number(v.start) };
    const overrides = index === undefined ? [...settings.overrides, row] : settings.overrides.map((x, i) => (i === index ? row : x));
    const result = await saveWith(() => save.mutateAsync({ regionId, mode, settings: { ...settings, overrides } }), 'Updated scoped activity allocation');
    if (result) onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Age / Base / area allocation"
      footer={<DecisionActions onClose={onClose} onSave={onSave} showReject={false} busy={save.isPending} />}
    >
      {open && (
        <form onSubmit={(e) => e.preventDefault()}>
          <p className={pText}>
            These rules apply only to the selected regional learning category. More specific matches win; equally specific matches use the order
            shown. An area rule caps that area within the total weekly allocation.
          </p>
          <FormGrid>
            <SelectField label="Age" options={[ALL, ...ageGroups.map((g) => ({ value: String(g.age), label: String(g.age) }))]} {...register('age')} />
            <SelectField label="Development Base" options={[ALL, ...BASE_NAMES.map((b) => ({ value: b, label: b }))]} {...register('base')} />
            <SelectField label="Development area" options={[ALL, ...areas.map((a) => ({ value: a.id, label: a.name }))]} {...register('area')} />
            <SelectField label="Plan" options={[ALL, ...PLAN_TIERS.map((p) => ({ value: p, label: PLAN_LABELS[p] }))]} {...register('plan')} />
            <TextField label="Weekly limit" type="number" min={0} step="any" {...register('limit')} />
            <TextField label="Starting difficulty" type="number" min={0} step="any" {...register('start')} />
          </FormGrid>
        </form>
      )}
    </Modal>
  );
}
