import { describe, expect, it } from 'vitest';
import {
  ineligibleReason,
  selectSuggestions,
  skillPercent,
  stageFromAnswers,
  stageFromOutcome,
  weakestFirst,
  type CandidateActivity,
  type SkillEvidence,
} from './skills';

describe('skill stage (§10, prototype)', () => {
  it('lowest known stage across mapped answers; unknown answers are ignored', () => {
    expect(stageFromAnswers(['CONFIDENT', 'PRACTISING', null])).toBe('PRACTISING');
    expect(stageFromAnswers([null, null])).toBeNull();
  });
  it('latest activity evidence: independent +1, could not complete −1, with help unchanged', () => {
    expect(stageFromOutcome('STARTING', 'INDEPENDENT')).toBe('PRACTISING');
    expect(stageFromOutcome('PRACTISING', 'NOT_COMPLETED')).toBe('STARTING');
    expect(stageFromOutcome('PRACTISING', 'WITH_HELP')).toBe('PRACTISING');
    expect(stageFromOutcome('CONFIDENT', 'INDEPENDENT')).toBe('CONFIDENT');
    expect(stageFromOutcome('STARTING', 'NOT_COMPLETED')).toBe('STARTING');
  });
  it('skill % = marks earned ÷ maximum possible', () => {
    expect(skillPercent([{ marks: 10, maxMarks: 20 }, { marks: 20, maxMarks: 20 }])).toBe(75);
    expect(skillPercent([])).toBeNull();
  });
});

// The guide's example: Aria needs colour matching, is stronger at remembering sequences.
const colours: SkillEvidence = { skillId: 'colours', skill: 'Colour matching', stage: 'STARTING', percent: 25, expected: 60 };
const memory: SkillEvidence = { skillId: 'memory', skill: 'Remembering sequences', stage: 'CONFIDENT', percent: 90, expected: 60 };
const child = { areaId: 'cog', age: 4, plan: 'FREE' as const, level: 1 };
const act = (over: Partial<CandidateActivity>): CandidateActivity => ({
  id: 'a',
  title: 'A',
  areaId: 'cog',
  age: 4,
  skillId: 'colours',
  difficulty: 'STARTING',
  baseMarks: 10,
  minimumPlan: 'FREE',
  published: true,
  withdrawn: false,
  levelNumber: 1,
  blockedInCountry: false,
  mastered: false,
  attemptedThisWeek: false,
  ...over,
});

describe('weakest skills first (§10)', () => {
  it('a skill below its expected score comes first', () => {
    expect(weakestFirst([memory, colours]).map((e) => e.skillId)).toEqual(['colours', 'memory']);
  });
});

describe('eligibility — every gate (§9, §20)', () => {
  it('eligible when everything passes', () => {
    expect(ineligibleReason(act({}), child)).toBeNull();
  });
  it('each gate has its own reason', () => {
    expect(ineligibleReason(act({ age: 5 }), child)).toBe('For age 5');
    expect(ineligibleReason(act({ published: false }), child)).toBe('Not published');
    expect(ineligibleReason(act({ minimumPlan: 'PLUS' }), child)).toBe('Needs the Plus plan');
    expect(ineligibleReason(act({ blockedInCountry: true }), child)).toBe("Not available in the child's country");
    expect(ineligibleReason(act({ levelNumber: 2 }), child)).toBe('Level 2 not unlocked yet');
    expect(ineligibleReason(act({ mastered: true }), child)).toBe('Already mastered');
    expect(ineligibleReason(act({ attemptedThisWeek: true }), child)).toBe('Already attempted this week');
  });
  it('a higher plan never bypasses the level gate, and a level never bypasses the plan gate', () => {
    expect(ineligibleReason(act({ minimumPlan: 'PLUS', levelNumber: 2 }), { ...child, plan: 'PLUS' })).toBe('Level 2 not unlocked yet');
    expect(ineligibleReason(act({ minimumPlan: 'PLUS', levelNumber: 2 }), { ...child, level: 2 })).toBe('Needs the Plus plan');
  });
});

describe('suggestions (§10, prototype)', () => {
  const eligible = [
    act({ id: 'c1', title: 'Colour hunt', difficulty: 'STARTING', baseMarks: 16 }),
    act({ id: 'c2', title: 'Colour sort', difficulty: 'PRACTISING' }),
    act({ id: 'm1', title: 'Memory train', skillId: 'memory', difficulty: 'PRACTISING', baseMarks: 12 }),
    act({ id: 'm2', title: 'Memory cards', skillId: 'memory', difficulty: 'PRACTISING', baseMarks: 8 }),
  ];
  it('one per skill: the hardest at or below the stage, weakest skill first', () => {
    const r = selectSuggestions([memory, colours], eligible, new Set(), 4);
    expect(r.suggestions.map((s) => s.activityId)).toEqual(['c1', 'm2']); // ties → lower marks
    expect(r.suggestions[0]!.reason).toContain('below the expected 60% for age 4 (25%)');
  });
  it('mandatory activities are not offered again as suggestions', () => {
    const r = selectSuggestions([colours], eligible, new Set(['c1']), 4);
    expect(r.suggestions).toEqual([]);
    expect(r.gaps[0]!.reason).toBe('No eligible Starting-or-easier activity for age 4');
  });
  it('skills with an unknown stage get no suggestion', () => {
    expect(selectSuggestions([{ ...colours, stage: null }], eligible, new Set(), 4)).toEqual({ suggestions: [], gaps: [] });
  });
});
