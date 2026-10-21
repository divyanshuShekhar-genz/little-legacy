import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { NavGroup } from '@/constants/navigation';
import { useAuth } from '@/hooks/useAuth';
import { PageHeader } from '@/components/ui/PageHeader';

/**
 * Landing page for a nav group with several sections (User Management, Plans & Commerce...).
 * Cards mirror the prototype's `.area-card`: title + chevron only. A group's own hub page (e.g.
 * Plans & Commerce, with its country list) passes header `actions` and content below the cards.
 */
export function HubPage({ group, subtitle, actions, children }: { group: NavGroup; subtitle: string; actions?: ReactNode; children?: ReactNode }) {
  const { can } = useAuth();
  return (
    <>
      <PageHeader eyebrow={group.label} title={group.label} subtitle={subtitle} actions={actions} />
      <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-5">
        {group.sections
          .filter((s) => can(s.access))
          .map((s) => (
            <Link
              key={s.path}
              to={s.path}
              className="flex min-h-[110px] items-center justify-between rounded-card border border-line bg-white px-5 py-[25px] text-left hover:border-accent"
            >
              <div className="min-w-0 pr-3">
                <strong className="mb-2 block text-[17px] font-bold text-accent-deep">{s.label}</strong>
              </div>
              <span className="text-2xl text-[#94a3b8]">›</span>
            </Link>
          ))}
      </div>
      {children}
    </>
  );
}
