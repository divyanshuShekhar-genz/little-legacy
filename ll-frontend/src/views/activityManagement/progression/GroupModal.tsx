import { useEffect, useLayoutEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Modal } from '@/components/ui/Modal';
import { CheckboxField, FormGrid, SelectField, TextField } from '@/components/ui/Field';
import { DecisionActions, type SaveMode } from '@/components/DecisionActions';
import type { AgeGroup, DevelopmentArea } from '@/api/areas';
import { useCategories } from '@/api/categories';
import { useSkills } from '@/api/skills';
import { BASE_NAMES, useSaveGroup, type ActivityGroup, type BaseName } from '@/api/progression';
import { pText } from '../ConfirmModal';
import { saveWith } from '../saved';

interface GroupForm {
  name: string;
  areaId: string;
  age: string;
  categoryId: string;
  skillId: string;
  benchmark: string;
  mandatory: 'No' | 'Yes';
  bases: Record<string, boolean>;
}

/**
 * Prototype activity-progression.js `progressionFamily()`: an activity with its own difficulty
 * levels. Completing one group never advances another. Connected to /api/activity-groups
 * (docs/API_REQUESTS.md #14); messages come from the API.
 * - The age must already be one of the region's age groups (the API doesn't add it), so only those
 *   are offered.
 * - Area and category are locked while the group has difficulties: each difficulty keeps an area
 *   Level on that area's ladder (backend decision 4a).
 */
export function GroupModal({ open, group, regionId, areas, ageGroups, onClose }: {
  open: boolean;
  group?: ActivityGroup;
  regionId: string;
  areas: DevelopmentArea[];
  ageGroups: AgeGroup[];
  onClose: () => void;
}) {
  const save = useSaveGroup();
  const { data: skills } = useSkills(regionId);
  const { register, reset, getValues, watch, setValue } = useForm<GroupForm>();
  const locked = Boolean(group?.levels.length);

  const areaId = watch('areaId');
  const { data: categories } = useCategories(open ? areaId : null);

  useLayoutEffect(() => {
    if (!open) return;
    reset({
      name: group?.name ?? '',
      areaId: group?.areaId ?? areas[0]?.id ?? '',
      age: String(group?.age ?? ageGroups[0]?.age ?? ''),
      categoryId: group?.categoryId ?? '',
      skillId: group?.skillId ?? '',
      benchmark: String(group?.benchmark ?? 50),
      mandatory: group?.mandatory ? 'Yes' : 'No',
      bases: Object.fromEntries(BASE_NAMES.map((b) => [b, group ? group.bases.includes(b) : true])),
    });
    // Values are taken when the dialog opens only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, group, reset]);

  // Keep the category on one of the chosen area's (none when it has no categories).
  useEffect(() => {
    if (!open || !categories || locked) return;
    const current = getValues('categoryId');
    if (categories.length && !categories.some((c) => c.id === current)) setValue('categoryId', categories[0]!.id);
    if (!categories.length && current) setValue('categoryId', '');
  }, [open, categories, locked]);

  const onSave = async (mode: SaveMode) => {
    const v = getValues();
    const name = v.name.trim();
    const result = await saveWith(
      () =>
        save.mutateAsync({
          id: group?.id,
          mode,
          input: {
            name,
            // Disabled (locked) fields read back as undefined: keep the group's own.
            areaId: locked ? group!.areaId : v.areaId,
            categoryId: locked ? group!.categoryId : v.categoryId || null,
            age: Number(v.age),
            skillId: v.skillId || null,
            benchmark: Number(v.benchmark),
            mandatory: v.mandatory === 'Yes',
            bases: BASE_NAMES.filter((b): b is BaseName => Boolean(v.bases[b])),
          },
        }),
      `Updated activity group ${name}`,
    );
    if (result) onClose();
  };

  const lockedHint = locked ? 'Move or remove this group’s difficulty levels before changing its area or category.' : undefined;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={group ? 'Edit activity group' : 'Add activity with its own levels'}
      footer={<DecisionActions onClose={onClose} onSave={onSave} showReject={false} busy={save.isPending} />}
    >
      {open && (
        <form onSubmit={(e) => e.preventDefault()}>
          <p className={pText}>Example: Building Blocks contains its own Level 1, Level 2 and Level 3. Completing it never advances Balance Walk.</p>
          <FormGrid>
            <TextField label="Activity name" {...register('name')} />
            <SelectField
              label="Development area"
              disabled={locked}
              hint={lockedHint}
              options={areas.map((a) => ({ value: a.id, label: a.name }))}
              {...register('areaId', { onChange: () => setValue('skillId', '') })}
            />
            <SelectField
              label="Age in completed years"
              hint={ageGroups.length ? undefined : 'Add an age group first.'}
              options={ageGroups.map((g) => ({ value: String(g.age), label: String(g.age) }))}
              {...register('age')}
            />
            {Boolean(categories?.length) && (
              <SelectField
                label="Category · optional when none exist"
                disabled={locked}
                options={categories!.map((c) => ({ value: c.id, label: c.name }))}
                {...register('categoryId')}
              />
            )}
            <SelectField
              label="Primary skill"
              options={[
                { value: '', label: 'Not tagged' },
                ...(skills ?? []).filter((s) => s.area.id === (locked ? group!.areaId : areaId)).map((s) => ({ value: s.id, label: s.name })),
              ]}
              {...register('skillId')}
            />
            <TextField label="Expected skill score (%)" type="number" min={0} step="any" {...register('benchmark')} />
            <SelectField
              label="Mandatory during initial assessment"
              options={[
                { value: 'No', label: 'No' },
                { value: 'Yes', label: 'Yes' },
              ]}
              {...register('mandatory')}
            />
          </FormGrid>
          <p className={pText}>Starting Base eligibility</p>
          {BASE_NAMES.map((b) => (
            <CheckboxField key={b} label={b} {...register(`bases.${b}`)} />
          ))}
        </form>
      )}
    </Modal>
  );
}
