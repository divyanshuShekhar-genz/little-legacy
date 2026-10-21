import { useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/ui/PageHeader';
import { Note, Panel } from '@/components/ui/Panel';
import { DataTable } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { DecisionActions, type SaveMode } from '@/components/DecisionActions';
import { errorMessage } from '@/api/client';
import { useDeleteRegion, useRegions, type LearningRegion } from '@/api/regions';
import { useAuth } from '@/hooks/useAuth';
import { DRAFT_SAVED } from '@/constants/messages';
import { RegionModal } from './RegionModal';
import { pText } from './ConfirmModal';

/**
 * Regional learning categories (Guide §5, CP §1–3), connected to docs/API_REQUESTS.md #4. Not a
 * prototype screen: the prototype keeps "Add regional category" and "Edit countries" beside the
 * region filter; they live here so the filter only filters. Changes are Super Admin only (the
 * API refuses others), so Sub Admins see the list read-only.
 * Temporary: "Export regional learning" is hidden until an export endpoint exists (#10).
 */
export function RegionsPage() {
  const { isSuperAdmin } = useAuth();
  const { data, isLoading, isError, error } = useRegions();
  const remove = useDeleteRegion();
  const [editing, setEditing] = useState<LearningRegion | 'new' | null>(null);
  const [removing, setRemoving] = useState<LearningRegion | null>(null);

  const onRemove = async (mode: SaveMode) => {
    if (!removing) return;
    try {
      const result = await remove.mutateAsync({ id: removing.id, mode });
      toast.success(result.status === 'draft' ? DRAFT_SAVED : 'Regional category removed');
      setRemoving(null);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <>
      <PageHeader
        back={{ to: '/activity-management', label: 'Activity Management' }}
        eyebrow="Regional learning categories"
        title="Regional learning categories"
        subtitle="Group countries into learning categories. Each category has its own complete learning catalogue."
        actions={
          isSuperAdmin && (
            <Button variant="primary" onClick={() => setEditing('new')}>
              Add regional category
            </Button>
          )
        }
      />
      <Panel>
        <DataTable
          loading={isLoading}
          error={isError ? errorMessage(error) : undefined}
          rows={data}
          rowKey={(r) => r.id}
          columns={[
            { header: 'Category', className: 'whitespace-normal', cell: (r) => r.name },
            {
              header: 'Countries',
              className: 'whitespace-normal',
              cell: (r) => (
                <span className="block max-w-[460px] leading-[1.7]">
                  {r.countries.length
                    ? r.countries.map((c, i) => (
                        <span key={c.code} title={c.name}>
                          {i > 0 && ' '}
                          {c.code}
                        </span>
                      ))
                    : '—'}
                </span>
              ),
            },
            { header: 'Default', cell: (r) => (r.isDefault ? <Badge tone="default">Default</Badge> : '—') },
            { header: 'Status', cell: (r) => (r.active ? <Badge tone="success">Active</Badge> : <Badge tone="neutral">Inactive</Badge>) },
            { header: 'Development areas', cell: (r) => r.counts.areas },
            { header: 'Activities', cell: (r) => r.counts.activities },
            { header: 'Children', cell: (r) => r.counts.children },
            ...(isSuperAdmin
              ? [
                  {
                    header: '',
                    cell: (r: LearningRegion) => (
                      <div className="flex gap-2">
                        <Button onClick={() => setEditing(r)}>Edit countries</Button>
                        <Button onClick={() => setRemoving(r)}>Remove</Button>
                      </div>
                    ),
                  },
                ]
              : []),
          ]}
        />
      </Panel>
      <Note>
        A country belongs to one learning category at a time; to move it, remove it from its current category first. New categories start
        empty and inactive, and editing one category never changes another. Countries in no category use the default category. An inactive
        category is skipped for new children only: a child keeps the category they started with. Only Super Admin can change categories.
      </Note>
      <RegionModal open={editing !== null} region={editing === 'new' ? undefined : (editing ?? undefined)} onClose={() => setEditing(null)} />
      <Modal
        open={removing !== null}
        onClose={() => setRemoving(null)}
        title="Remove regional category"
        footer={<DecisionActions onClose={() => setRemoving(null)} onSave={onRemove} showReject={false} busy={remove.isPending} />}
      >
        {removing && (
          <p className={pText}>
            Remove {removing.name}? Its learning catalogue is removed with it. A category that children already use, or the default category,
            can't be removed.
          </p>
        )}
      </Modal>
    </>
  );
}
