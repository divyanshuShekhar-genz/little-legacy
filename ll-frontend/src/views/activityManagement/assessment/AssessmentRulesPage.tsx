import { useLayoutEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { FormGrid, TextField } from '@/components/ui/Field';
import { CountryAccessButton } from '@/components/CountryAccessButton';
import { errorMessage } from '@/api/client';
import {
  useAssessmentRules,
  usePreviewAssessmentRules,
  useSaveAssessmentRules,
  type AreaRuleInput,
  type AssessmentRules,
  type RulesPreview,
  type SampleValues,
} from '@/api/assessmentRules';
import { QUESTION_DIFFICULTIES } from '@/api/questions';
import { humanize } from '@/components/ui/Badge';
import { useAuth } from '@/hooks/useAuth';
import { formatMarks, plural } from '@/utils/format';
import { DRAFT_SAVED } from '@/constants/messages';
import { pText } from '../ConfirmModal';
import { NoteText } from '../parts';
import { RegionPanel } from '../RegionPanel';
import { useSelectedRegion } from '../region';

type RuleRow = { formula: string; weight: string } & Record<(typeof QUESTION_DIFFICULTIES)[number], string>;
type SampleKey = keyof SampleValues;
const SAMPLE_KEYS: SampleKey[] = ['questionnaire', 'mandatory', 'regular', 'mastery', 'target'];

interface RulesForm {
  /** Keyed by area id. */
  rules: Record<string, RuleRow>;
  /** mandatory[`a${age}`][areaId][activityId] = ticked. */
  mandatory: Record<string, Record<string, Record<string, boolean>>>;
  /** counts[`a${age}`][areaId] = required completed activities. */
  counts: Record<string, Record<string, string>>;
  sample: Record<SampleKey, string>;
}

const formValues = (r: AssessmentRules): RulesForm => ({
  rules: Object.fromEntries(
    r.areas.map((a) => [a.areaId, { formula: a.formula, weight: String(a.weight), ...Object.fromEntries(QUESTION_DIFFICULTIES.map((d) => [d, String(a.questionWeights[d])])) } as RuleRow]),
  ),
  mandatory: Object.fromEntries(
    r.ages.map((age) => [
      `a${age}`,
      Object.fromEntries(
        r.mandatory.filter((m) => m.age === age).map((m) => [m.areaId, Object.fromEntries(m.candidates.map((c) => [c.id, m.activityIds.includes(c.id)]))]),
      ),
    ]),
  ),
  counts: Object.fromEntries(
    r.ages.map((age) => [`a${age}`, Object.fromEntries(r.mandatory.filter((m) => m.age === age).map((m) => [m.areaId, String(m.requiredCount)]))]),
  ),
  sample: { questionnaire: '0', mandatory: '0', regular: '0', mastery: '0', target: '40' },
});

/**
 * Assessment Rules (Guide §8, §11). Prototype assessment-ui.js: per-area formulas and weights,
 * question-difficulty weights and the mandatory first-week set per age. Connected to
 * docs/API_REQUESTS.md #9: formulas are checked and previewed by the server's formula engine,
 * never here. Saving creates the next revision once live; children keep the rules they started
 * with. The prototype's Reject (discard edits) isn't shown: as on the other connected editors,
 * the API doesn't say whether a change is pending.
 */
export function AssessmentRulesPage() {
  const { can, canPublish } = useAuth();
  const { regionId } = useSelectedRegion();
  const { data, isLoading, isError, error: loadError } = useAssessmentRules(regionId);
  const save = useSaveAssessmentRules();
  const calculate = usePreviewAssessmentRules();
  const { register, reset, getValues, watch } = useForm<RulesForm>();
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<RulesPreview | null>(null);
  const canEdit = can('assessmentRules');

  useLayoutEffect(() => {
    if (!data) return;
    reset(formValues(data));
    setError('');
    setPreview(null);
  }, [data, reset]);

  /** The form's rows and sample values, as the API takes them. */
  const read = () => {
    const v = getValues();
    const areas: AreaRuleInput[] = (data?.areas ?? []).map((a) => {
      const row = v.rules[a.areaId]!;
      return {
        areaId: a.areaId,
        formula: row.formula.trim(),
        weight: Number(row.weight),
        questionWeights: { EASY: Number(row.EASY), MEDIUM: Number(row.MEDIUM), HARD: Number(row.HARD) },
      };
    });
    const sample = Object.fromEntries(SAMPLE_KEYS.map((k) => [k, Number(v.sample[k])])) as unknown as SampleValues;
    return { v, areas, sample };
  };

  const onSave = async (mode: 'publish' | 'draft') => {
    if (!data || !regionId) return;
    const { v, areas, sample } = read();
    const mandatory = data.mandatory.map((m) => ({
      age: m.age,
      areaId: m.areaId,
      activityIds: Object.entries(v.mandatory[`a${m.age}`]?.[m.areaId] ?? {})
        .filter(([, on]) => on)
        .map(([id]) => id),
      requiredCount: Number(v.counts[`a${m.age}`]?.[m.areaId] ?? 0),
    }));
    try {
      const result = await save.mutateAsync({ mode, regionId, areas, sample, mandatory });
      setError('');
      toast.success(result.status === 'draft' ? DRAFT_SAVED : `Saved assessment rules version ${data.revision + 1} for new children`);
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const calculatePreview = async () => {
    if (!regionId) return;
    const { areas, sample } = read();
    try {
      setPreview(await calculate.mutateAsync({ regionId, areas, sample }));
      setError('');
    } catch (e) {
      setPreview(null);
      setError(errorMessage(e));
    }
  };

  /** "Automatic target: X marks · N activities" for one age + area, from the ticked activities. */
  const target = (age: number, areaId: string) => {
    const set = data?.mandatory.find((m) => m.age === age && m.areaId === areaId);
    const ticked = watch(`mandatory.a${age}.${areaId}`) ?? {};
    const list = (set?.candidates ?? []).filter((c) => ticked[c.id]);
    return `Automatic target: ${formatMarks(list.reduce((s, c) => s + c.baseMarks, 0))} marks · ${plural(list.length, 'activity')}`;
  };

  const activity = Number(watch('sample.mandatory') ?? 0) + Number(watch('sample.regular') ?? 0);
  const busy = save.isPending || calculate.isPending;

  return (
    <>
      <PageHeader
        back={{ to: '/activity-management', label: 'Activity Management' }}
        eyebrow="Assessment Rules"
        title="Assessment rules"
        subtitle="Custom calculations and first-week activity sets. Saved changes apply only to children starting afterwards."
        actions={canEdit && <CountryAccessButton types={['ACTIVITIES_SECTION', 'ACTIVITY', 'LEVEL']} />}
      />
      <RegionPanel />

      {isError && <p className="mb-6 text-danger">{errorMessage(loadError)}</p>}
      {isLoading && <p className="p-[45px] text-center text-faint">Loading…</p>}
      {data && (
        <>
          <div className="rounded-[10px] bg-note px-[18px] py-[15px] text-[12px] leading-[1.7] text-body">
            Rules version {data.revision}. Each child retains their questionnaire, activity marks, mandatory set and formulas from when they
            started. Existing children are not recalculated using new settings.
          </div>

          <form onSubmit={(e) => e.preventDefault()}>
            <NoteText>
              Question difficulty and weights are admin-only. Answer marks × difficulty weight contribute to that area’s questionnaire total. Area
              formula × area weight determines its share of the combined 100%. A count of 0 disables the count shortcut.
            </NoteText>

            <Panel>
              <h2 className="mb-[18px]">Development formulas &amp; weights</h2>
              <p className={pText}>
                Choose how each area is calculated. Weighted results are then divided by their combined total to make a 100% distribution. This is
                a distribution, not an average or a repetition percentage.
              </p>
              <p className="mb-6 mt-2 text-[13px] leading-[1.8] text-muted">
                Variables: <b>questionnaire</b>, <b>activity</b>, <b>mandatory</b>, <b>regular</b>, <b>mastery</b>, <b>target</b>. mastery = activities with repetitions complete.
                <br />
                activity = mandatory + regular. target = sum of assigned mandatory base marks.
                <br />
                Use + − * / ^, brackets, comparisons and min(), max(), abs(), sqrt(), pow(), round(), if(). Example: questionnaire * 0.3 + activity
                * 0.7
              </p>
              {!data.areas.length && <p className={pText}>Add a development area first.</p>}
              {data.areas.map((a) => (
                <div
                  key={a.areaId}
                  className="grid grid-cols-[160px_minmax(180px,1fr)_100px] items-center gap-4 border-b border-divider py-4 max-[700px]:grid-cols-1"
                >
                  <strong>{a.name}</strong>
                  <TextField label="Calculation formula" maxLength={1000} {...register(`rules.${a.areaId}.formula`)} />
                  <TextField label="Weight" type="number" min={0} step="any" {...register(`rules.${a.areaId}.weight`)} />
                  <FormGrid className="col-span-full">
                    {QUESTION_DIFFICULTIES.map((d) => (
                      <TextField key={d} label={`${humanize(d)} question weight`} type="number" min={0} step={0.01} {...register(`rules.${a.areaId}.${d}`)} />
                    ))}
                  </FormGrid>
                </div>
              ))}
              <details>
                <summary className="cursor-pointer py-3 font-semibold">Test formulas with sample values</summary>
                <FormGrid>
                  <TextField label="questionnaire" type="number" min={0} step="any" {...register('sample.questionnaire')} />
                  <TextField label="activity" value={formatMarks(activity)} readOnly hint="Worked out: mandatory + regular." />
                  {SAMPLE_KEYS.filter((k) => k !== 'questionnaire').map((k) => (
                    <TextField key={k} label={k} type="number" min={0} step="any" {...register(`sample.${k}`)} />
                  ))}
                </FormGrid>
                <Button onClick={calculatePreview} disabled={busy}>
                  Calculate preview
                </Button>
                <div aria-live="polite" className="py-4 leading-[1.8]">
                  {preview &&
                    (preview.message ? (
                      preview.message
                    ) : (
                      <>
                        {preview.areas.map((a) => (
                          <div key={a.areaId}>
                            {a.name}: {a.percent === null ? '—' : `${a.percent.toFixed(2)}%`}
                          </div>
                        ))}
                        {preview.weightedAverage !== null && <div>Overall weighted average: {preview.weightedAverage.toFixed(2)}</div>}
                      </>
                    ))}
                </div>
              </details>
            </Panel>

            <Panel>
              <h2 className="mb-[18px]">Mandatory activities by age</h2>
              <p className={pText}>
                Every child in the same age group receives the same set. Targets are calculated automatically from selected activities; there is
                no manually entered target.
              </p>
              {data.ages.map((age, i) => (
                <details key={age} open={i === 0} className="my-[18px]">
                  <summary className="cursor-pointer py-3 font-semibold">Age {age}</summary>
                  {data.mandatory
                    .filter((m) => m.age === age)
                    .map((m) => (
                      <fieldset key={m.areaId} className="my-3 rounded-[12px] border border-divider p-4">
                        <legend className="px-0.5">{data.areas.find((a) => a.areaId === m.areaId)?.name}</legend>
                        {m.candidates.length ? (
                          m.candidates.map((c) => (
                            <label key={c.id} className="my-2.5 flex cursor-pointer items-center gap-2.5 rounded-card bg-[#f7f5f9] p-2.5">
                              <input type="checkbox" className="m-[3px_3px_3px_4px]" {...register(`mandatory.a${age}.${m.areaId}.${c.id}`)} />
                              {c.title} · {formatMarks(c.baseMarks)} base marks
                            </label>
                          ))
                        ) : (
                          <p className={pText}>No activities for this age yet. Add activities in Activity Management.</p>
                        )}
                        <p className={pText}>{target(age, m.areaId)}</p>
                        <TextField label="Required completed activities" type="number" min={0} step={1} {...register(`counts.a${age}.${m.areaId}`)} />
                      </fieldset>
                    ))}
                </details>
              ))}
            </Panel>

            <Panel>
              <h2 className="mb-[18px]">First week &amp; reminders</h2>
              <p className={pText}>
                The child’s weekly cycle and saved regional rules determine the seven-day window. Questionnaire submission does not restart a
                birthday cycle. After that, mandatory + regular earned activity marks are compared with each area’s automatic target.
                Questionnaire marks are excluded.
              </p>
              <p className={pText}>
                At or above target: remaining mandatory activities stop appearing. Below target with unperformed mandatory activities: daily email
                and in-app reminder. The mandatory label also clears when the required completed count is reached or all mandatory items have been
                completed. Earned marks are not increased by clearing a label.
              </p>
            </Panel>

            <p role="alert" className="mb-6 mt-2 leading-[1.7] text-danger">
              {error}
            </p>
            {canEdit && (
              <div className="flex flex-wrap gap-2.5">
                <Button onClick={() => onSave('draft')} disabled={busy}>
                  Save in draft
                </Button>
                <Button variant="primary" onClick={() => onSave('publish')} disabled={busy}>
                  {canPublish ? 'Approve' : 'Submit for approval'}
                </Button>
              </div>
            )}
          </form>
        </>
      )}
    </>
  );
}
