import { useLayoutEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Modal } from '@/components/ui/Modal';
import { SelectField } from '@/components/ui/Field';
import { humanize } from '@/components/ui/Badge';
import { DecisionActions, type SaveMode } from '@/components/DecisionActions';
import { SKILL_STAGES, type SkillStage } from '@/api/activities';
import { useSaveSkillMap, type Question } from '@/api/questions';
import type { Skill } from '@/api/skills';
import { pText } from '../ConfirmModal';
import { saveWith } from '../saved';

interface MapForm {
  /** '' = Not mapped. */
  skillId: string;
  /** stages[optionId] = '' (Unknown) or a stage. */
  stages: Record<string, SkillStage | ''>;
}

/**
 * Prototype personalisation.js `skillQuestionEditor()`: link a question to one of its area's
 * skills, and say which stage each answer indicates (PUT /api/questions/:id/skill-map,
 * docs/API_REQUESTS.md #16). Stages are keyed by answer option id. The caller checks the area has
 * skills.
 */
export function MapAnswersModal({ question, skills, onClose }: { question: Question | null; skills: Skill[]; onClose: () => void }) {
  const save = useSaveSkillMap();
  const areaSkills = skills.filter((s) => s.area.id === question?.area.id);
  const { register, reset, getValues } = useForm<MapForm>();

  useLayoutEffect(() => {
    if (!question) return;
    reset({
      skillId: question.skill?.id ?? areaSkills[0]?.id ?? '',
      stages: Object.fromEntries(question.options.map((o) => [o.id, o.skillStage ?? ''])),
    });
    // Values are taken when the dialog opens only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question, reset]);

  const onSave = async (mode: SaveMode) => {
    if (!question) return;
    const v = getValues();
    const stages = Object.fromEntries(question.options.map((o) => [o.id, v.stages[o.id] || null]));
    const result = await saveWith(
      () => save.mutateAsync({ id: question.id, mode, skillId: v.skillId || null, stages }),
      `Mapped questionnaire skill: ${question.text}`,
    );
    if (result) onClose();
  };

  return (
    <Modal
      open={Boolean(question)}
      onClose={onClose}
      title="Map answers to a skill"
      footer={<DecisionActions onClose={onClose} onSave={onSave} showReject={false} busy={save.isPending} />}
    >
      {question && (
        <form onSubmit={(e) => e.preventDefault()}>
          <p className={pText}>{question.text}</p>
          <SelectField
            label="Skill"
            options={[...areaSkills.map((s) => ({ value: s.id, label: s.name })), { value: '', label: 'Not mapped' }]}
            {...register('skillId')}
          />
          {question.options.map((o) => (
            <SelectField
              key={o.id}
              label={o.label}
              options={[{ value: '', label: 'Unknown' }, ...SKILL_STAGES.map((s) => ({ value: s, label: humanize(s) }))]}
              {...register(`stages.${o.id}`)}
            />
          ))}
          <p className={pText}>
            Unknown does not guess a child&apos;s ability. Multiple answers for one skill use the lowest known stage; the latest activity outcome
            then takes precedence.
          </p>
        </form>
      )}
    </Modal>
  );
}
