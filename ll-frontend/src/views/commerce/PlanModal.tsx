import { useLayoutEffect, useState } from 'react';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/Modal';
import { Note } from '@/components/ui/Panel';
import { FormGrid, SelectField, TextField } from '@/components/ui/Field';
import { DecisionActions, type SaveMode } from '@/components/DecisionActions';
import { RejectReasonModal } from '@/components/RejectReasonModal';
import { errorMessage } from '@/api/client';
import { useCountries } from '@/api/countries';
import { useRejectPlanChange, useSavePlan } from '@/api/plans';
import { useAuth } from '@/hooks/useAuth';
import { useApprovePending } from '@/hooks/useApprovePending';
import { MEMORY_ERROR, PLAN_PRICE_ERROR, editablePlan, memoryLabel, parseMemory, parsePrices, type Plan, type PlanContent } from './data';
import { CountryPriceFields } from './CountryPriceFields';
import { DRAFT_SAVED } from '@/constants/messages';

/**
 * "Edit {plan} plan" (prototype parent-content.js `planEditor`): status, memory items allowed and
 * the monthly price per country (blank = not purchasable there, 0 = free). Deliberate difference:
 * Free has no status or price fields, it's always active and free in every country, so only its
 * memory allowance is sent (API_REQUESTS #20). Reject (Super Admin, a change waiting for approval)
 * asks for a reason, which Draft approvals requires; Approve on an unedited pending change approves
 * that draft (useApprovePending). The country prices have a search box (deliberate difference).
 */

/** A plan's content for comparing (prices in country order); undefined when an input is invalid. */
const sameAs = (c: PlanContent | undefined) =>
  c && JSON.stringify([c.active, c.memoryLimit, Object.entries(c.prices).sort(([a], [b]) => a.localeCompare(b))]);
export function PlanModal({ plan, onClose }: { plan: Plan | null; onClose: () => void }) {
  const { isSuperAdmin } = useAuth();
  const { data: countries } = useCountries();
  const save = useSavePlan();
  const reject = useRejectPlanChange();
  const [rejecting, setRejecting] = useState(false);
  const [active, setActive] = useState('Active');
  const [memory, setMemory] = useState('');
  const [prices, setPrices] = useState<Record<string, string>>({});
  const isFree = plan?.tier === 'FREE';

  useLayoutEffect(() => {
    if (!plan) return;
    const c = editablePlan(plan);
    setActive(c.active ? 'Active' : 'Inactive');
    setMemory(memoryLabel(c.memoryLimit));
    setPrices(Object.fromEntries(Object.entries(c.prices).map(([k, v]) => [k, String(v)])));
    setRejecting(false);
  }, [plan?.tier]); // read once per opening

  /** The form as plan content, or undefined while an input is invalid. */
  const formContent = (): PlanContent | undefined => {
    const memoryLimit = parseMemory(memory);
    const parsed = isFree ? {} : parsePrices(prices);
    return memoryLimit === undefined || !parsed ? undefined : { active: isFree || active === 'Active', memoryLimit, prices: parsed };
  };
  const pending = useApprovePending(plan?.pending?.draftId, Boolean(plan?.pending) && sameAs(formContent()) === sameAs(plan ? editablePlan(plan) : undefined));

  const onSave = async (mode: SaveMode) => {
    if (!plan) return;
    if (mode === 'publish' && pending.viaDraft) {
      try {
        await pending.approve();
        toast.success(`${plan.name} plan saved`);
        onClose();
      } catch (e) {
        toast.error(errorMessage(e));
      }
      return;
    }
    const memoryLimit = parseMemory(memory);
    if (memoryLimit === undefined) return void toast.error(MEMORY_ERROR);
    const parsed = isFree ? {} : parsePrices(prices);
    if (!parsed) return void toast.error(PLAN_PRICE_ERROR);
    try {
      const result = await save.mutateAsync({
        tier: plan.tier,
        mode,
        input: isFree ? { memoryLimit } : { active: active === 'Active', memoryLimit, prices: parsed },
      });
      toast.success(result.status === 'draft' ? DRAFT_SAVED : `${plan.name} plan saved`);
      onClose();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const onReject = async (reason: string) => {
    if (!plan?.pending) return;
    try {
      await reject.mutateAsync({ draftId: plan.pending.draftId, reason });
      toast.success('Change rejected. Parents still see the published plan.');
      setRejecting(false);
      onClose();
    } catch (e) {
      toast.error(errorMessage(e));
      throw e;
    }
  };

  return (
    <Modal
      open={plan !== null}
      onClose={onClose}
      title={plan ? `Edit ${plan.name} plan` : 'Edit plan'}
      footer={
        <DecisionActions
          onClose={onClose}
          onSave={onSave}
          onReject={() => setRejecting(true)}
          showReject={isSuperAdmin && plan?.pending?.status === 'PENDING_APPROVAL'}
          busy={save.isPending || reject.isPending || pending.isPending}
          note={pending.note}
        />
      }
    >
      {plan && (
        <>
          {plan.pending && (
            <Note className="mt-0">
              {plan.pending.status === 'PENDING_APPROVAL' ? 'This change is waiting for Super Admin approval.' : 'You are editing a saved draft of this plan.'}{' '}
              Parents still see the published plan.
            </Note>
          )}
          <FormGrid>
            {!isFree && (
              <SelectField
                label="Status"
                value={active}
                onChange={(e) => setActive(e.target.value)}
                options={[
                  { value: 'Active', label: 'Active' },
                  { value: 'Inactive', label: 'Inactive' },
                ]}
              />
            )}
            <TextField label="Memory items allowed" value={memory} onChange={(e) => setMemory(e.target.value)} />
          </FormGrid>
          <p className="mb-6 mt-2 rounded-[10px] bg-note px-[18px] py-[15px] text-[12px] leading-[1.7] text-body">
            Enter a whole number (including 0) or Unlimited. The parent app enforces this item count. Child profiles are unlimited on every plan.
          </p>
          <h3>Monthly country prices</h3>
          {isFree ? (
            <p className="leading-[1.7] text-muted">Free is always active and free in every country, so it has no prices.</p>
          ) : (
            <>
              <p className="mb-4 leading-[1.7] text-muted">
                Leave blank to prevent purchase in that country. Amounts are in the country’s currency; no automatic conversion.
              </p>
              <CountryPriceFields countries={countries ?? []} values={prices} onChange={(code, value) => setPrices((p) => ({ ...p, [code]: value }))} />
            </>
          )}
        </>
      )}
      <RejectReasonModal
        open={rejecting}
        onClose={() => setRejecting(false)}
        onReject={onReject}
        busy={reject.isPending}
        text="The change is discarded and parents keep seeing the published plan. The author sees the reason in Draft approvals."
      />
    </Modal>
  );
}
