import { describe, expect, it } from 'vitest';
import { toParentQuestion } from './questions';

describe('questions shown to parents (§6)', () => {
  // The guide's example: "Can your little one match two similar shapes?" — Medium, with marks.
  const adminQuestion = {
    id: 'q1',
    areaId: 'cognitive',
    text: 'Can your little one match two similar shapes?',
    difficulty: 'MEDIUM',
    age: 4,
    skillId: 'shapes',
    options: [
      { id: 'o1', label: 'New to this', marks: 0, position: 0, skillStage: 'STARTING' },
      { id: 'o2', label: 'With help', marks: 10, position: 1, skillStage: 'PRACTISING' },
      { id: 'o3', label: 'Independently', marks: 20, position: 2, skillStage: 'CONFIDENT' },
    ],
  };

  it('keeps the question and its answer choices', () => {
    expect(toParentQuestion(adminQuestion)).toEqual({
      id: 'q1',
      text: 'Can your little one match two similar shapes?',
      options: [
        { id: 'o1', label: 'New to this' },
        { id: 'o2', label: 'With help' },
        { id: 'o3', label: 'Independently' },
      ],
    });
  });

  it('never exposes difficulty, marks or skill links', () => {
    const json = JSON.stringify(toParentQuestion(adminQuestion));
    for (const hidden of ['difficulty', 'MEDIUM', 'marks', 'skill', 'STARTING', 'areaId', 'position']) {
      expect(json).not.toContain(hidden);
    }
  });
});
