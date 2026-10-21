import { useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { DataTable } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { humanize } from '@/components/ui/Badge';
import { CountryAccessButton } from '@/components/CountryAccessButton';
import { errorMessage } from '@/api/client';
import { useActivities } from '@/api/activities';
import { useQuestions, type Question } from '@/api/questions';
import { useSkills, type Skill } from '@/api/skills';
import { useAuth } from '@/hooks/useAuth';
import { ActivityModal } from '../ActivityModal';
import { RegionPanel } from '../RegionPanel';
import { useSelectedRegion } from '../region';
import { SkillModal } from './SkillModal';
import { MapAnswersModal } from './MapAnswersModal';
import { SelectionPreviewModal } from './SelectionPreviewModal';

/**
 * Skill Personalisation (Guide §10). Prototype personalisation.js: skills per area (with the
 * guide's expected score per age), questionnaire answers mapped to skill stages, and each
 * activity's primary skill + stage, which drive personalised suggestions. Connected to
 * docs/API_REQUESTS.md #16 (skills, map answers, preview), #8 (questions) and #7 (activities).
 * Skills can't be deleted (backend decision 2026-10-13).
 */
export function SkillsPage() {
  const { can } = useAuth();
  const { regionId } = useSelectedRegion();
  const skillsQuery = useSkills(regionId);
  const questionsQuery = useQuestions({ regionId });
  const activitiesQuery = useActivities({ regionId });
  const [skill, setSkill] = useState<Skill | 'new' | null>(null);
  const [mapping, setMapping] = useState<Question | null>(null);
  const [activityId, setActivityId] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const canEdit = can('skillPersonalisation');
  const canEditActivities = can('activities') || can('developmentalMilestones');
  const skills = skillsQuery.data ?? [];

  const mapAnswers = (q: Question) => {
    if (!skills.some((s) => s.area.id === q.area.id)) return void toast.error(`Add a skill for ${q.area.name} first.`);
    setMapping(q);
  };

  return (
    <>
      <PageHeader
        back={{ to: '/activity-management', label: 'Activity Management' }}
        eyebrow="Skill Personalisation"
        title="Skill Personalisation"
        subtitle="Configure skills, map answers and explain personalised recommendations."
        actions={
          canEdit && (
            <>
              <CountryAccessButton types={['ACTIVITIES_SECTION', 'ACTIVITY', 'LEVEL']} />
              <Button onClick={() => setPreviewing(true)}>Preview child selection</Button>
              <Button onClick={() => setSkill('new')}>Add skill</Button>
            </>
          )
        }
      />
      <RegionPanel />

      <Panel title="Skills">
        <DataTable
          loading={skillsQuery.isLoading}
          error={skillsQuery.isError ? errorMessage(skillsQuery.error) : undefined}
          rows={skills}
          rowKey={(s) => s.id}
          columns={[
            { header: 'Area', cell: (s) => s.area.name },
            { header: 'Skill', cell: (s) => s.name },
            { header: '', cell: (s) => canEdit && <Button onClick={() => setSkill(s)}>Edit</Button> },
          ]}
        />
      </Panel>

      <Panel title="Questionnaire links">
        <DataTable
          loading={questionsQuery.isLoading}
          error={questionsQuery.isError ? errorMessage(questionsQuery.error) : undefined}
          rows={questionsQuery.data}
          rowKey={(q) => q.id}
          columns={[
            { header: 'Area', cell: (q) => q.area.name },
            { header: 'Question', cell: (q) => q.text },
            { header: 'Skill', cell: (q) => q.skill?.name ?? 'Not mapped' },
            { header: '', cell: (q) => canEdit && <Button onClick={() => mapAnswers(q)}>Map answers</Button> },
          ]}
        />
      </Panel>

      <Panel title="Activity tags">
        <DataTable
          loading={activitiesQuery.isLoading}
          error={activitiesQuery.isError ? errorMessage(activitiesQuery.error) : undefined}
          rows={activitiesQuery.data}
          rowKey={(a) => a.id}
          columns={[
            { header: 'Activity', cell: (a) => a.title },
            { header: 'Age / Level', cell: (a) => `${a.age} / ${a.level?.number ?? '—'}` },
            { header: 'Skill', cell: (a) => a.skill?.name ?? 'Not tagged' },
            // "Difficulty" in the prototype; "Difficulty" is reserved for Activity Flow difficulties.
            { header: 'Stage within level', cell: (a) => humanize(a.skillStage) },
            { header: 'Status', cell: (a) => humanize(a.status) },
            { header: '', cell: (a) => canEditActivities && <Button onClick={() => setActivityId(a.id)}>Edit activity</Button> },
          ]}
        />
      </Panel>

      {regionId && (
        <>
          <SkillModal open={skill !== null} skill={skill === 'new' ? undefined : (skill ?? undefined)} regionId={regionId} onClose={() => setSkill(null)} />
          <SelectionPreviewModal open={previewing} regionId={regionId} onClose={() => setPreviewing(false)} />
          <ActivityModal open={activityId !== null} activityId={activityId} regionId={regionId} onClose={() => setActivityId(null)} />
        </>
      )}
      <MapAnswersModal question={mapping} skills={skills} onClose={() => setMapping(null)} />
    </>
  );
}
