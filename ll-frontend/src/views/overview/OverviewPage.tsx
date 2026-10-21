import { useNavigate } from 'react-router-dom';
import { useOverview } from '@/api/overview';
import { PageHeader } from '@/components/ui/PageHeader';
import { Note } from '@/components/ui/Panel';
import { StatCard } from '@/components/ui/StatCard';
import { BarChart } from '@/components/ui/BarChart';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import type { SectionAccess } from '@/constants/navigation';

// Copy and order match the client prototype (app.js, Overview).
const ATTENTION: { access: SectionAccess; label: string; to: string }[] = [
  { access: 'community', label: 'Review community submissions', to: '/users/community' },
  { access: 'enquiries', label: 'Respond to parent enquiries', to: '/users/enquiries' },
  { access: 'stories', label: 'Prepare personalised stories', to: '/stories' },
  { access: 'shopOrders', label: 'Manage dispatch and orders', to: '/commerce/shop' },
];

const panel = 'mb-[22px] rounded-card border border-line bg-white p-6 shadow-card';

/** Guide §4. */
export function OverviewPage() {
  const { can } = useAuth();
  const navigate = useNavigate();
  const { data } = useOverview();
  const n = (v: number | undefined) => v ?? '—';
  const levels = data?.childrenByLevel ?? [1, 2, 3].map((level) => ({ level, count: 0 }));

  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title="A little oversight. A lot of care."
        subtitle="Your team’s work, brought together."
      />
      <div className="mb-6 grid grid-cols-4 gap-4 max-[1000px]:grid-cols-2 max-[650px]:gap-2.5">
        <StatCard label="Child profiles" value={n(data?.childProfiles)} caption="Unlimited on every plan" />
        <StatCard label="Activities" value={n(data?.activities)} caption="Across development areas" />
        <StatCard label="Community queue" value={n(data?.communityQueue)} caption="Ready for your attention" />
        <StatCard label="Open enquiries" value={n(data?.openEnquiries)} caption="Conversations to follow up" />
      </div>

      <div className="grid grid-cols-[1.35fr_1fr] gap-[22px] max-[1000px]:grid-cols-1">
        <section className={panel}>
          <h2 className="mb-[18px]">Children by learning level</h2>
          <small className="text-muted">Child profiles · highest earned level</small>
          <BarChart data={levels.map((l) => ({ label: `Level ${l.level}`, value: l.count }))} />
        </section>

        <section className={panel}>
          <h2 className="mb-[18px]">Needs a little attention</h2>
          {ATTENTION.filter((a) => can(a.access)).map((a) => (
            <div key={a.to} className="flex items-center justify-between gap-[15px] border-b border-line py-[17px] last:border-0">
              <span>{a.label}</span>
              <Button onClick={() => navigate(a.to)}>Open →</Button>
            </div>
          ))}
        </section>
      </div>

      <Note className="mt-0">
        No child approval queue. Learning progression is governed by the score and repetition rules.
      </Note>
    </>
  );
}
