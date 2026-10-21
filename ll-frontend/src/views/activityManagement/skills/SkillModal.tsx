import { useLayoutEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Modal } from '@/components/ui/Modal';
import { FormGrid, SelectField, TextField } from '@/components/ui/Field';
import { DecisionActions, type SaveMode } from '@/components/DecisionActions';
import { useAgeGroups, useAreas } from '@/api/areas';
import { useSaveSkill, type Skill } from '@/api/skills';
import { pText } from '../ConfirmModal';
import { saveWith } from '../saved';

interface SkillForm {
  name: string;
  areaId: string;
  /** expected[`a${age}`] = "" (not set) or a whole % from 0 to 100. */
  expected: Record<string, string>;
}

/**
 * Prototype personalisation.js `skillEditor()`: a skill belongs to one development area. Connected
 * to docs/API_REQUESTS.md #16, which adds the guide's (§10) expected score per age; a skill below
 * its expected score is suggested first. Messages come from the API. Skills can't be deleted.
 */
export function SkillModal({ open, skill, regionId, onClose }: { open: boolean; skill?: Skill; regionId: string; onClose: () => void }) {
  const save = useSaveSkill();
  const { data: areas } = useAreas(regionId);
  const { data: ageGroups } = useAgeGroups(regionId);
  const ages = (ageGroups ?? []).map((g) => g.age);
  const { register, reset, getValues } = useForm<SkillForm>();

  useLayoutEffect(() => {
    if (!open) return;
    reset({
      name: skill?.name ?? '',
      areaId: skill?.area.id ?? areas?.[0]?.id ?? '',
      expected: Object.fromEntries(ages.map((age) => [`a${age}`, String(skill?.expected.find((e) => e.age === age)?.expectedScore ?? '')])),
    });
    // Values are taken when the dialog opens (and once the lists arrive).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, skill, areas?.length, ages.length]);

  const onSave = async (mode: SaveMode) => {
    const v = getValues();
    const name = v.name.trim();
    const expected = ages
      .filter((age) => (v.expected[`a${age}`] ?? '').trim() !== '')
      .map((age) => ({ age, expectedScore: Number(v.expected[`a${age}`]) }));
    const result = await saveWith(() => save.mutateAsync({ id: skill?.id, mode, areaId: v.areaId, name, expected }), `Saved skill ${name}`);
    if (result) onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={skill ? 'Edit skill' : 'Add skill'}
      footer={<DecisionActions onClose={onClose} onSave={onSave} showReject={false} busy={save.isPending} />}
    >
      {open && (
        <form onSubmit={(e) => e.preventDefault()}>
          <TextField label="Skill name" {...register('name')} />
          <SelectField label="Development area" options={(areas ?? []).map((a) => ({ value: a.id, label: a.name }))} {...register('areaId')} />
          <h3>Expected score by age</h3>
          <p className={pText}>The score (%) a child of each age is expected to reach. Skills below it are suggested first. Leave empty if not set.</p>
          <FormGrid>
            {ages.map((age) => (
              <TextField key={age} label={`Age ${age} (%)`} type="number" min={0} max={100} step={1} {...register(`expected.a${age}`)} />
            ))}
          </FormGrid>
        </form>
      )}
    </Modal>
  );
}
