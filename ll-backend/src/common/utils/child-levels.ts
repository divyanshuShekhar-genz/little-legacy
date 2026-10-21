import type { Prisma } from '@prisma/client';
import { areaLevel, earnedLevel, type LevelThreshold } from '../rules';
import { areaScoresSchema } from './assessment';

type Db = Prisma.TransactionClient;

/** Ladder key = the level's category id, or '' for the area's own levels (as in ChildAreaLevel). */
const ladderKey = (categoryId: string | null) => categoryId ?? '';

export interface ChildAreaLevels {
  score: number;
  mastered: number;
  /** Earned level per ladder, from the live thresholds (including the stored level for that ladder). */
  byLadder: Map<string, number>;
  /** Stored (frozen) level per ladder. */
  stored: Map<string, number>;
  /** The child's level in the area: highest of everything (areaLevel). */
  level: number;
}

/**
 * Works out children's levels in one area (guide §7, §9; prototype "Current level"):
 * score = current questionnaire area score + activity points in the area (withdrawn activities
 * included: earned scores remain); mastered = the area's activities with enough independent
 * completions. Levels of removed categories / areas still count — they are history.
 *
 * `childIds` omitted → every child in the area's region who has a record (a current questionnaire
 * or an attempt in the area). Children with no record at all have nothing to protect.
 */
export async function childAreaLevels(db: Db, areaId: string, childIds?: string[]): Promise<Map<string, ChildAreaLevels>> {
  let ids = childIds;
  if (!ids) {
    const area = await db.developmentArea.findUnique({ where: { id: areaId }, select: { regionId: true } });
    if (!area) return new Map();
    const children = await db.child.findMany({
      where: { regionId: area.regionId, OR: [{ questionnaires: { some: { isCurrent: true } } }, { attempts: { some: { activity: { areaId } } } }] },
      select: { id: true },
    });
    ids = children.map((c) => c.id);
  }
  if (!ids.length) return new Map();

  const [levels, submissions, attempts, storedRows] = await Promise.all([
    db.level.findMany({ where: { areaId }, select: { categoryId: true, number: true, requiredScore: true, requiredMastered: true } }),
    db.questionnaireSubmission.findMany({ where: { childId: { in: ids }, isCurrent: true }, orderBy: { submittedAt: 'desc' }, select: { childId: true, areaScores: true } }),
    db.activityAttempt.findMany({
      where: { childId: { in: ids }, activity: { areaId } },
      select: { childId: true, activityId: true, outcome: true, points: true, activity: { select: { masteryTarget: true } } },
    }),
    db.childAreaLevel.findMany({ where: { areaId, childId: { in: ids } } }),
  ]);

  const ladders = new Map<string, LevelThreshold[]>();
  for (const l of levels) {
    const key = ladderKey(l.categoryId);
    ladders.set(key, [...(ladders.get(key) ?? []), l]);
  }

  const result = new Map<string, ChildAreaLevels>();
  for (const childId of ids) {
    // Latest current submission only: a re-evaluation replaces the score, never adds to it.
    const submission = submissions.find((s) => s.childId === childId);
    const questionnaire = submission ? (areaScoresSchema.parse(submission.areaScores)[areaId] ?? 0) : 0;
    const own = attempts.filter((a) => a.childId === childId);
    const activity = own.reduce((s, a) => s + Number(a.points), 0);

    const independent = new Map<string, { count: number; target: number }>();
    for (const a of own.filter((a) => a.outcome === 'INDEPENDENT')) {
      const entry = independent.get(a.activityId) ?? { count: 0, target: a.activity.masteryTarget };
      entry.count++;
      independent.set(a.activityId, entry);
    }
    const mastered = [...independent.values()].filter((e) => e.count >= e.target).length;
    const score = questionnaire + activity;

    const stored = new Map(storedRows.filter((r) => r.childId === childId).map((r) => [r.categoryId, r.level]));
    const byLadder = new Map<string, number>();
    for (const [key, thresholds] of ladders) {
      byLadder.set(key, earnedLevel({ score, mastered, storedLevel: stored.get(key) ?? 0, levels: thresholds }));
    }
    result.set(childId, {
      score,
      mastered,
      byLadder,
      stored,
      level: areaLevel({ score, mastered, ladders: [...ladders.values()], stored: [...stored.values()] }),
    });
  }
  return result;
}

/**
 * Saves every affected child's current earned level per ladder (ChildAreaLevel, monotonic) BEFORE an
 * area's level thresholds change: editing or deleting a level, moving levels into a first category,
 * removing a category. Levels can then never go down (guide §7, §13). This locks in what children
 * earned; it never lowers or edits a score. Call it inside the same transaction as the change.
 */
export async function freezeEarnedLevels(tx: Db, areaId: string) {
  const levels = await childAreaLevels(tx, areaId);
  for (const [childId, l] of levels) {
    for (const [categoryId, level] of l.byLadder) {
      if (level <= (l.stored.get(categoryId) ?? 0)) continue;
      await tx.childAreaLevel.upsert({
        where: { childId_areaId_categoryId: { childId, areaId, categoryId } },
        update: { level },
        create: { childId, areaId, categoryId, level },
      });
    }
  }
}
