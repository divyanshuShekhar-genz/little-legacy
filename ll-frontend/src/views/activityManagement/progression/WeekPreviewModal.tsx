import { useLayoutEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { FormGrid, SelectField, TextField } from '@/components/ui/Field';
import { errorMessage } from '@/api/client';
import type { AgeGroup } from '@/api/areas';
import { useSkills } from '@/api/skills';
import { useWeekPreview, type PreviewCard, type PreviewOutcome, type WeekPreviewInput } from '@/api/progression';
import { PLAN_LABELS, PLAN_TIERS, type PlanTier } from '@/constants/plans';
import { formatMarks } from '@/utils/format';
import { pText } from '../ConfirmModal';
import { useSelectedRegion } from '../region';

interface PreviewForm {
  age: string;
  plan: PlanTier;
  questionnaire: WeekPreviewInput['questionnaire'];
  score: string;
  country: string;
  level: string;
  /** skills[skillId] = "" (unknown) or a %. */
  skills: Record<string, string>;
}

const OUTCOMES: { value: PreviewOutcome; label: string }[] = [
  { value: 'INDEPENDENT', label: 'Independently' },
  { value: 'WITH_HELP', label: 'With help' },
  { value: 'UNABLE', label: 'Could not complete' },
];
const outcomeLabel = (o: PreviewOutcome) => OUTCOMES.find((x) => x.value === o)?.label ?? o;

/**
 * Prototype activity-progression.js `progressionPreview()`: the weekly allocation on a SAMPLE
 * child, using the region's real settings and groups (POST /api/progression/preview,
 * docs/API_REQUESTS.md #14). The allocation runs on the server; no real child record is read or
 * written. The server stores nothing, so the outcomes recorded here are kept in this dialog and
 * every call sends all of them (it replays from week 1). Added: the child's unlocked area Level
 * (difficulties keep an area Level) and the weekly rule that applied (`limitRule`).
 */
export function WeekPreviewModal({ open, ageGroups, onClose }: { open: boolean; ageGroups: AgeGroup[]; onClose: () => void }) {
  const { region, regionId } = useSelectedRegion();
  const countries = region?.countries ?? [];
  const { data: skills } = useSkills(regionId);
  const preview = useWeekPreview();
  const { register, reset, getValues } = useForm<PreviewForm>();
  const [week, setWeek] = useState(1);
  const [outcomes, setOutcomes] = useState<WeekPreviewInput['outcomes']>([]);

  useLayoutEffect(() => {
    if (!open) return;
    preview.reset();
    setWeek(1);
    setOutcomes([]);
    reset({
      age: String(ageGroups.some((g) => g.age === 4) ? 4 : (ageGroups[0]?.age ?? '')),
      plan: 'FREE',
      questionnaire: 'COMPLETED',
      score: '50',
      country: countries[0]?.code ?? '',
      level: '1',
      skills: {},
    });
    // Values are taken when the dialog opens only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reset]);

  const run = (nextWeek: number, nextOutcomes: WeekPreviewInput['outcomes']) => {
    if (!regionId) return;
    const v = getValues();
    setWeek(nextWeek);
    setOutcomes(nextOutcomes);
    preview.mutate({
      regionId,
      input: {
        age: Number(v.age),
        plan: v.plan,
        questionnaire: v.questionnaire,
        score: Number(v.score),
        country: v.country || null,
        level: Number(v.level || 1),
        skills: Object.fromEntries((skills ?? []).map((s) => [s.id, (v.skills[s.id] ?? '').trim() === '' ? null : Number(v.skills[s.id])])),
        week: nextWeek,
        outcomes: nextOutcomes,
      },
    });
  };

  /** Record (or change) a card's outcome, then show the same week again. */
  const record = (card: PreviewCard, outcome: PreviewOutcome) =>
    run(week, [...outcomes.filter((o) => o.assignmentId !== card.id), { assignmentId: card.id, outcome }]);

  const r = preview.data;
  const cards = (title: string, list: PreviewCard[]) => (
    <>
      <h3>{title}</h3>
      {list.length ? (
        list.map((c) => (
          <div key={c.id} className="my-2.5 flex flex-wrap items-center justify-between gap-3 rounded-card bg-[#f7f5f9] p-2.5">
            <span>
              <b>{c.name}</b> · {c.reason}
              {c.week !== r?.week && <span className="text-muted"> · from week {c.week}</span>}
            </span>
            <span className="flex flex-wrap gap-2">
              {OUTCOMES.map((o) => (
                <Button key={o.value} size="sm" onClick={() => record(c, o.value)} disabled={preview.isPending}>
                  {o.label}
                </Button>
              ))}
            </span>
          </div>
        ))
      ) : (
        <p className={pText}>None</p>
      )}
    </>
  );

  return (
    <Modal open={open} onClose={onClose} title="Child assignment preview" footer={<Button onClick={onClose}>Close</Button>}>
      {open && (
        <form onSubmit={(e) => e.preventDefault()}>
          <p className={pText}>Uses a sample child only. No real child records are edited.</p>
          <FormGrid>
            <SelectField label="Child age" options={ageGroups.map((g) => ({ value: String(g.age), label: String(g.age) }))} {...register('age')} />
            <SelectField label="Plan" options={PLAN_TIERS.map((p) => ({ value: p, label: PLAN_LABELS[p] }))} {...register('plan')} />
            <SelectField
              label="Questionnaire result"
              options={[
                { value: 'COMPLETED', label: 'Completed' },
                { value: 'NOT_SUBMITTED', label: 'Not submitted' },
              ]}
              {...register('questionnaire')}
            />
            <TextField label="Assessment result (%)" type="number" min={0} max={100} step="any" {...register('score')} />
            <SelectField
              label="Country"
              options={[...countries.map((c) => ({ value: c.code, label: c.name })), { value: '', label: 'Unknown / not provided' }]}
              {...register('country')}
            />
            <TextField
              label="Unlocked area level"
              type="number"
              min={1}
              step={1}
              hint="Difficulties above the child's area Level stay locked."
              {...register('level')}
            />
          </FormGrid>
          <h3>Skill results for this example</h3>
          <p className={pText}>Blank means unknown. Below-benchmark skills are prioritised; no fixed weak/strong ratio is imposed.</p>
          <FormGrid>
            {(skills ?? []).map((s) => (
              <TextField key={s.id} label={`${s.name} (%)`} type="number" min={0} max={100} step="any" {...register(`skills.${s.id}`)} />
            ))}
          </FormGrid>
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <Button onClick={() => run(1, [])} disabled={preview.isPending}>
              Start sample week
            </Button>
            <Button onClick={() => run(week + 1, outcomes)} disabled={preview.isPending || !r || week >= 52}>
              Next week
            </Button>
            <Button onClick={() => run(week, outcomes)} disabled={preview.isPending || !r}>
              Re-evaluate sample
            </Button>
          </div>
          {preview.isError && <p className="mb-6 text-danger">{errorMessage(preview.error)}</p>}

          {r && (
            <div aria-live="polite">
              <p className={pText}>
                Week {r.week} · {r.base} · {r.limitRule} · next refresh {r.nextRefresh}
                {r.gap > 0 && ` · ${r.gap} place${r.gap === 1 ? '' : 's'} not filled`}
              </p>
              {cards('Continue Learning', r.continue)}
              {cards('This week', r.current)}
              {cards('Pending', r.pending)}
              <h3>Recent completions</h3>
              <p className={pText}>{r.recent.length ? r.recent.map((x) => `${x.name} · Difficulty ${x.level} · ${outcomeLabel(x.outcome)}`).join(', ') : 'None'}</p>
              <h3>Admin-only outcomes</h3>
              <DataTable
                rows={r.adminOutcomes}
                rowKey={(x) => `${x.name}|${x.outcome}|${x.points}`}
                columns={[
                  { header: 'Activity', cell: (x) => x.name },
                  { header: 'Outcome', cell: (x) => outcomeLabel(x.outcome) },
                  { header: 'Points', cell: (x) => formatMarks(x.points) },
                ]}
              />
            </div>
          )}
        </form>
      )}
    </Modal>
  );
}
