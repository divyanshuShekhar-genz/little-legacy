import type { CompletionOutcome } from './domain';

/** Activity scoring (guide §12). */

/**
 * Award available for the next scored attempt: each prior *scored* completion (independent or
 * with help) halves it. Base 16 → 16, 8, 4, 2...
 */
export function availableAward(baseMarks: number, priorScoredCompletions: number): number {
  return baseMarks / 2 ** priorScoredCompletions;
}

export interface CompletionResult {
  points: number;
  /** Consumes a scored completion (affects future halving). */
  scored: boolean;
  /** Counts towards mastery — independent only. */
  countsTowardMastery: boolean;
  /** Counts towards the weekly completed-activity count used by mandatory rules. */
  countsTowardWeekly: boolean;
}

/**
 * Independent: full available marks + one mastery completion.
 * With help: half the available marks, no mastery completion.
 * Could not complete: nothing; recorded for admin only, hidden for the rest of the week.
 * A discarded attempt never reaches this function — it records nothing.
 */
export function scoreCompletion(
  baseMarks: number,
  priorScoredCompletions: number,
  outcome: CompletionOutcome,
): CompletionResult {
  const available = availableAward(baseMarks, priorScoredCompletions);
  switch (outcome) {
    case 'INDEPENDENT':
      return { points: available, scored: true, countsTowardMastery: true, countsTowardWeekly: true };
    case 'WITH_HELP':
      return { points: available / 2, scored: true, countsTowardMastery: false, countsTowardWeekly: true };
    case 'NOT_COMPLETED':
      return { points: 0, scored: false, countsTowardMastery: false, countsTowardWeekly: false };
  }
}

export function isMastered(independentCompletions: number, masteryTarget: number): boolean {
  return independentCompletions >= masteryTarget;
}
