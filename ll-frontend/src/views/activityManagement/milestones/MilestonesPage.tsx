import { useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { CountryAccessButton } from '@/components/CountryAccessButton';
import { errorMessage } from '@/api/client';
import { useAgeGroups, useAreas, type DevelopmentArea } from '@/api/areas';
import { useCategories, useDeleteCategory, type ActivityCategory } from '@/api/categories';
import { useDeleteLevel, useLevels, type AreaLevel } from '@/api/levels';
import { useActivities, type ActivityRow } from '@/api/activities';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/utils/cn';
import { plural } from '@/utils/format';
import { ApiConfirmModal, pText } from '../ConfirmModal';
import { RegionPanel } from '../RegionPanel';
import { AgeGroupModal } from '../AgeGroupModal';
import { AreaModal } from '../AreaModal';
import { DeleteAreaModal } from '../DeleteAreaModal';
import { ActivityTable } from '../ActivityTable';
import { ActivityModal } from '../ActivityModal';
import { ViewActivityModal } from '../ViewActivityModal';
import { DeleteActivityModal } from '../DeleteActivityModal';
import { useSelectedRegion } from '../region';
import { saveWith } from '../saved';
import { CategoryModal } from './CategoryModal';
import { LevelModal } from './LevelModal';

type Dialog =
  | { name: 'age' }
  | { name: 'area'; area?: DevelopmentArea }
  | { name: 'deleteArea'; area: DevelopmentArea }
  | { name: 'category'; category?: ActivityCategory }
  | { name: 'removeCategory'; category: ActivityCategory }
  | { name: 'level'; level?: AreaLevel }
  | { name: 'deleteLevel'; level: AreaLevel }
  | { name: 'activity'; activityId: string | null }
  | { name: 'viewActivity'; activityId: string }
  | { name: 'deleteActivity'; activity: ActivityRow }
  | null;

/** The prototype's `.level-card`. */
function Card({ children }: { children: ReactNode }) {
  return <section className="rounded-card border border-line bg-white p-5">{children}</section>;
}

/** The prototype's `.level-card .actions`. */
function CardActions({ children }: { children: ReactNode }) {
  return <div className="mt-6 flex flex-wrap justify-end gap-2.5">{children}</div>;
}

const grid = 'grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-5';
const empty = 'p-[45px] text-center text-faint';

/**
 * Developmental Milestones (Guide §5, §9). Prototype development-categories.js
 * `renderDevelopmentHierarchy()` + workspace.js area cards. Drill-down, kept in the URL:
 * areas → categories (optional) → levels with age tabs → a level's activities.
 * Connected: areas and age groups (#5), categories and levels (#6), activities (#7).
 */
export function MilestonesPage() {
  const navigate = useNavigate();
  const { can } = useAuth();
  const canEdit = can('developmentalMilestones');
  const [params, setParams] = useSearchParams();
  const [dialog, setDialog] = useState<Dialog>(null);
  const close = () => setDialog(null);

  const { regionId } = useSelectedRegion();
  const areasQuery = useAreas(regionId);
  const { data: ageGroups } = useAgeGroups(regionId);
  const areas = areasQuery.data ?? [];
  const area = areas.find((a) => a.id === params.get('area')) ?? null;

  const { data: categories, isLoading: categoriesLoading } = useCategories(area?.id);
  const category = categories?.find((c) => c.id === params.get('category')) ?? null;
  const needsCategory = Boolean(categories?.length) && !category;

  const ages = (ageGroups ?? []).map((g) => g.age);
  const ageParam = params.get('age');
  const age = ageParam !== null ? Number(ageParam) : ages.includes(4) ? 4 : (ages[0] ?? 4);

  const levelsQuery = useLevels({ areaId: area && !needsCategory && !categoriesLoading ? area.id : null, categoryId: category?.id ?? null, age });
  const levels = levelsQuery.data?.levels ?? [];
  const level = levels.find((l) => String(l.number) === params.get('level')) ?? null;

  const activitiesQuery = useActivities(
    { regionId, areaId: area?.id, categoryId: category?.id, levelId: level?.id, age },
    Boolean(level),
  );

  const removeCategory = useDeleteCategory();
  const deleteLevel = useDeleteLevel();

  /** Change the drill-down. `undefined` keeps a value, `null` clears it. */
  const go = (next: { area?: string | null; category?: string | null; level?: number | null; age?: number }) => {
    const p = new URLSearchParams(params);
    for (const [key, value] of Object.entries(next)) {
      if (value === undefined) continue;
      if (value === null) p.delete(key);
      else p.set(key, String(value));
    }
    setParams(p);
  };

  // ----- Heading for the current step -----
  let title: string;
  let subtitle: string;
  let action: ReactNode = null;
  if (!area) {
    title = 'Development areas';
    subtitle = 'Choose a development area to manage its categories.';
    action = (
      <>
        <Button onClick={() => setDialog({ name: 'age' })}>+ Add age group</Button>
        <Button variant="primary" onClick={() => setDialog({ name: 'area' })}>
          + Add development area
        </Button>
      </>
    );
  } else if (needsCategory) {
    title = `${area.name} categories`;
    subtitle = 'Add, edit or remove categories, then open their levels.';
    action = (
      <Button variant="primary" onClick={() => setDialog({ name: 'category' })}>
        + Add category
      </Button>
    );
  } else {
    title = level ? level.title || `Level ${level.number}` : `${category?.name ?? area.name} levels`;
    subtitle = category ? `${area.name} · ${category.name}` : 'Manage levels directly. Add categories only when you need them.';
    action = level ? (
      <Button variant="primary" onClick={() => setDialog({ name: 'activity', activityId: null })}>
        + Add Activity
      </Button>
    ) : (
      <Button variant="primary" onClick={() => setDialog({ name: 'level' })}>
        + Add Level
      </Button>
    );
  }

  return (
    <>
      <PageHeader
        back={{ to: '/activity-management', label: 'Activity Management' }}
        eyebrow="Developmental Milestones"
        title={title}
        subtitle={subtitle}
        actions={
          canEdit && (
            <>
              <CountryAccessButton types={['ACTIVITIES_SECTION', 'ACTIVITY', 'LEVEL']} />
              {action}
            </>
          )
        }
      />

      <RegionPanel onRegionChange={() => setParams({})} />

      {area && (
        <div className="mb-6 flex flex-wrap items-center gap-2.5 text-muted">
          <Button onClick={() => setParams({})}>All development areas</Button>{' '}
          <span>
            › {area.name}
            {category && ` › ${category.name}`}
            {level && ` › Level ${level.number}`}
          </span>
        </div>
      )}

      {/* Areas */}
      {!area && (
        <div className={grid}>
          {areas.map((a) => (
            <Card key={a.id}>
              <h2 className="mb-[18px] mt-5">{a.name}</h2>
              <p className={pText}>{a.description}</p>
              <small className="text-muted">
                {plural(a.counts.questions, 'question')} · {plural(a.counts.categories, 'category')} · {plural(a.counts.levels, 'level')}
              </small>
              <CardActions>
                {canEdit && (
                  <>
                    <Button onClick={() => setDialog({ name: 'area', area: a })}>Edit</Button>
                    <Button onClick={() => setDialog({ name: 'deleteArea', area: a })}>Delete</Button>
                  </>
                )}
                <Button variant="primary" onClick={() => go({ area: a.id, category: null, level: null })}>
                  {a.counts.categories ? 'Open categories →' : 'Open levels →'}
                </Button>
                {can('questionnairesLevels') && <Button onClick={() => navigate(`/activity-management/questionnaires?area=${a.id}`)}>Questions</Button>}
              </CardActions>
            </Card>
          ))}
          {areasQuery.isLoading && <p className={empty}>Loading…</p>}
          {areasQuery.isError && <p className="p-[45px] text-center text-danger">{errorMessage(areasQuery.error)}</p>}
          {areasQuery.isSuccess && !areas.length && <p className={empty}>No development areas yet. New categories start empty.</p>}
        </div>
      )}

      {/* Categories */}
      {area && needsCategory && (
        <div className={grid}>
          {categories!.map((c) => (
            <Card key={c.id}>
              <h2 className="mb-[18px] mt-5">{c.name}</h2>
              <p className={pText}>{c.description}</p>
              <small className="text-muted">
                {plural(c.counts.levels, 'level')} · {plural(c.counts.activities, 'activity')}
              </small>
              <CardActions>
                {canEdit && (
                  <>
                    <Button onClick={() => setDialog({ name: 'category', category: c })}>Edit</Button>
                    <Button onClick={() => setDialog({ name: 'removeCategory', category: c })}>Remove</Button>
                  </>
                )}
                <Button variant="primary" onClick={() => go({ category: c.id, level: null })}>
                  Open levels →
                </Button>
              </CardActions>
            </Card>
          ))}
        </div>
      )}

      {/* Levels, or one level's activities */}
      {area && !needsCategory && !categoriesLoading && (
        <>
          <div className="mb-6 inline-flex flex-wrap items-center gap-3 rounded-card bg-line p-1">
            {category ? (
              <TabButton onClick={() => go({ category: null, level: null })}>← Categories</TabButton>
            ) : (
              canEdit && <TabButton onClick={() => setDialog({ name: 'category' })}>+ Add category</TabButton>
            )}
            {ages.map((a) => (
              <TabButton key={a} selected={a === age} onClick={() => go({ age: a })}>
                {a} years
              </TabButton>
            ))}
            {canEdit && <TabButton onClick={() => setDialog({ name: 'age' })}>+ Add age group</TabButton>}
            {level && <TabButton onClick={() => go({ level: null })}>← Back to levels</TabButton>}
          </div>

          {level ? (
            <Panel>
              <h2 className="mb-[18px]">Activities List</h2>
              <ActivityTable
                rows={activitiesQuery.data}
                loading={activitiesQuery.isLoading}
                error={activitiesQuery.isError ? errorMessage(activitiesQuery.error) : undefined}
                onView={(a) => setDialog({ name: 'viewActivity', activityId: a.id })}
                onEdit={canEdit ? (a) => setDialog({ name: 'activity', activityId: a.id }) : undefined}
                onDelete={canEdit ? (a) => setDialog({ name: 'deleteActivity', activity: a }) : undefined}
              />
            </Panel>
          ) : (
            <>
              <div className={grid}>
                {levels.map((l) => (
                  <Card key={l.id}>
                    <div className="flex items-center justify-between gap-[15px] pb-[17px]">
                      <span className="inline-block whitespace-nowrap rounded-[20px] bg-accent-soft px-2.5 py-[5px] text-[11px] text-accent">
                        LEVEL {l.number}
                      </span>
                      {canEdit && (
                        <div>
                          <Button onClick={() => setDialog({ name: 'level', level: l })}>Edit</Button>{' '}
                          <Button onClick={() => setDialog({ name: 'deleteLevel', level: l })}>Delete</Button>
                        </div>
                      )}
                    </div>
                    <h2 className="mb-[18px] mt-5">{l.title || `Level ${l.number}`}</h2>
                    <small className="text-muted">
                      {l.requiredScore} score · {plural(l.requiredMastered, 'activity', 'activities')} with repetitions complete required
                    </small>
                    <div className="mt-5 flex items-center justify-between gap-[15px] border-t border-line py-[17px]">
                      <span>{plural(l.activityCount, 'activity')}</span>
                      <Button onClick={() => go({ level: l.number })}>Open activities →</Button>
                    </div>
                  </Card>
                ))}
                {levelsQuery.isLoading && <p className={empty}>Loading…</p>}
                {levelsQuery.isError && <p className="p-[45px] text-center text-danger">{errorMessage(levelsQuery.error)}</p>}
                {levelsQuery.isSuccess && !levels.length && <p className={empty}>No levels yet. Add the first level.</p>}
              </div>
              <p className="mb-6 mt-2 rounded-[10px] bg-note px-[18px] py-[15px] text-[12px] leading-[1.7] text-body">
                Age tabs filter the activities in these levels.
              </p>
            </>
          )}
        </>
      )}

      {/* Dialogs */}
      {regionId && (
        <>
          <AgeGroupModal open={dialog?.name === 'age'} regionId={regionId} onClose={close} onAdded={(a) => go({ age: a })} />
          <AreaModal open={dialog?.name === 'area'} regionId={regionId} area={dialog?.name === 'area' ? dialog.area : undefined} onClose={close} />
          <ActivityModal
            open={dialog?.name === 'activity'}
            activityId={dialog?.name === 'activity' ? dialog.activityId : null}
            regionId={regionId}
            defaults={{ areaId: area?.id, categoryId: category?.id ?? null, levelId: level?.id, age }}
            onClose={close}
          />
        </>
      )}
      <DeleteAreaModal area={dialog?.name === 'deleteArea' ? dialog.area : null} onClose={close} onDeleted={() => setParams({})} />
      <ViewActivityModal activityId={dialog?.name === 'viewActivity' ? dialog.activityId : null} onClose={close} />
      <DeleteActivityModal activity={dialog?.name === 'deleteActivity' ? dialog.activity : null} onClose={close} />
      {area && (
        <>
          <CategoryModal
            open={dialog?.name === 'category'}
            area={area}
            isFirst={!categories?.length}
            category={dialog?.name === 'category' ? dialog.category : undefined}
            onClose={close}
          />
          <LevelModal
            open={dialog?.name === 'level'}
            area={area}
            category={category}
            level={dialog?.name === 'level' ? dialog.level : undefined}
            nextNumber={levelsQuery.data?.nextNumber ?? 1}
            onClose={close}
          />
        </>
      )}
      {area && dialog?.name === 'removeCategory' && (
        <ApiConfirmModal
          open
          title="Remove category"
          busy={removeCategory.isPending}
          onClose={close}
          onSave={async (mode) => {
            const result = await saveWith(
              () => removeCategory.mutateAsync({ id: dialog.category.id, mode }),
              `Removed ${area.name} category: ${dialog.category.name}`,
            );
            if (result?.status === 'published') go({ category: null, level: null });
            return Boolean(result);
          }}
        >
          <p className={pText}>
            Remove <b>{dialog.category.name}</b> from {area.name}, including {plural(dialog.category.counts.levels, 'level')} and{' '}
            {plural(dialog.category.counts.activities, 'activity')}?
          </p>
          <p className={pText}>
            These activities become unavailable. Child records, earned scores and history stay unchanged. To keep the activities available, move
            them to another category before removing this one.
          </p>
        </ApiConfirmModal>
      )}
      {area && dialog?.name === 'deleteLevel' && (
        <ApiConfirmModal
          open
          title="Delete Level"
          busy={deleteLevel.isPending}
          onClose={close}
          onSave={async (mode) =>
            Boolean(await saveWith(() => deleteLevel.mutateAsync({ id: dialog.level.id, mode }), `Deleted ${area.name} level ${dialog.level.number}`))
          }
        >
          <p className={pText}>
            Remove {dialog.level.title || `Level ${dialog.level.number}`} from {area.name}? A level that still has activities can’t be deleted: move
            or remove them first. Child records and earned levels remain.
          </p>
        </ApiConfirmModal>
      )}
    </>
  );
}

/** The prototype's `.age-tabs button` (plain, bold, muted; the selected age is a white chip). */
function TabButton({ selected, onClick, children }: { selected?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-md border-0 px-3.5 py-2.5 font-semibold leading-[normal]',
        selected ? 'bg-white text-accent shadow-[0_1px_3px_#0002]' : 'bg-transparent text-muted',
      )}
    >
      {children}
    </button>
  );
}
