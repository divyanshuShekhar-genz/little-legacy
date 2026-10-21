import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { DataTable } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { humanize } from '@/components/ui/Badge';
import { CountryAccessButton } from '@/components/CountryAccessButton';
import { errorMessage } from '@/api/client';
import { useAreas } from '@/api/areas';
import { useCategories } from '@/api/categories';
import { useAreaLevels, type AreaLevel } from '@/api/levels';
import { QUESTION_DIFFICULTIES, useQuestions, type Question } from '@/api/questions';
import { useAuth } from '@/hooks/useAuth';
import { plural } from '@/utils/format';
import { RegionPanel } from '../RegionPanel';
import { useSelectedRegion } from '../region';
import { QuestionModal } from './QuestionModal';
import { LevelRequirementModal } from './LevelRequirementModal';

type LevelRow = AreaLevel & { category: { id: string; name: string } | null };

/**
 * Questionnaires & Levels (Guide §6). Prototype question-sets.js: each development area has its
 * own MCQ set (difficulty and marks are admin-only) and its level thresholds. Connected: questions
 * (docs/API_REQUESTS.md #8), levels (#6). The chosen area is kept in the URL (?area=), so
 * "Questions" on a milestones card opens it.
 */
export function QuestionnairesPage() {
  const { can } = useAuth();
  const [params, setParams] = useSearchParams();
  const [question, setQuestion] = useState<Question | 'new' | null>(null);
  const [level, setLevel] = useState<LevelRow | null>(null);

  const { regionId } = useSelectedRegion();
  const areasQuery = useAreas(regionId);
  const area = areasQuery.data?.find((a) => a.id === params.get('area')) ?? null;
  const questionsQuery = useQuestions({ areaId: area?.id });
  const { data: categories } = useCategories(area?.id);
  const levelsQuery = useAreaLevels(area?.id ?? null, categories);
  const questions = questionsQuery.data ?? [];
  const canEdit = can('questionnairesLevels');

  return (
    <>
      <PageHeader
        back={{ to: '/activity-management', label: 'Activity Management' }}
        eyebrow="Questionnaires & Levels"
        title={area ? `${area.name} questionnaire` : 'Questionnaires by category'}
        subtitle={
          area ? 'This category has its own question set. Keep at least one MCQ.' : 'Choose a development area to manage its own questions and answer marks.'
        }
        actions={
          canEdit && (
            <>
              <CountryAccessButton types={['ACTIVITIES_SECTION', 'ACTIVITY', 'LEVEL']} />
              {area && (
                <Button variant="primary" onClick={() => setQuestion('new')}>
                  Add question
                </Button>
              )}
            </>
          )
        }
      />

      <RegionPanel onRegionChange={() => setParams({})} />

      {!area && (
        <>
          {areasQuery.isError && <p className="mb-6 text-danger">{errorMessage(areasQuery.error)}</p>}
          {areasQuery.isLoading && <p className="p-[45px] text-center text-faint">Loading…</p>}
          {areasQuery.data && !areasQuery.data.length && <p className="p-[45px] text-center text-faint">No development areas in this category yet.</p>}
          <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-5">
            {(areasQuery.data ?? []).map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setParams({ area: a.id })}
                className="flex min-h-[110px] items-center justify-between rounded-card border border-line bg-white px-5 py-[25px] text-left hover:border-accent"
              >
                <span className="min-w-0 pr-3">
                  <strong className="mb-2 block text-[17px] font-bold text-accent-deep">{a.name} Development</strong>
                  <small className="leading-[1.6] text-muted">
                    {plural(a.counts.questions, 'question')} · {plural(a.counts.levels, 'level')}
                  </small>
                </span>
                <span className="text-2xl text-[#94a3b8]">›</span>
              </button>
            ))}
          </div>
        </>
      )}

      {area && (
        <>
          <div className="mb-6 flex flex-wrap items-center gap-2.5 text-muted">
            <Button onClick={() => setParams({})}>← All categories</Button>
            <span>› {area.name}</span>
          </div>

          <Panel>
            <h2 className="mb-[18px]">
              {area.name} questions ({questions.length})
            </h2>
            <p className="mb-6 mt-2 leading-[1.7] text-muted">
              Admin-only difficulty: {QUESTION_DIFFICULTIES.map((d) => `${humanize(d)} ${questions.filter((q) => q.difficulty === d).length}`).join(' · ')}
            </p>
            <DataTable
              loading={questionsQuery.isLoading}
              error={questionsQuery.isError ? errorMessage(questionsQuery.error) : undefined}
              rows={questions}
              rowKey={(q) => q.id}
              columns={[
                { header: 'Question', cell: (q) => q.text },
                { header: 'Difficulty · admin only', cell: (q) => humanize(q.difficulty) },
                { header: 'Age', cell: (q) => q.age ?? 'All supported ages' },
                { header: 'Answer options', cell: (q) => q.options.length },
                { header: '', cell: (q) => canEdit && <Button onClick={() => setQuestion(q)}>Edit</Button> },
              ]}
            />
          </Panel>

          <Panel>
            <h2 className="mb-[18px]">{area.name} level requirements</h2>
            <DataTable
              loading={levelsQuery.isLoading}
              error={levelsQuery.error ? errorMessage(levelsQuery.error) : undefined}
              rows={levelsQuery.data}
              rowKey={(l) => l.id}
              columns={[
                // With categories, levels repeat per category, so name it.
                { header: 'Level', cell: (l) => (l.category ? `${l.category.name} · ${l.number}` : l.number) },
                { header: 'Required score', cell: (l) => l.requiredScore },
                { header: 'Activities with repetitions complete', cell: (l) => l.requiredMastered },
                { header: '', cell: (l) => canEdit && <Button onClick={() => setLevel(l)}>Configure</Button> },
              ]}
            />
          </Panel>

          <QuestionModal
            open={question !== null}
            area={area}
            question={question === 'new' ? undefined : (question ?? undefined)}
            onClose={() => setQuestion(null)}
          />
          <LevelRequirementModal area={area} level={level} onClose={() => setLevel(null)} />
        </>
      )}
    </>
  );
}
