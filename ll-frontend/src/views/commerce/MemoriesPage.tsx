import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { DataTable } from '@/components/ui/DataTable';
import { useAuth } from '@/hooks/useAuth';
import { errorMessage } from '@/api/client';
import { usePlans } from '@/api/plans';
import { memoryLabel } from './data';

/**
 * Memories (guide §19; prototype parent-content.js): read only. Memory items allowed per child,
 * per plan (API_REQUESTS #20). Admins have no access to families' memories, which live on the parent's device.
 * Allowances are edited on Subscriptions ("Edit plan allowances", with that section).
 */
export function MemoriesPage() {
  const { can } = useAuth();
  const { data: plans, isLoading, isError, error } = usePlans();

  return (
    <>
      <PageHeader
        back={{ to: '/commerce', label: 'Plans & Commerce' }}
        eyebrow="Memories"
        title="Memories"
        subtitle="Parents manage their own memories on their device."
      />
      <Panel>
        <p className="mb-6 leading-[1.7] text-muted">There is no admin memory viewer, uploader or delete action.</p>
        <DataTable
          loading={isLoading}
          error={isError ? errorMessage(error) : undefined}
          rows={plans}
          rowKey={(p) => p.tier}
          columns={[
            { header: 'Plan', cell: (p) => p.name },
            { header: 'Memory items allowed', cell: (p) => memoryLabel(p.memoryLimit) },
          ]}
        />
        <p className="my-6 leading-[1.7] text-muted">
          This is an enforced item limit, not a storage size. Once the allowance is reached, parents must remove an item or choose a plan with
          more capacity. Child profiles remain unlimited.
        </p>
        {can('subscriptions') && (
          <Link
            to="/commerce/subscriptions"
            className="inline-flex items-center rounded-md border border-[#ded6e5] bg-white px-3.5 py-2.5 leading-[normal] text-[#334155] hover:bg-canvas"
          >
            Edit plan allowances
          </Link>
        )}
      </Panel>
    </>
  );
}
