import { useDeferredValue, useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { Toolbar } from '@/components/ui/Toolbar';
import { Button } from '@/components/ui/Button';
import { CountryAccessButton } from '@/components/CountryAccessButton';
import { errorMessage } from '@/api/client';
import { useAreas } from '@/api/areas';
import { useActivities, type ActivityRow } from '@/api/activities';
import { useAuth } from '@/hooks/useAuth';
import { ActivityTable } from '../ActivityTable';
import { ActivityModal } from '../ActivityModal';
import { ViewActivityModal } from '../ViewActivityModal';
import { DeleteActivityModal } from '../DeleteActivityModal';
import { RegionPanel } from '../RegionPanel';
import { useSelectedRegion } from '../region';

/**
 * Activities registry (Guide §9, §12). Prototype folder-alignment.js "Manage Activities": every
 * activity in the region, filtered by area. The same editor as Developmental Milestones.
 * Connected: docs/API_REQUESTS.md #7 (withdrawn activities are never listed).
 */
export function ActivitiesPage() {
  const { can } = useAuth();
  const { regionId } = useSelectedRegion();
  const { data: areas } = useAreas(regionId);
  const [search, setSearch] = useState('');
  const [areaId, setAreaId] = useState('');
  const { data, isLoading, isError, error } = useActivities({ regionId, areaId: areaId || undefined });
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<ActivityRow | null>(null);
  const term = useDeferredValue(search.trim().toLowerCase());
  const canEdit = can('activities') || can('developmentalMilestones');

  // Search matches any field, as in the prototype.
  const rows = data?.filter((a) => !term || JSON.stringify(a).toLowerCase().includes(term));

  return (
    <>
      <PageHeader
        back={{ to: '/activity-management', label: 'Activity Management' }}
        eyebrow="Activities"
        title="Manage Activities"
        subtitle="Browse the registry or manage activities through Developmental Milestones."
        actions={
          canEdit && (
            <>
              <CountryAccessButton types={['ACTIVITIES_SECTION', 'ACTIVITY', 'LEVEL']} />
              <Button variant="primary" onClick={() => setEditing('new')}>
                + Add Activity
              </Button>
            </>
          )
        }
      />
      <RegionPanel onRegionChange={() => setAreaId('')} />
      <Toolbar search={search} onSearch={setSearch} filter={areaId} onFilter={setAreaId} filters={(areas ?? []).map((a) => ({ value: a.id, label: a.name }))} />
      <Panel>
        <ActivityTable
          rows={rows}
          loading={isLoading}
          error={isError ? errorMessage(error) : undefined}
          onView={(a) => setViewing(a.id)}
          onEdit={canEdit ? (a) => setEditing(a.id) : undefined}
          onDelete={canEdit ? setDeleting : undefined}
        />
      </Panel>

      {regionId && (
        <ActivityModal
          open={editing !== null}
          activityId={editing === 'new' ? null : editing}
          regionId={regionId}
          defaults={{ areaId: areaId || undefined }}
          onClose={() => setEditing(null)}
        />
      )}
      <ViewActivityModal activityId={viewing} onClose={() => setViewing(null)} />
      <DeleteActivityModal activity={deleting} onClose={() => setDeleting(null)} />
    </>
  );
}
