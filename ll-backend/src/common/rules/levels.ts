/** Area levels (guide §7, §9). */

export interface LevelThreshold {
  number: number;
  requiredScore: number;
  requiredMastered: number;
}

export interface EarnedLevelInput {
  /** Questionnaire + activity marks in the area. */
  score: number;
  /** Activities in the area with independent completions ≥ their mastery target. */
  mastered: number;
  /** Highest level already earned and stored — reassessment must never demote it. */
  storedLevel: number;
  levels: LevelThreshold[];
}

/**
 * Current level = the highest of the stored level and every level whose score AND
 * mastered-activity requirements are both met. Never lower than the stored level.
 */
export function earnedLevel({ score, mastered, storedLevel, levels }: EarnedLevelInput): number {
  const reached = levels
    .filter((l) => score >= l.requiredScore && mastered >= l.requiredMastered)
    .map((l) => l.number);
  return Math.max(storedLevel, 0, ...reached);
}

export interface AreaLevelInput {
  /** Questionnaire + activity marks in the area (the prototype's formula is per area). */
  score: number;
  /** Activities in the area with independent completions ≥ their mastery target. */
  mastered: number;
  /**
   * One threshold list per ladder: the area's own levels, and each category's levels (OPEN_QUESTIONS
   * Q20 interim). Levels of removed categories / areas are included — they still count for history.
   */
  ladders: LevelThreshold[][];
  /** Every stored (frozen) level for this child in this area, any category. */
  stored: number[];
}

/**
 * A child's level in an area = the highest of every stored level and every ladder's earned level.
 * Never lower than anything stored, so editing or removing thresholds can't demote a child once
 * their levels have been frozen first (freezeEarnedLevels).
 */
export function areaLevel({ score, mastered, ladders, stored }: AreaLevelInput): number {
  const storedMax = Math.max(0, ...stored);
  return Math.max(storedMax, ...ladders.map((levels) => earnedLevel({ score, mastered, storedLevel: 0, levels })));
}
