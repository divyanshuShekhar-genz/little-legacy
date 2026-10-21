import { useLayoutEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { FormGrid, SelectField } from '@/components/ui/Field';
import { errorMessage } from '@/api/client';
import { useAreas } from '@/api/areas';
import { useChildren } from '@/api/children';
import { useSelectionPreview } from '@/api/skills';
import { PLAN_LABELS, PLAN_TIERS, type PlanTier } from '@/constants/plans';
import { useAuth } from '@/hooks/useAuth';
import { pText } from '../ConfirmModal';

/**
 * Prototype personalisation.js `skillPreview()`: what a real child would be offered in one area,
 * and why (POST /api/skills/preview, docs/API_REQUESTS.md #16). The selection runs on the server
 * over the child's saved answers and records, through every gate (plan, country, level, repetitions);
 * it saves nothing. Choosing a child needs the children list (Children & Learning access).
 */
export function SelectionPreviewModal({ open, regionId, onClose }: { open: boolean; regionId: string; onClose: () => void }) {
  const { can } = useAuth();
  const canListChildren = can('childLearning');
  const { data: areas } = useAreas(regionId);
  const { data: children } = useChildren({ search: '', area: '' }, open && canListChildren);
  const preview = useSelectionPreview();
  const { register, reset, getValues } = useForm<{ childId: string; areaId: string; plan: PlanTier | '' }>();

  useLayoutEffect(() => {
    if (!open) return;
    preview.reset();
    reset({ childId: children?.rows[0]?.id ?? '', areaId: areas?.[0]?.id ?? '', plan: '' });
    // Values are taken when the dialog opens (and once the lists arrive).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, children?.rows.length, areas?.length]);

  const run = () => {
    const v = getValues();
    if (v.childId && v.areaId) preview.mutate({ childId: v.childId, areaId: v.areaId, plan: v.plan || undefined });
  };
  const r = preview.data;

  return (
    <Modal open={open} onClose={onClose} title="Selection preview" footer={<Button onClick={onClose}>Close</Button>}>
      {open && (
        <form onSubmit={(e) => e.preventDefault()}>
          {!canListChildren && <p className={pText}>Choosing a child needs Children &amp; Learning access.</p>}
          <FormGrid>
            <SelectField
              label="Child"
              disabled={!canListChildren}
              options={(children?.rows ?? []).map((c) => ({ value: c.id, label: `${c.name} · ${c.parentName}` }))}
              {...register('childId')}
            />
            <SelectField label="Development area" options={(areas ?? []).map((a) => ({ value: a.id, label: a.name }))} {...register('areaId')} />
            <SelectField
              label="Preview subscription"
              options={[{ value: '', label: "Child's current plan" }, ...PLAN_TIERS.map((p) => ({ value: p, label: PLAN_LABELS[p] }))]}
              {...register('plan')}
            />
          </FormGrid>
          <div className="mt-4">
            <Button variant="primary" onClick={run} disabled={!canListChildren || preview.isPending}>
              Preview
            </Button>
          </div>
          <p className={pText}>Uses each child&apos;s saved assessment rules. New tags do not change existing snapshots.</p>
          {preview.isError && <p className="mb-6 text-danger">{errorMessage(preview.error)}</p>}

          {r && (
            <>
              <p className={pText}>
                {r.child.name} · {r.child.years} years (content for age {r.child.age}) · {PLAN_LABELS[r.child.plan]} · Level {r.child.level} in this
                area
              </p>
              {r.noAssessment && <p className={pText}>No submitted assessment. Use the age-specific mandatory set until answers are available.</p>}

              <h3>Skill evidence</h3>
              <DataTable
                rows={r.evidence}
                rowKey={(e) => e.skillId}
                columns={[
                  { header: 'Skill', cell: (e) => e.skill },
                  { header: 'Stage', cell: (e) => e.stage },
                  {
                    header: 'Score / expected',
                    cell: (e) => `${e.percent === null ? '—' : `${e.percent}%`} / ${e.expected === null ? '—' : `${e.expected}%`}${e.belowExpected ? ' · below expected' : ''}`,
                  },
                  { header: 'Source', cell: (e) => e.source },
                ]}
              />

              <h3>Mandatory candidates</h3>
              <p className={pText}>{r.mandatory.length ? r.mandatory.map((m) => m.title).join(', ') : 'None'}</p>

              <h3>Personalised suggestions</h3>
              <DataTable
                rows={r.suggestions}
                rowKey={(s) => s.activityId}
                columns={[
                  { header: 'Activity', cell: (s) => s.title },
                  { header: 'Why selected', className: 'whitespace-normal', cell: (s) => s.reason },
                ]}
              />
              {r.gaps.map((g) => (
                <p key={g.skillId} className={pText}>
                  Content gap · {g.skill}: {g.reason}
                </p>
              ))}

              {r.excluded.length > 0 && (
                <>
                  <h3>Why not offered</h3>
                  <DataTable
                    rows={r.excluded}
                    rowKey={(x) => x.activityId}
                    columns={[
                      { header: 'Activity', cell: (x) => x.title },
                      { header: 'Reason', className: 'whitespace-normal', cell: (x) => x.reason },
                    ]}
                  />
                </>
              )}
            </>
          )}
        </form>
      )}
    </Modal>
  );
}
