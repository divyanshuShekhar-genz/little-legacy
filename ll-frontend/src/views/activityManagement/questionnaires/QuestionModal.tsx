import { useLayoutEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/Modal';
import { FormGrid, SelectField, TextAreaField, TextField } from '@/components/ui/Field';
import { humanize } from '@/components/ui/Badge';
import { DecisionActions, type SaveMode } from '@/components/DecisionActions';
import { QUESTION_DIFFICULTIES, useSaveQuestion, type Question, type QuestionDifficulty } from '@/api/questions';
import { saveWith } from '../saved';
import { DEFAULT_OPTION_LINES, OPTIONS_MESSAGE, optionLines, parseOptionLines } from './options';

interface QuestionForm {
  text: string;
  difficulty: QuestionDifficulty;
  age: string;
  options: string;
}

/**
 * Prototype app.js `edit('questions')` as question-sets.js uses it: one MCQ of an area's own
 * questionnaire, connected to docs/API_REQUESTS.md #8. Difficulty and marks are admin-only.
 * Editing keeps each answer option's id (see parseOptionLines). Other messages come from the API.
 */
export function QuestionModal({ open, area, question, onClose }: {
  open: boolean;
  area: { id: string; name: string };
  question?: Question;
  onClose: () => void;
}) {
  const save = useSaveQuestion();
  const { register, reset, getValues } = useForm<QuestionForm>();

  useLayoutEffect(() => {
    if (open) {
      reset({
        text: question?.text ?? '',
        difficulty: question?.difficulty ?? 'EASY',
        age: question ? (question.age === null ? '' : String(question.age)) : '3',
        options: question ? optionLines(question.options) : DEFAULT_OPTION_LINES,
      });
    }
  }, [open, question, reset]);

  const onSave = async (mode: SaveMode) => {
    const v = getValues();
    const options = parseOptionLines(v.options, question?.options);
    if (!options) return void toast.error(OPTIONS_MESSAGE);
    const text = v.text.trim();
    const result = await saveWith(
      () =>
        save.mutateAsync({
          id: question?.id,
          mode,
          areaId: area.id,
          input: { text, difficulty: v.difficulty, age: v.age.trim() === '' ? null : Number(v.age), options },
        }),
      `${question ? 'Updated' : 'Added'} questions: ${text}`,
    );
    if (result) onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${question ? 'Edit' : 'Add'} ${area.name} question`}
      footer={<DecisionActions onClose={onClose} onSave={onSave} showReject={false} busy={save.isPending} />}
    >
      {open && (
        <form onSubmit={(e) => e.preventDefault()}>
          <FormGrid>
            <TextField label="Question" {...register('text')} />
            <TextField label="Development area" value={area.name} readOnly />
            <SelectField label="Difficulty · admin only" options={QUESTION_DIFFICULTIES.map((d) => ({ value: d, label: humanize(d) }))} {...register('difficulty')} />
            <TextField label="Age in completed years" type="number" min={0} step="any" hint="Leave empty for all supported ages." {...register('age')} />
            <TextAreaField label="Answer options: one per line, label | marks" {...register('options')} />
          </FormGrid>
        </form>
      )}
    </Modal>
  );
}
