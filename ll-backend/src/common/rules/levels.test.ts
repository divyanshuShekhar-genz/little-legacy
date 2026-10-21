import { describe, expect, it } from 'vitest';
import { areaLevel, earnedLevel } from './levels';

// Seed thresholds from the client prototype: L1 0/0, L2 40/1, L3 100/3.
const levels = [
  { number: 1, requiredScore: 0, requiredMastered: 0 },
  { number: 2, requiredScore: 40, requiredMastered: 1 },
  { number: 3, requiredScore: 100, requiredMastered: 3 },
];

describe('earnedLevel (§7, §9)', () => {
  it('a new child with no marks is at Level 1', () => {
    expect(earnedLevel({ score: 0, mastered: 0, storedLevel: 0, levels })).toBe(1);
  });
  it('both requirements must be met: 40 marks without a mastered activity stays at Level 1', () => {
    expect(earnedLevel({ score: 40, mastered: 0, storedLevel: 0, levels })).toBe(1);
    expect(earnedLevel({ score: 40, mastered: 1, storedLevel: 0, levels })).toBe(2);
  });
  it('reassessment never demotes an earned level', () => {
    expect(earnedLevel({ score: 10, mastered: 0, storedLevel: 3, levels })).toBe(3);
  });
  it('an area with no levels configured is Level 0', () => {
    expect(earnedLevel({ score: 50, mastered: 2, storedLevel: 0, levels: [] })).toBe(0);
  });
});

describe('areaLevel — protecting earned levels (§7, §13)', () => {
  it('a ladder moved into a category gives the same level as before', () => {
    expect(areaLevel({ score: 50, mastered: 1, ladders: [levels], stored: [] })).toBe(2);
    expect(areaLevel({ score: 50, mastered: 1, ladders: [[], levels], stored: [] })).toBe(2);
  });
  it('takes the highest level across ladders', () => {
    const harder = levels.map((l) => ({ ...l, requiredScore: l.requiredScore * 3 }));
    expect(areaLevel({ score: 50, mastered: 1, ladders: [harder, levels], stored: [] })).toBe(2);
  });
  it('raising a threshold after freezing never demotes the child', () => {
    const raised = levels.map((l) => (l.number === 2 ? { ...l, requiredScore: 60 } : l));
    // Before the edit the child earned Level 2 (50 marks, 1 mastered) and it was stored.
    expect(areaLevel({ score: 50, mastered: 1, ladders: [raised], stored: [2] })).toBe(2);
    // Without the stored level, the raised threshold alone would give Level 1.
    expect(areaLevel({ score: 50, mastered: 1, ladders: [raised], stored: [] })).toBe(1);
  });
  it('deleting every level keeps the stored level', () => {
    expect(areaLevel({ score: 50, mastered: 1, ladders: [], stored: [2, 1] })).toBe(2);
  });
});
