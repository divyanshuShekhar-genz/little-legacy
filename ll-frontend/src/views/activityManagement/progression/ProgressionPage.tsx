import { useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { DataTable } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { humanize } from '@/components/ui/Badge';
import { CountryAccessButton } from '@/components/CountryAccessButton';
import { errorMessage } from '@/api/client';
import { useAgeGroups, useAreas } from '@/api/areas';
import { useCategoryNames } from '@/api/categories';
import { useActivities, useRemoveFromGroup } from '@/api/activities';
import {
  exportProgression,
  useActivityGroups,
  useArchiveGroup,
  useProgression,
  useSaveProgression,
  type ActivityGroup,
} from '@/api/progression';
import { PLAN_LABELS, type PlanTier } from '@/constants/plans';
import { useAuth } from '@/hooks/useAuth';
import { ActivityModal, type DifficultyGroup } from '../ActivityModal';
import { ApiConfirmModal, pText } from '../ConfirmModal';
import { EditorCard } from '../parts';
import { RegionPanel } from '../RegionPanel';
import { useSelectedRegion } from '../region';
import { saveWith } from '../saved';
import { SettingsModal } from './SettingsModal';
import { AllocationRuleModal } from './AllocationRuleModal';
import { GroupModal } from './GroupModal';
import { LinkContentModal, linkCandidates } from './LinkContentModal';
import { WeekPreviewModal } from './WeekPreviewModal';

type Level = ActivityGroup['levels'][number];
type Dialog =
  | { name: 'settings' }
  | { name: 'rule'; index?: number }
  | { name: 'removeRule'; index: number }
  | { name: 'group'; group?: ActivityGroup }
  | { name: 'archive'; group: ActivityGroup }
  | { name: 'content'; group: ActivityGroup; activityId: string | null }
  | { name: 'removeContent'; level: Level }
  | { name: 'link'; group: ActivityGroup }
  | { name: 'preview' }
  | null;

/**
 * Activity Progression (Activity Flow §1–19). Prototype activity-progression.js
 * `progressionWorkspace()`: Development Bases choose where each activity group starts; each group
 * then progresses through its own difficulties. Connected to docs/API_REQUESTS.md #14: settings
 * (Bases, weekly limits and overrides in one save), activity groups, the week preview and the
 * export. Everything needs Activity Progression. A group's difficulties are ordinary activities
 * (groupId + difficulty) saved through /api/activities, so adding, editing or removing one from its
 * group (it stays an activity; delete or withdraw it on the Activities card) also
 * needs Activities or Developmental Milestones; linking existing content doesn't.
 * Panel buttons sit on their panels (in the prototype they were one long toolbar).
 */
export function ProgressionPage() {
  const { can } = useAuth();
  const { regionId } = useSelectedRegion();
  const settingsQuery = useProgression(regionId);
  const groupsQuery = useActivityGroups(regionId);
  const { data: areas } = useAreas(regionId);
  const { data: ageGroups } = useAgeGroups(regionId);
  const { data: activities } = useActivities({ regionId });
  const groups = groupsQuery.data ?? [];
  const categoryNames = useCategoryNames(groups.map((g) => g.areaId));
  const saveSettings = useSaveProgression();
  const archive = useArchiveGroup();
  const removeFromGroup = useRemoveFromGroup();
  const [dialog, setDialog] = useState<Dialog>(null);
  const close = () => setDialog(null);

  const canEdit = can('activityProgression');
  // Difficulties are saved through /api/activities, which needs one of these.
  const canEditContent = can('activities') || can('developmentalMilestones');
  const s = settingsQuery.data;

  const areaName = (id: string) => areas?.find((a) => a.id === id)?.name ?? '';
  const asGroup = (g: ActivityGroup): DifficultyGroup => ({
    id: g.id,
    name: g.name,
    areaId: g.areaId,
    categoryId: g.categoryId,
    age: g.age,
    nextDifficulty: Math.max(0, ...g.levels.map((l) => l.level)) + 1,
  });

  const runExport = async () => {
    if (!regionId) return;
    try {
      await exportProgression(regionId);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const link = (g: ActivityGroup) => {
    if (!linkCandidates(activities ?? [], g).length) {
      return void toast.error('No ungrouped activities match this area, category and age. Add a difficulty instead.');
    }
    setDialog({ name: 'link', group: g });
  };

  return (
    <>
      <PageHeader
        back={{ to: '/activity-management', label: 'Activity Management' }}
        eyebrow="Activity Progression"
        title="Individual activity progression"
        subtitle="Development Base chooses the start. Each activity then progresses independently."
        actions={
          <>
            {canEdit && <CountryAccessButton types={['ACTIVITIES_SECTION', 'ACTIVITY', 'LEVEL']} />}
            <Button onClick={() => setDialog({ name: 'preview' })}>Preview a child’s week</Button>
            <Button onClick={runExport}>Export progression rules</Button>
            {canEdit && <Button onClick={() => setDialog({ name: 'group' })}>Add activity group</Button>}
          </>
        }
      />

      <RegionPanel />

      {settingsQuery.isError && <p className="mb-6 text-danger">{errorMessage(settingsQuery.error)}</p>}

      <Panel
        title="Starting Bases and weekly settings"
        actions={canEdit && s && <Button onClick={() => setDialog({ name: 'settings' })}>Base &amp; weekly settings</Button>}
      >
        <DataTable
          loading={settingsQuery.isLoading}
          rows={s?.bases}
          rowKey={(b) => b.name}
          columns={[
            { header: 'Base', cell: (b) => b.name },
            {
              header: 'Assessment range',
              cell: (b) => {
                const next = s!.bases[s!.bases.indexOf(b) + 1];
                return `${b.from} to ${next ? `under ${next.from}` : 100}%`;
              },
            },
            { header: 'Default starting difficulty', cell: (b) => b.start },
          ]}
        />
        {s && (
          <p className={pText}>
            {s.weekly} new activities · {s.pendingEnabled ? s.pendingLimit : 0} pending · pending {s.pendingCounts ? 'included in' : 'additional to'}{' '}
            weekly limit · {s.recent} recent completions · {s.continueCount} Continue Learning cards
            {s.maxVisible !== null && ` · at most ${s.maxVisible} visible (last week’s completions + 5)`}.
          </p>
        )}
      </Panel>

      <Panel title="Allocation overrides" actions={canEdit && s && <Button onClick={() => setDialog({ name: 'rule' })}>Add allocation rule</Button>}>
        <DataTable
          loading={settingsQuery.isLoading}
          rows={s?.overrides}
          rowKey={(r) => `${r.age}|${r.base}|${r.area}|${r.plan}`}
          columns={[
            { header: 'Age', cell: (r) => r.age },
            { header: 'Base', cell: (r) => r.base },
            { header: 'Area', cell: (r) => (r.area === 'All' ? 'All' : areaName(r.area) || 'Removed area') },
            { header: 'Plan', cell: (r) => (r.plan === 'All' ? 'All' : (PLAN_LABELS[r.plan as PlanTier] ?? r.plan)) },
            { header: 'Weekly limit', cell: (r) => r.limit },
            { header: 'Start', cell: (r) => r.start },
            {
              header: '',
              cell: (r) =>
                canEdit && (
                  <div className="flex gap-2">
                    <Button onClick={() => setDialog({ name: 'rule', index: s!.overrides.indexOf(r) })}>Edit</Button>
                    <Button onClick={() => setDialog({ name: 'removeRule', index: s!.overrides.indexOf(r) })}>Remove</Button>
                  </div>
                ),
            },
          ]}
        />
      </Panel>

      <Panel title="Activities and their own difficulties">
        {groupsQuery.isError && <p className="mb-6 text-danger">{errorMessage(groupsQuery.error)}</p>}
        {canEdit && !canEditContent && (
          <p className={pText}>
            Adding, editing or removing a difficulty from its group saves an activity, so it also needs Activities or Developmental Milestones access. You can
            still link existing content.
          </p>
        )}
        {groupsQuery.data && !groups.length && (
          <p className={pText}>Add an activity group, then add its difficulty levels. There is no maximum level of 7.</p>
        )}
        {groups.map((g) => (
          <EditorCard key={g.id}>
            <h3 className="m-0">
              {g.name} {g.archived && '· Archived'}
            </h3>
            <p className={pText}>
              {areaName(g.areaId)} · {g.categoryId ? (categoryNames[g.categoryId] ?? '') : 'No category'} · Age {g.age} · {g.bases.join(', ')}
            </p>
            {canEdit && !g.archived && (
              <div className="mb-6 flex flex-wrap items-center gap-3">
                <Button onClick={() => setDialog({ name: 'group', group: g })}>Edit group</Button>
                {canEditContent && <Button onClick={() => setDialog({ name: 'content', group: g, activityId: null })}>Add difficulty level</Button>}
                <Button onClick={() => link(g)}>Link existing content</Button>
                <Button onClick={() => setDialog({ name: 'archive', group: g })}>Archive group</Button>
              </div>
            )}
            <DataTable
              rows={g.levels}
              rowKey={(l) => l.id}
              columns={[
                { header: 'Difficulty', cell: (l) => l.level },
                { header: 'Content', cell: (l) => l.title },
                { header: 'Repetitions needed', cell: (l) => l.mastery },
                { header: 'Plan', cell: (l) => PLAN_LABELS[l.requiredPlan] },
                { header: 'Availability', cell: (l) => humanize(l.status) },
                {
                  header: '',
                  cell: (l) =>
                    canEdit &&
                    canEditContent &&
                    !g.archived && (
                      <div className="flex gap-2">
                        <Button onClick={() => setDialog({ name: 'content', group: g, activityId: l.id })}>Edit content</Button>
                        <Button onClick={() => setDialog({ name: 'removeContent', level: l })}>Remove from group</Button>
                      </div>
                    ),
                },
              ]}
            />
          </EditorCard>
        ))}
      </Panel>

      {regionId && s && (
        <>
          <SettingsModal open={dialog?.name === 'settings'} regionId={regionId} settings={s} onClose={close} />
          <AllocationRuleModal
            open={dialog?.name === 'rule'}
            index={dialog?.name === 'rule' ? dialog.index : undefined}
            regionId={regionId}
            settings={s}
            areas={areas ?? []}
            ageGroups={ageGroups ?? []}
            onClose={close}
          />
        </>
      )}
      {regionId && (
        <>
          <GroupModal
            open={dialog?.name === 'group'}
            group={dialog?.name === 'group' ? dialog.group : undefined}
            regionId={regionId}
            areas={areas ?? []}
            ageGroups={ageGroups ?? []}
            onClose={close}
          />
          <ActivityModal
            open={dialog?.name === 'content'}
            activityId={dialog?.name === 'content' ? dialog.activityId : null}
            regionId={regionId}
            group={dialog?.name === 'content' ? asGroup(dialog.group) : undefined}
            onClose={close}
          />
        </>
      )}
      <LinkContentModal
        group={dialog?.name === 'link' ? dialog.group : null}
        candidates={dialog?.name === 'link' ? linkCandidates(activities ?? [], dialog.group) : []}
        onClose={close}
      />
      <WeekPreviewModal open={dialog?.name === 'preview'} ageGroups={ageGroups ?? []} onClose={close} />

      {dialog?.name === 'removeRule' && regionId && s && (
        <ApiConfirmModal
          open
          title="Remove allocation rule"
          busy={saveSettings.isPending}
          onClose={close}
          onSave={async (mode) =>
            Boolean(
              await saveWith(
                () => saveSettings.mutateAsync({ regionId, mode, settings: { ...s, overrides: s.overrides.filter((_, i) => i !== dialog.index) } }),
                'Removed allocation override',
              ),
            )
          }
        >
          <p className={pText}>The regional default will apply when no other override matches.</p>
        </ApiConfirmModal>
      )}
      {dialog?.name === 'archive' && (
        <ApiConfirmModal
          open
          title="Archive activity group"
          busy={archive.isPending}
          onClose={close}
          onSave={async (mode) => Boolean(await saveWith(() => archive.mutateAsync({ id: dialog.group.id, mode }), `Archived activity group ${dialog.group.name}`))}
        >
          <p className={pText}>
            Remove this group from future assignments and active availability. Previously earned scores and history remain unchanged.
          </p>
        </ApiConfirmModal>
      )}
      {dialog?.name === 'removeContent' && (
        <ApiConfirmModal
          open
          title="Remove from group"
          busy={removeFromGroup.isPending}
          onClose={close}
          onSave={async (mode) =>
            Boolean(await saveWith(() => removeFromGroup.mutateAsync({ id: dialog.level.id, mode }), `Removed from group: ${dialog.level.title}`))
          }
        >
          <p className={pText}>
            {dialog.level.title} leaves this group and stays an ordinary activity with all its content and history. To delete or withdraw it, use
            the Activities card.
          </p>
        </ApiConfirmModal>
      )}
    </>
  );
}
