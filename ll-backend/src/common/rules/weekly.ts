/** Weekly refresh and mandatory-activity rules (guide §11). */

/** Score target = one full base award from each selected mandatory activity. */
export function mandatoryScoreTarget(mandatoryBaseMarks: number[]): number {
  return mandatoryBaseMarks.reduce((s, m) => s + m, 0);
}

export interface MandatoryCheck {
  /** Activity marks earned in the area (mandatory + regular; questionnaire marks excluded). */
  areaScore: number;
  /** Distinct activities completed independently or with help this week. */
  completedCount: number;
  scoreTarget: number;
  requiredCount: number;
  /** Every activity in the mandatory set completed (independently or with help). */
  wholeSetCompleted?: boolean;
}

/** At refresh the mandatory label stays only when BOTH score and count are below requirement. */
export function mandatoryRemains(c: MandatoryCheck): boolean {
  if (c.wholeSetCompleted) return false;
  return c.areaScore < c.scoreTarget && c.completedCount < c.requiredCount;
}

/** Activities shown next week: last week's completions + 5, capped by the admin maximum. */
export function nextWeekVisibleCount(completedLastWeek: number, adminCap: number): number {
  return Math.min(completedLastWeek + 5, adminCap);
}

/** Next weekly refresh is 7 days after the cycle start (a birthday restarts the cycle that day). */
export function nextRefreshDate(cycleStart: Date): Date {
  const d = new Date(cycleStart);
  d.setDate(d.getDate() + 7);
  return d;
}
