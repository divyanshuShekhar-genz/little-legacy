"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.childAreaLevels = childAreaLevels;
exports.freezeEarnedLevels = freezeEarnedLevels;
const rules_1 = require("../rules");
const assessment_1 = require("./assessment");
const ladderKey = (categoryId) => categoryId ?? '';
async function childAreaLevels(db, areaId, childIds) {
    let ids = childIds;
    if (!ids) {
        const area = await db.developmentArea.findUnique({ where: { id: areaId }, select: { regionId: true } });
        if (!area)
            return new Map();
        const children = await db.child.findMany({
            where: { regionId: area.regionId, OR: [{ questionnaires: { some: { isCurrent: true } } }, { attempts: { some: { activity: { areaId } } } }] },
            select: { id: true },
        });
        ids = children.map((c) => c.id);
    }
    if (!ids.length)
        return new Map();
    const [levels, submissions, attempts, storedRows] = await Promise.all([
        db.level.findMany({ where: { areaId }, select: { categoryId: true, number: true, requiredScore: true, requiredMastered: true } }),
        db.questionnaireSubmission.findMany({ where: { childId: { in: ids }, isCurrent: true }, orderBy: { submittedAt: 'desc' }, select: { childId: true, areaScores: true } }),
        db.activityAttempt.findMany({
            where: { childId: { in: ids }, activity: { areaId } },
            select: { childId: true, activityId: true, outcome: true, points: true, activity: { select: { masteryTarget: true } } },
        }),
        db.childAreaLevel.findMany({ where: { areaId, childId: { in: ids } } }),
    ]);
    const ladders = new Map();
    for (const l of levels) {
        const key = ladderKey(l.categoryId);
        ladders.set(key, [...(ladders.get(key) ?? []), l]);
    }
    const result = new Map();
    for (const childId of ids) {
        const submission = submissions.find((s) => s.childId === childId);
        const questionnaire = submission ? (assessment_1.areaScoresSchema.parse(submission.areaScores)[areaId] ?? 0) : 0;
        const own = attempts.filter((a) => a.childId === childId);
        const activity = own.reduce((s, a) => s + Number(a.points), 0);
        const independent = new Map();
        for (const a of own.filter((a) => a.outcome === 'INDEPENDENT')) {
            const entry = independent.get(a.activityId) ?? { count: 0, target: a.activity.masteryTarget };
            entry.count++;
            independent.set(a.activityId, entry);
        }
        const mastered = [...independent.values()].filter((e) => e.count >= e.target).length;
        const score = questionnaire + activity;
        const stored = new Map(storedRows.filter((r) => r.childId === childId).map((r) => [r.categoryId, r.level]));
        const byLadder = new Map();
        for (const [key, thresholds] of ladders) {
            byLadder.set(key, (0, rules_1.earnedLevel)({ score, mastered, storedLevel: stored.get(key) ?? 0, levels: thresholds }));
        }
        result.set(childId, {
            score,
            mastered,
            byLadder,
            stored,
            level: (0, rules_1.areaLevel)({ score, mastered, ladders: [...ladders.values()], stored: [...stored.values()] }),
        });
    }
    return result;
}
async function freezeEarnedLevels(tx, areaId) {
    const levels = await childAreaLevels(tx, areaId);
    for (const [childId, l] of levels) {
        for (const [categoryId, level] of l.byLadder) {
            if (level <= (l.stored.get(categoryId) ?? 0))
                continue;
            await tx.childAreaLevel.upsert({
                where: { childId_areaId_categoryId: { childId, areaId, categoryId } },
                update: { level },
                create: { childId, areaId, categoryId, level },
            });
        }
    }
}
//# sourceMappingURL=child-levels.js.map