import { useEffect, useLayoutEffect } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FormGrid, SelectField, TextAreaField, TextField } from '@/components/ui/Field';
import { FileUpload } from '@/components/ui/FileUpload';
import { PlanSelect } from '@/components/ui/PlanSelect';
import { humanize } from '@/components/ui/Badge';
import { DecisionActions, type SaveMode } from '@/components/DecisionActions';
import { useAreas } from '@/api/areas';
import { useCategories } from '@/api/categories';
import { useLevels } from '@/api/levels';
import {
  SKILL_STAGES,
  useActivity,
  useSaveActivity,
  useSkillOptions,
  type ActivityPreview,
  type ActivityStatus,
  type ActivityStep,
  type SkillStage,
} from '@/api/activities';
import type { PlanTier } from '@/constants/plans';
import { pText } from './ConfirmModal';
import { EditorCard, EditorCardRow, NoteText } from './parts';
import { saveWith } from './saved';

interface ActivityForm {
  title: string;
  areaId: string;
  categoryId: string;
  levelId: string;
  age: string;
  durationMinutes: string;
  materials: string;
  description: string;
  minimumPlan: PlanTier;
  baseMarks: string;
  masteryTarget: string;
  skillId: string;
  skillStage: SkillStage;
  status: ActivityStatus;
  /** Only in group mode: its difficulty in the group. */
  difficulty: string;
  steps: ActivityStep[];
  previews: { imageUrl: string | null; caption: string }[];
}

/**
 * Group mode (Activity Progression): the activity is one difficulty of this group, so its area,
 * category and age are the group's, and the editor sets its difficulty as well as its area Level.
 */
export interface DifficultyGroup {
  id: string;
  name: string;
  areaId: string;
  categoryId: string | null;
  age: number;
  /** The difficulty a new one gets: one above the highest. */
  nextDifficulty: number;
}

/** Where a new activity starts: the drill-down position it was added from. */
export interface ActivityDefaults {
  areaId?: string;
  categoryId?: string | null;
  levelId?: string;
  age?: number;
}

/**
 * "Add New Activity" / "Edit Activity" (prototype folder-alignment.js `activityEditor()`, with
 * personalisation.js tags), connected to docs/API_REQUESTS.md #7. Used by Developmental Milestones
 * and the Activities registry. Validation messages come from the API (the prototype's where it has
 * them). Preview images are uploaded. Activities with child records keep their area.
 * An activity's group and difficulty (Activity Progression, #14) are set on that card, which opens
 * this editor in group mode (`group`): area, category and age come from the group, and it sets both
 * the area Level and the difficulty (backend decision 4a). Opened elsewhere, the editor shows the
 * group and sends `groupId` + `difficulty` back unchanged, so saving never takes an activity out of
 * its group.
 */
export function ActivityModal({ open, activityId, regionId, defaults, group, onClose }: {
  open: boolean;
  /** null = a new activity. */
  activityId: string | null;
  regionId: string;
  defaults?: ActivityDefaults;
  group?: DifficultyGroup;
  onClose: () => void;
}) {
  const save = useSaveActivity();
  const { data: detail, isLoading } = useActivity(open ? activityId : null);
  const { data: areas } = useAreas(regionId);
  const { data: skills } = useSkillOptions(regionId);
  const { register, reset, getValues, setValue, watch, control } = useForm<ActivityForm>();
  const steps = useFieldArray({ control, name: 'steps' });
  const previews = useFieldArray({ control, name: 'previews' });

  const areaId = watch('areaId');
  const categoryId = watch('categoryId');
  const { data: categories } = useCategories(open ? areaId : null);
  const hasCategories = Boolean(categories?.length);
  const { data: levelData } = useLevels({ areaId: open && areaId && (!hasCategories || categoryId) ? areaId : null, categoryId: hasCategories ? categoryId : null });
  const levels = levelData?.levels ?? [];

  // Load once per opening (an edit waits for the activity itself).
  useLayoutEffect(() => {
    if (!open || (activityId && !detail)) return;
    const d = activityId ? detail : undefined;
    reset({
      title: d?.title ?? '',
      areaId: group?.areaId ?? d?.area.id ?? defaults?.areaId ?? areas?.[0]?.id ?? '',
      categoryId: group ? (group.categoryId ?? '') : (d?.category?.id ?? defaults?.categoryId ?? ''),
      levelId: d?.level?.id ?? defaults?.levelId ?? '',
      age: String(group?.age ?? d?.age ?? defaults?.age ?? 4),
      durationMinutes: String(d?.durationMinutes ?? 5),
      materials: d?.materials ?? '',
      description: d?.description ?? '',
      minimumPlan: d?.minimumPlan ?? 'FREE',
      baseMarks: String(d?.baseMarks ?? 16),
      masteryTarget: String(d?.masteryTarget ?? 4),
      skillId: d?.skill?.id ?? '',
      skillStage: d?.skillStage ?? 'STARTING',
      status: d?.status ?? 'DRAFT',
      difficulty: String(d?.difficulty ?? group?.nextDifficulty ?? 1),
      steps: d?.steps ?? [
        { title: 'Get Ready', description: '' },
        { title: 'Dive In', description: '' },
        { title: 'Wrap Up & Reflect', description: '' },
      ],
      previews: d?.previews.map((p) => ({ imageUrl: p.imageUrl, caption: p.caption ?? '' })) ?? [
        { imageUrl: null, caption: 'Get ready' },
        { imageUrl: null, caption: 'Do the activity' },
        { imageUrl: null, caption: 'Talk about it' },
      ],
    });
  }, [open, activityId, detail?.id, areas?.length]); // the form is filled once per opening

  // Keep the category and level on something that exists in the chosen area.
  useEffect(() => {
    if (!open || !categories) return;
    if (categories.length && !categories.some((c) => c.id === getValues('categoryId'))) setValue('categoryId', categories[0]!.id);
    if (!categories.length && getValues('categoryId')) setValue('categoryId', '');
  }, [open, categories]);
  useEffect(() => {
    if (!open || !levelData) return;
    if (!levels.some((l) => l.id === getValues('levelId'))) setValue('levelId', levels[0]?.id ?? '');
  }, [open, levelData]);

  const onSave = async (mode: SaveMode) => {
    const v = getValues();
    const title = v.title.trim();
    const result = await saveWith(
      () =>
        save.mutateAsync({
          id: activityId ?? undefined,
          mode,
          input: {
            title,
            // A disabled field can read back as undefined: a locked activity keeps its stored area.
            areaId: group ? group.areaId : locked && detail ? detail.area.id : v.areaId,
            categoryId: group ? group.categoryId : hasCategories ? v.categoryId || null : null,
            levelId: v.levelId,
            age: group ? group.age : Number(v.age),
            durationMinutes: Number(v.durationMinutes),
            materials: v.materials.trim() || null,
            description: v.description.trim(),
            minimumPlan: v.minimumPlan,
            baseMarks: Number(v.baseMarks),
            masteryTarget: Number(v.masteryTarget),
            skillId: v.skillId || null,
            skillStage: v.skillStage,
            status: v.status,
            // Group mode sets them; anywhere else they go back unchanged.
            groupId: group ? group.id : detail && activityId ? (detail.group?.id ?? null) : null,
            difficulty: group ? Number(v.difficulty) : detail && activityId ? detail.difficulty : null,
            steps: v.steps.map((s) => ({ title: s.title.trim(), description: s.description.trim() })),
            previews: v.previews.map((p): ActivityPreview => ({ imageUrl: p.imageUrl, caption: p.caption.trim() || null })),
          },
        }),
      `${activityId ? 'Updated' : 'Added'} activities: ${title}`,
    );
    if (result) onClose();
  };

  const removeStep = (i: number) => {
    if (steps.fields.length === 1) return void toast.error('Keep at least one activity step.');
    steps.remove(i);
  };

  const areaSkills = (skills ?? []).filter((s) => s.area.id === areaId);
  const locked = Boolean(detail?.hasChildRecords && activityId);
  const loading = Boolean(activityId) && (isLoading || !detail);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={activityId ? 'Edit Activity' : 'Add New Activity'}
      footer={<DecisionActions onClose={onClose} onSave={onSave} showReject={false} busy={save.isPending || loading} />}
    >
      {open && loading && <p className="text-muted">Loading…</p>}
      {open && !loading && (
        <form onSubmit={(e) => e.preventDefault()}>
          <FormGrid>
            <TextField label="Title" {...register('title')} />
            <SelectField
              label="Development area"
              disabled={locked || Boolean(group)}
              hint={
                group
                  ? `Set by the activity group ${group.name}.`
                  : locked
                    ? 'This activity has child records, so its development area can’t change.'
                    : undefined
              }
              options={(areas ?? []).map((a) => ({ value: a.id, label: a.name }))}
              {...register('areaId', {
                onChange: () => {
                  setValue('categoryId', '');
                  setValue('levelId', '');
                  setValue('skillId', '');
                },
              })}
            />
            {/* Hidden when the area has no categories, as in the prototype. */}
            {hasCategories && (
              <SelectField label="Category" disabled={Boolean(group)} options={categories!.map((c) => ({ value: c.id, label: c.name }))} {...register('categoryId')} />
            )}
            <TextField label="Age group (years)" type="number" min={0} step="any" disabled={Boolean(group)} {...register('age')} />
            <SelectField
              label="Level"
              options={levels.length ? levels.map((l) => ({ value: l.id, label: String(l.number) })) : [{ value: '', label: 'Add a level first' }]}
              {...register('levelId')}
            />
            {group && (
              <TextField
                label="Difficulty in this group"
                type="number"
                min={1}
                step={1}
                hint="This group's own level (Level 1…N, no maximum). The area Level above still decides when it unlocks."
                {...register('difficulty')}
              />
            )}
            <TextField label="Independent mode target duration (minutes)" type="number" min={0} step="any" {...register('durationMinutes')} />
            <TextField label="Materials" {...register('materials')} />
            <TextAreaField label="Description" {...register('description')} />
            <PlanSelect label="Minimum plan to unlock" {...register('minimumPlan')} />
            <TextField label="First completion marks" type="number" min={0} step="any" {...register('baseMarks')} />
            <TextField label="Repetitions needed" type="number" min={0} step="any" {...register('masteryTarget')} />
          </FormGrid>
          {!group && detail?.group && activityId && (
            <NoteText>
              Difficulty {detail.difficulty} of the activity group {detail.group.name}. Its group and difficulty are managed on Activity Progression.
            </NoteText>
          )}
          <NoteText>
            Independent mode records actual time taken, excluding pauses. The target duration is a guide, not an automatic finish. Guidance has no
            timer.
          </NoteText>
          <NoteText>
            Both gates must pass: the parent needs the minimum plan or higher AND the child must meet the learning requirements. Buying a higher
            plan does not bypass learning requirements; unlocking a level does not bypass the plan gate.
          </NoteText>

          <EditorCard>
            <h3 className="mb-0">Personalisation tags</h3>
            <p className={pText}>One primary skill drives selection. The stage is within the level; base marks remain the award, not an entry requirement.</p>
            <FormGrid>
              <SelectField
                label="Primary skill"
                options={[{ value: '', label: 'Not tagged' }, ...areaSkills.map((s) => ({ value: s.id, label: s.name }))]}
                {...register('skillId')}
              />
              <SelectField label="Stage within level" options={SKILL_STAGES.map((s) => ({ value: s, label: humanize(s) }))} {...register('skillStage')} />
              <SelectField
                label="Availability"
                options={[
                  { value: 'DRAFT', label: 'Draft' },
                  { value: 'PUBLISHED', label: 'Published' },
                ]}
                {...register('status')}
              />
            </FormGrid>
            <p className={pText}>Create skills in Activity Management → Skill Personalisation. Untagged activities are excluded from personalised suggestions.</p>
          </EditorCard>

          <h3>Guidance Steps · No timer</h3>
          <div>
            {steps.fields.map((field, i) => (
              <EditorCard key={field.id}>
                <EditorCardRow label="Activity step">
                  <Button onClick={() => removeStep(i)}>Remove Step</Button>
                </EditorCardRow>
                <FormGrid>
                  <TextField label="Step title" {...register(`steps.${i}.title`)} />
                  <TextAreaField label="Step guidance description" {...register(`steps.${i}.description`)} />
                </FormGrid>
              </EditorCard>
            ))}
          </div>
          <Button onClick={() => steps.append({ title: '', description: '' })}>+ Add Step</Button>

          <h3>Activity Previews</h3>
          <div>
            {previews.fields.map((field, i) => (
              <EditorCard key={field.id}>
                <EditorCardRow label="Preview card">
                  <Button onClick={() => previews.remove(i)}>Remove Preview</Button>
                </EditorCardRow>
                <FormGrid>
                  <FileUpload label="Add image" kind="IMAGE" value={watch(`previews.${i}.imageUrl`)} onChange={(url) => setValue(`previews.${i}.imageUrl`, url)} />
                  <TextField label="Caption / text" {...register(`previews.${i}.caption`)} />
                </FormGrid>
              </EditorCard>
            ))}
          </div>
          <Button onClick={() => previews.append({ imageUrl: null, caption: '' })}>+ Add Preview</Button>
          <div className="mt-4 rounded-[10px] bg-note px-[18px] py-[15px] text-[12px] leading-[1.7] text-body">
            Guidance: once, no marks. Independent: once per week; each repeat earns half the previous marks. Activities with repetitions complete are locked.
          </div>
        </form>
      )}
    </Modal>
  );
}
