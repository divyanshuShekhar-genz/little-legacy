import { useLayoutEffect, useRef } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FormGrid, SelectField, TextAreaField, TextField } from '@/components/ui/Field';
import { humanize } from '@/components/ui/Badge';
import { DecisionActions, type SaveMode } from '@/components/DecisionActions';
import { errorMessage } from '@/api/client';
import type { SaveResult } from '@/api/community';
import { useAgeGroups, useSaveArea, type DevelopmentArea } from '@/api/areas';
import { QUESTION_DIFFICULTIES, useDeleteQuestion, useQuestions, useSaveQuestion, type Question, type QuestionDifficulty, type QuestionInput } from '@/api/questions';
import { DRAFT_SAVED } from '@/constants/messages';
import { pText } from './ConfirmModal';
import { DEFAULT_OPTION_LINES, OPTIONS_MESSAGE, optionLines, parseOptionLines } from './questionnaires/options';

interface QuestionForm {
  /** The saved question this row edits; empty for a new one. */
  questionId: string;
  text: string;
  difficulty: QuestionDifficulty;
  age: string;
  options: string;
}

interface AreaForm {
  name: string;
  description: string;
  questions: QuestionForm[];
}

const newQuestion = (): QuestionForm => ({ questionId: '', text: '', difficulty: 'EASY', age: '3', options: DEFAULT_OPTION_LINES });
const ageOf = (v: string) => (v.trim() === '' ? null : Number(v));

/** True when the row differs from the saved question (so it needs a PATCH). */
function changed(q: Question, input: QuestionInput) {
  return (
    q.text !== input.text ||
    q.difficulty !== input.difficulty ||
    q.age !== input.age ||
    JSON.stringify(q.options.map(({ id, label, marks }) => ({ id, label, marks }))) !== JSON.stringify(input.options)
  );
}

/**
 * Prototype workspace.js `areaEditor()`: a development area plus its own questionnaire, connected
 * to docs/API_REQUESTS.md #5 (the area) and #8 (each question). Each answer option carries its own
 * marks (admin only), and editing keeps each option's id. Keep at least one MCQ.
 * One Save sends the area first, then each new or changed question, then removals (so the area
 * never drops to no questions). Each is live or a draft on its own. A brand-new area saved as a
 * draft has no id yet, so its questions wait until it is approved. If a later call fails, the
 * dialog stays open and a retry skips what already went through.
 */
export function AreaModal({ open, area, regionId, onClose }: { open: boolean; area?: DevelopmentArea; regionId: string; onClose: () => void }) {
  const saveArea = useSaveArea();
  const saveQuestion = useSaveQuestion();
  const deleteQuestion = useDeleteQuestion();
  const { data: ageGroups } = useAgeGroups(regionId);
  const { data: saved, isLoading } = useQuestions({ areaId: open ? area?.id : null });
  const { register, reset, getValues, control } = useForm<AreaForm>();
  const { fields, append, remove } = useFieldArray({ control, name: 'questions' });
  /** What already went through in this opening: the area, and question rows / removals by key. */
  const done = useRef<{ area: SaveResult | null; keys: Set<string> }>({ area: null, keys: new Set() });

  const loading = Boolean(area) && (isLoading || !saved);

  useLayoutEffect(() => {
    if (!open || loading) return;
    done.current = { area: null, keys: new Set() };
    reset({
      name: area?.name ?? '',
      description: area?.description ?? '',
      questions: saved?.length
        ? saved.map((q) => ({ questionId: q.id, text: q.text, difficulty: q.difficulty, age: q.age === null ? '' : String(q.age), options: optionLines(q.options) }))
        : [newQuestion()],
    });
    // Only when the dialog opens: later refetches must not wipe what is being typed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, loading]);

  const onSave = async (mode: SaveMode) => {
    const v = getValues();
    const name = v.name.trim();
    const ages = (ageGroups ?? []).map((g) => g.age);

    // Check every question first, so nothing is half-saved over a typo.
    const rows: { key: string; question?: Question; input: QuestionInput }[] = [];
    for (const [i, q] of v.questions.entries()) {
      const question = saved?.find((s) => s.id === q.questionId);
      const options = parseOptionLines(q.options, question?.options);
      const age = ageOf(q.age);
      if (!q.text.trim()) return void toast.error(`Question ${i + 1}: Enter a question.`);
      if (!options) return void toast.error(`Question ${i + 1}: ${OPTIONS_MESSAGE}`);
      if (age !== null && (!Number.isInteger(age) || age < 0)) return void toast.error(`Question ${i + 1}: Enter a non-negative age in years.`);
      if (age !== null && ageGroups && !ages.includes(age)) return void toast.error(`Question ${i + 1}: Choose an age group. Add it first if it isn't listed.`);
      rows.push({ key: fields[i]!.id, question, input: { text: q.text.trim(), difficulty: q.difficulty, age, options } });
    }

    let drafted = false;
    try {
      // An existing area is only sent when its name or description changed.
      const description = v.description.trim() || null;
      const areaChanged = !area || area.name !== name || area.description !== description;
      if (areaChanged && !done.current.area) done.current.area = await saveArea.mutateAsync({ id: area?.id, mode, regionId, name, description });
      const areaResult = done.current.area;
      drafted ||= areaResult?.status === 'draft';
      const areaId = area?.id ?? (areaResult?.status === 'published' ? areaResult.id : null);

      if (areaId) {
        for (const row of rows) {
          if (done.current.keys.has(row.key) || (row.question && !changed(row.question, row.input))) continue;
          const r = await saveQuestion.mutateAsync({ id: row.question?.id, mode, areaId, input: row.input });
          drafted ||= r.status === 'draft';
          done.current.keys.add(row.key);
        }
        const kept = new Set(v.questions.map((q) => q.questionId));
        for (const q of saved ?? []) {
          if (kept.has(q.id) || done.current.keys.has(`delete:${q.id}`)) continue;
          const r = await deleteQuestion.mutateAsync({ id: q.id, mode });
          drafted ||= r.status === 'draft';
          done.current.keys.add(`delete:${q.id}`);
        }
      }

      if (!areaId) toast.success(`${DRAFT_SAVED}. Add this area's questions once it is approved.`);
      else toast.success(drafted ? DRAFT_SAVED : `${area ? 'Updated' : 'Added'} development area and question set: ${name}`);
      onClose();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const busy = saveArea.isPending || saveQuestion.isPending || deleteQuestion.isPending || loading;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={area ? 'Edit development area' : 'Add development area'}
      footer={<DecisionActions onClose={onClose} onSave={onSave} showReject={false} busy={busy} />}
    >
      {open && loading && <p className="text-muted">Loading…</p>}
      {open && !loading && (
        <form onSubmit={(e) => e.preventDefault()}>
          <FormGrid>
            <TextField label="Development area name" {...register('name')} />
            <TextField label="Description" {...register('description')} />
          </FormGrid>
          <h3>Questionnaire for this area</h3>
          <p className={pText}>Each answer option has its own marks. Keep at least one MCQ.</p>
          <div>
            {fields.map((field, i) => (
              <section key={field.id} className="my-3 rounded-md border border-line p-[15px]">
                <div className="flex items-center justify-between gap-[15px] border-b border-line pb-[17px]">
                  <strong className="mb-[5px] block">Question {i + 1}</strong>
                  <Button disabled={fields.length === 1} onClick={() => remove(i)}>
                    Delete question
                  </Button>
                </div>
                <TextField label="Question" {...register(`questions.${i}.text`)} />
                <FormGrid>
                  <SelectField
                    label="Difficulty · admin only"
                    options={QUESTION_DIFFICULTIES.map((d) => ({ value: d, label: humanize(d) }))}
                    {...register(`questions.${i}.difficulty`)}
                  />
                  <TextField label="Age in completed years" type="number" min={0} step={1} {...register(`questions.${i}.age`)} />
                </FormGrid>
                <TextAreaField label="Answer options and marks" {...register(`questions.${i}.options`)} />
              </section>
            ))}
          </div>
          <Button onClick={() => append(newQuestion())}>+ Add question</Button>
        </form>
      )}
    </Modal>
  );
}
