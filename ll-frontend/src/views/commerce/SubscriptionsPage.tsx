import { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { Toolbar } from '@/components/ui/Toolbar';
import { DataTable } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { errorMessage } from '@/api/client';
import { useCountries, type Country } from '@/api/countries';
import { usePlans } from '@/api/plans';
import { formatMoney } from '@/utils/format';
import { memoryLabel, type Plan } from './data';
import { PlanModal } from './PlanModal';

const PENDING_LABEL = { DRAFT: 'Draft changes', PENDING_APPROVAL: 'Changes pending approval' } as const;

/** One country's line: "India: INR 199.00", "Kenya: Not purchasable", "(country disabled)". */
const line = (plan: Plan, c: Country) =>
  `${c.name}: ${plan.tier === 'FREE' ? formatMoney(0, c.currency) : plan.prices[c.code] === undefined ? 'Not purchasable' : formatMoney(plan.prices[c.code]!, c.currency)}${c.enabled ? '' : ' (country disabled)'}`;

/**
 * Subscriptions (guide §19; prototype parent-content.js `renderContentPlans`): Free / Plus /
 * Premium, the monthly price per child per country, and memory allowances (API_REQUESTS #20).
 * Deliberate differences: Free is always free (no price fields); with "All" countries, only
 * countries with a price are listed, plus a count of the rest (the prototype lists every country).
 */
export function SubscriptionsPage() {
  const { data: plans, isLoading, isError, error } = usePlans();
  const { data: countries } = useCountries();
  const [country, setCountry] = useState('');
  const [editing, setEditing] = useState<Plan | null>(null);

  const prices = (p: Plan) => {
    const all = countries ?? [];
    if (p.tier === 'FREE') return country ? [line(p, all.find((c) => c.code === country)!)] : ['Free in every country'];
    if (country) {
      const c = all.find((x) => x.code === country);
      return c ? [line(p, c)] : [];
    }
    const priced = all.filter((c) => p.prices[c.code] !== undefined);
    const rest = all.length - priced.length;
    return [...priced.map((c) => line(p, c)), ...(rest ? [`Not purchasable in the other ${rest} countries`] : [])];
  };

  return (
    <>
      <PageHeader
        back={{ to: '/commerce', label: 'Plans & Commerce' }}
        eyebrow="Subscriptions"
        title="Subscriptions"
        subtitle="Explicit monthly prices by country. Unlimited child profiles on every plan."
      />
      <Toolbar filter={country} onFilter={setCountry} filters={(countries ?? []).map((c) => ({ value: c.code, label: c.name }))} />
      <Panel>
        <DataTable
          loading={isLoading}
          error={isError ? errorMessage(error) : undefined}
          rows={plans}
          rowKey={(p) => p.tier}
          columns={[
            { header: 'Plan', cell: (p) => p.name },
            {
              header: 'Monthly country prices',
              className: 'whitespace-normal',
              cell: (p) => (
                <span className="block leading-[1.7]">
                  {prices(p).map((l) => (
                    <span key={l} className={l.startsWith('Not purchasable in') ? 'block text-muted' : 'block'}>
                      {l}
                    </span>
                  ))}
                </span>
              ),
            },
            { header: 'Memory items allowed', cell: (p) => memoryLabel(p.memoryLimit) },
            {
              header: 'Status',
              cell: (p) => (
                <>
                  {p.active ? <Badge tone="success">Active</Badge> : <Badge tone="neutral">Inactive</Badge>}
                  {p.pending && <small className="mt-[5px] block text-[12px] text-muted">{PENDING_LABEL[p.pending.status]}</small>}
                </>
              ),
            },
            { header: '', cell: (p) => <Button onClick={() => setEditing(p)}>Edit plan</Button> },
          ]}
        />
        <p className="mt-6 leading-[1.7] text-muted">
          Blank country prices mean unavailable there; zero is an explicitly free price. Country availability also applies. Manage countries in
          Shop &amp; Orders. No delivery fee is charged for subscriptions.
        </p>
      </Panel>
      <Panel title="New parent trial">
        {/* Guide §19 + OPEN_QUESTIONS Q10; the prototype's "this local panel…" sentence is prototype-only. */}
        <p className="leading-[1.7] text-body">
          The first child in an account can start a 7-day Plus trial once, from the app (“Start free trial”). Afterwards the child returns to
          Free; there is no automatic payment. Eligibility goes to the earliest child ever created in the account, even if that child was later
          removed.
        </p>
      </Panel>
      <PlanModal plan={editing} onClose={() => setEditing(null)} />
    </>
  );
}
