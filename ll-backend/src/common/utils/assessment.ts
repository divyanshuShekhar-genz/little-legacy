import { z } from 'zod';

/**
 * Shapes of the JSON columns behind assessments. `AssessmentConfig.rules` is an immutable
 * snapshot per revision (guide §13): children keep the revision they started with.
 */

export const assessmentRulesSchema = z.object({
  areas: z.array(
    z.object({
      areaId: z.string(),
      /** Name at snapshot time, so a later rename doesn't rewrite history. */
      name: z.string(),
      formula: z.string(),
      weight: z.number().min(0),
      questionWeights: z.object({ EASY: z.number().min(0), MEDIUM: z.number().min(0), HARD: z.number().min(0) }),
    }),
  ),
  /** { [age]: { [areaId]: activityId[] } } */
  mandatory: z.record(z.record(z.array(z.string()))),
  /** { [age]: { [areaId]: requiredCompletedCount } } */
  requiredCounts: z.record(z.record(z.number().int().min(0))),
});
export type AssessmentRules = z.infer<typeof assessmentRulesSchema>;

/** One answer as submitted, copied at submission time (question text and marks included). */
export const questionnaireAnswersSchema = z.array(
  z.object({
    questionId: z.string(),
    question: z.string(),
    areaId: z.string(),
    area: z.string(),
    answer: z.string(),
    marks: z.number(),
  }),
);
export type QuestionnaireAnswer = z.infer<typeof questionnaireAnswersSchema>[number];

/** { [areaId]: questionnaire score after difficulty weights } */
export const areaScoresSchema = z.record(z.number());

/** Default rules for a region's first revision: formula `questionnaire + activity`, all weights 1. */
export function defaultRules(areas: { id: string; name: string }[]): AssessmentRules {
  return {
    areas: areas.map((a) => ({
      areaId: a.id,
      name: a.name,
      formula: 'questionnaire + activity',
      weight: 1,
      questionWeights: { EASY: 1, MEDIUM: 1, HARD: 1 },
    })),
    mandatory: {},
    requiredCounts: {},
  };
}
