/**
 * Demo learning data (development only) — the client prototype's sample content:
 * its three seed activities, one questionnaire question per area, and assessment records for
 * the demo children so Children & Learning has something to show:
 *   Aria (4)  questionnaire + Colour hunt: independent, with help, could not complete
 *   Maya (5)  questionnaire + Little feelings: independent
 *   Rishi (3) nothing yet ("Questionnaire not recorded")
 * Points come from the real scoring rule (scoreCompletion), never typed by hand.
 */
import type { CompletionOutcome, PrismaClient } from '@prisma/client';
import { scoreCompletion } from '../../src/common/rules';
import { questionnaireAnswersSchema, type QuestionnaireAnswer } from '../../src/common/utils/assessment';
import { REGION_NAMES } from './base';

const OPTIONS = [
  { label: 'New to this', marks: 0 },
  { label: 'With help', marks: 10 },
  { label: 'Independently', marks: 20 },
];

const QUESTIONS: Record<string, string> = {
  Cognitive: 'How comfortable is your child with matching colours?',
  Physical: 'How comfortable is your child with balancing?',
  Emotional: 'How comfortable is your child with naming feelings?',
  Social: 'How comfortable is your child with taking turns?',
  Creative: 'How comfortable is your child with drawing shapes?',
};

const ACTIVITIES = [
  { title: 'Colour hunt', area: 'Cognitive', age: 4, baseMarks: 16, masteryTarget: 4, durationMinutes: 5, description: 'Find an object in a colour you choose. Compare and sort your finds.' },
  { title: 'Balance trail', area: 'Physical', age: 3, baseMarks: 12, masteryTarget: 3, durationMinutes: 8, description: 'Follow a safe path together.' },
  { title: 'Little feelings', area: 'Emotional', age: 5, baseMarks: 16, masteryTarget: 4, durationMinutes: 5, description: 'Explore and name familiar feelings.' },
];

const STEPS = (desc: string) => [
  { title: 'Get Ready', description: 'Gather your materials and find a comfortable space.' },
  { title: 'Dive In', description: desc },
  { title: 'Wrap Up & Reflect', description: 'Talk about what you discovered together.' },
];

/** Answer index (0–2) per area, per child. */
const ANSWERS: Record<string, Record<string, number>> = {
  Aria: { Cognitive: 1, Physical: 2, Emotional: 1, Social: 0, Creative: 2 },
  Maya: { Cognitive: 2, Physical: 1, Emotional: 2, Social: 1, Creative: 2 },
};

const ATTEMPTS: { child: string; activity: string; outcome: CompletionOutcome; at: string; week: number; elapsed?: number; feedback?: { difficulty: string; enjoyment: string; note: string } }[] = [
  { child: 'Aria', activity: 'Colour hunt', outcome: 'INDEPENDENT', at: '2026-09-14T10:30:00Z', week: 0, elapsed: 290, feedback: { difficulty: 'Just right', enjoyment: 'Enjoyed it', note: 'Loved finding the yellow objects.' } },
  { child: 'Aria', activity: 'Colour hunt', outcome: 'WITH_HELP', at: '2026-09-21T09:15:00Z', week: 1, elapsed: 410 },
  { child: 'Aria', activity: 'Colour hunt', outcome: 'NOT_COMPLETED', at: '2026-09-28T16:40:00Z', week: 2 },
  { child: 'Maya', activity: 'Little feelings', outcome: 'INDEPENDENT', at: '2026-09-16T11:00:00Z', week: 0, elapsed: 330 },
];

export async function seedDemoLearning(prisma: PrismaClient) {
  const region = await prisma.learningRegion.findUniqueOrThrow({ where: { name: REGION_NAMES.indiaSriLanka } });
  const areas = await prisma.developmentArea.findMany({ where: { regionId: region.id, removedAt: null }, include: { levels: true } });
  const areaByName = new Map(areas.map((a) => [a.name, a]));

  // Questions (one per area) — skip if the area already has any.
  const questionByArea = new Map<string, { id: string; text: string }>();
  for (const area of areas) {
    const text = QUESTIONS[area.name];
    if (!text) continue;
    const existing = await prisma.question.findFirst({ where: { areaId: area.id } });
    const q =
      existing ??
      (await prisma.question.create({
        data: { areaId: area.id, text, options: { create: OPTIONS.map((o, i) => ({ label: o.label, marks: o.marks, position: i })) } },
      }));
    questionByArea.set(area.name, { id: q.id, text: q.text });
  }

  // Activities
  const activityByTitle = new Map<string, { id: string; baseMarks: number }>();
  for (const a of ACTIVITIES) {
    const area = areaByName.get(a.area);
    if (!area) continue;
    const existing = await prisma.activity.findFirst({ where: { regionId: region.id, title: a.title } });
    const activity =
      existing ??
      (await prisma.activity.create({
        data: {
          regionId: region.id,
          areaId: area.id,
          levelId: area.levels.find((l) => l.number === 1 && l.categoryId === null)?.id,
          age: a.age,
          title: a.title,
          description: a.description,
          materials: 'Everyday objects, a clear space',
          durationMinutes: a.durationMinutes,
          baseMarks: a.baseMarks,
          masteryTarget: a.masteryTarget,
          status: 'PUBLISHED',
          steps: { create: STEPS(a.description).map((s, i) => ({ ...s, position: i })) },
          previews: { create: ['Get ready', 'Do the activity', 'Talk about it'].map((caption, i) => ({ caption, position: i })) },
        },
      }));
    activityByTitle.set(a.title, { id: activity.id, baseMarks: activity.baseMarks });
  }

  // Questionnaire submissions + attempts, only for children with no learning records yet.
  const config = await prisma.assessmentConfig.findFirstOrThrow({ where: { regionId: region.id }, orderBy: { revision: 'desc' } });
  const children = await prisma.child.findMany({ where: { regionId: region.id }, include: { questionnaires: true, attempts: true } });

  for (const child of children) {
    if (child.questionnaires.length || child.attempts.length) continue;

    const picks = ANSWERS[child.name];
    if (picks) {
      const answers: QuestionnaireAnswer[] = Object.entries(picks).flatMap(([areaName, index]) => {
        const area = areaByName.get(areaName);
        const question = questionByArea.get(areaName);
        const option = OPTIONS[index];
        return area && question && option
          ? [{ questionId: question.id, question: question.text, areaId: area.id, area: areaName, answer: option.label, marks: option.marks }]
          : [];
      });
      // All question weights are 1 in the first revision, so the weighted area score = the raw marks.
      const areaScores = Object.fromEntries(answers.map((a) => [a.areaId, a.marks]));
      const submittedAt = new Date(child.name === 'Aria' ? '2026-09-14T09:00:00Z' : '2026-09-15T09:00:00Z');
      await prisma.questionnaireSubmission.create({
        data: { childId: child.id, configId: config.id, age: child.name === 'Aria' ? 4 : 5, answers: questionnaireAnswersSchema.parse(answers), areaScores, submittedAt },
      });
      await prisma.child.update({ where: { id: child.id }, data: { cycleStartedAt: submittedAt } });
    }

    let priorScored = 0;
    let repeat = 0;
    for (const a of ATTEMPTS.filter((x) => x.child === child.name)) {
      const activity = activityByTitle.get(a.activity);
      if (!activity) continue;
      const result = scoreCompletion(activity.baseMarks, priorScored, a.outcome);
      if (result.scored) priorScored++;
      repeat++;
      await prisma.activityAttempt.create({
        data: {
          childId: child.id,
          activityId: activity.id,
          outcome: a.outcome,
          points: result.points,
          baseMarks: activity.baseMarks,
          repeat,
          elapsedSeconds: a.elapsed,
          cycleWeek: a.week,
          createdAt: new Date(a.at),
          ...(a.feedback ? { feedback: { create: a.feedback } } : {}),
        },
      });
    }
  }

  console.log('✔ Demo learning data: 5 questions, 3 activities, assessments for Aria and Maya');
}
