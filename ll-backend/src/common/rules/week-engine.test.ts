import { describe, expect, it } from 'vitest';
import { baseFor, matchOverride, refreshDateFor, simulateWeek, type EngineGroup, type EngineSettings, type SampleChild } from './week-engine';

const settings: EngineSettings = {
  bases: [{ from: 0, start: 1 }, { from: 34, start: 2 }, { from: 67, start: 3 }],
  weekly: 20,
  maxVisible: null,
  pendingEnabled: true,
  pendingLimit: 10,
  pendingDays: 28,
  pendingCounts: false,
  recent: 5,
  continueCount: 4,
  reinforcement: 'same',
  resetDay: 'anniversary',
  overrides: [],
};
const child: SampleChild = { age: 4, plan: 'FREE', questionnaireDone: true, score: 50, level: 3, skills: {} };
const cycleStart = new Date('2026-10-01T00:00:00Z');

/** A group with difficulties 1..n (each mastered after `mastery` independent completions). */
const group = (id: string, over: Partial<EngineGroup> = {}, n = 4, mastery = 1): EngineGroup => ({
  id,
  name: id,
  areaId: 'cog',
  age: 4,
  skillId: null,
  skillName: null,
  benchmark: 50,
  mandatory: false,
  bases: [],
  difficulties: Array.from({ length: n }, (_, i) => ({
    activityId: `${id}-${i + 1}`,
    title: `${id} ${i + 1}`,
    difficulty: i + 1,
    masteryTarget: mastery,
    baseMarks: 16,
    areaLevel: 1,
    minimumPlan: 'FREE' as const,
    published: true,
    blockedInCountry: false,
  })),
  ...over,
});
const run = (groups: EngineGroup[], over: Partial<Parameters<typeof simulateWeek>[0]> = {}) =>
  simulateWeek({ settings, groups, child, week: 1, outcomes: [], cycleStart, ...over });

describe('Base and starting difficulty (Activity Flow §1, §10)', () => {
  it('Base from the assessment %; no questionnaire → Base 1', () => {
    expect(baseFor(50, true, settings.bases)).toBe(2);
    expect(baseFor(67, true, settings.bases)).toBe(3);
    expect(baseFor(90, false, settings.bases)).toBe(1);
  });
  it('a Base 2 child starts at difficulty 2', () => {
    expect(run([group('pattern')]).current[0]).toMatchObject({ activityId: 'pattern-2', difficulty: 2, id: '1:pattern-2' });
  });
  it('the most specific override wins', () => {
    const overrides = [
      { age: 'All', base: 'All', area: 'All', plan: 'All', limit: 10, start: 1 },
      { age: '4', base: 'Base 2', area: 'All', plan: 'All', limit: 8, start: 3 },
    ];
    expect(matchOverride(overrides, { age: 4, base: 2, areaId: 'cog', plan: 'FREE' }, false)?.start).toBe(3);
    expect(run([group('pattern')], { settings: { ...settings, overrides } }).current[0]!.difficulty).toBe(3);
  });
});

describe('weekly limit, area caps, gaps (§11, AF §3, Q1)', () => {
  const many = Array.from({ length: 6 }, (_, i) => group(`g${i}`));
  it('fills up to the weekly limit; the rest is a content gap', () => {
    const r = run(many, { settings: { ...settings, weekly: 4 } });
    expect(r.current).toHaveLength(4);
    expect(run(many.slice(0, 2), { settings: { ...settings, weekly: 4 } }).gap).toBe(2);
  });
  it('an area-specific override caps that area', () => {
    const overrides = [{ age: 'All', base: 'All', area: 'cog', plan: 'All', limit: 2, start: 1 }];
    expect(run(many, { settings: { ...settings, weekly: 5, overrides } }).current).toHaveLength(2);
  });
  it('with maxVisible: last week\'s completions + 5, capped (guide §11 example: 10 → 15, cap 12 → 12)', () => {
    const lots = Array.from({ length: 30 }, (_, i) => group(`g${String(i).padStart(2, '0')}`));
    const s = { ...settings, weekly: 20, maxVisible: 12 };
    const week1 = run(lots, { settings: s });
    expect(week1.current).toHaveLength(12);
    const outcomes = week1.current.slice(0, 10).map((c) => ({ assignmentId: c.id, outcome: 'WITH_HELP' as const }));
    const week2 = run(lots, { settings: s, week: 2, outcomes });
    expect(week2.limitRule).toBe("Last week's 10 completions + 5, capped at 12");
    expect(week2.current.length + week2.continue.length).toBe(12);
  });
});

describe('pending (AF §11–13, Q6)', () => {
  it('not done last week → pending this week, with its original week', () => {
    const r = run([group('a'), group('b')], { week: 2 });
    expect(r.pending.map((p) => p.activityId)).toEqual(['a-2', 'b-2']);
    expect(r.pending[0]).toMatchObject({ week: 1, id: '2:a-2' });
    expect(r.current).toEqual([]); // the same groups aren't offered twice
  });
  it('could not complete: hidden for the rest of the week, back as pending next week', () => {
    const week1 = run([group('a')], { outcomes: [{ assignmentId: '1:a-2', outcome: 'UNABLE' }] });
    expect(week1.current).toEqual([]);
    expect(week1.adminOutcomes).toEqual([{ name: 'a 2', outcome: 'UNABLE', points: 0 }]);
    const week2 = run([group('a')], { week: 2, outcomes: [{ assignmentId: '1:a-2', outcome: 'UNABLE' }] });
    expect(week2.pending[0]!.reason).toMatch(/^Could not complete in week 1/);
  });
  it('pending counts within the limit when that setting is on', () => {
    const groups = [group('a'), group('b'), group('c')];
    const r = run(groups, { week: 2, settings: { ...settings, weekly: 3, pendingCounts: true, pendingLimit: 1 } });
    expect(r.pending).toHaveLength(1);
    expect(r.current.length + r.continue.length).toBe(2);
  });
  it('expired pending items drop out', () => {
    expect(run([group('a')], { week: 3, settings: { ...settings, pendingDays: 7 } }).pending).toEqual([]);
  });
});

describe('progression of a group (AF §7–9, Q23)', () => {
  it('Strong: independent completions reaching mastery → next difficulty', () => {
    const r = run([group('a')], { week: 2, outcomes: [{ assignmentId: '1:a-2', outcome: 'INDEPENDENT' }] });
    expect(r.current.concat(r.continue)[0]!.difficulty).toBe(3);
  });
  it('Developing: with help → same difficulty', () => {
    const r = run([group('a')], { week: 2, outcomes: [{ assignmentId: '1:a-2', outcome: 'WITH_HELP' }] });
    expect(r.current.concat(r.continue)[0]!.difficulty).toBe(2);
  });
  it('Needs support with "easier": steps down to the nearest unmastered lower difficulty', () => {
    const s = { ...settings, reinforcement: 'easier' as const };
    const r = run([group('a')], { week: 2, settings: s, outcomes: [{ assignmentId: '1:a-2', outcome: 'UNABLE' }] });
    expect(r.pending[0]!.difficulty).toBe(1);
  });
  it('every difficulty mastered → the group drops out', () => {
    const r = run([group('a', {}, 2)], { week: 2, outcomes: [{ assignmentId: '1:a-2', outcome: 'INDEPENDENT' }] });
    expect(r.current.concat(r.continue)).toEqual([]);
  });
  it('points follow the scoring rules: 16 → help 4 → 4 (guide §12)', () => {
    const g = group('a', {}, 4, 3);
    const outcomes = [
      { assignmentId: '1:a-2', outcome: 'INDEPENDENT' as const },
      { assignmentId: '2:a-2', outcome: 'WITH_HELP' as const },
      { assignmentId: '3:a-2', outcome: 'INDEPENDENT' as const },
    ];
    expect(run([g], { week: 3, outcomes }).adminOutcomes.map((o) => o.points)).toEqual([16, 4, 4]);
  });
});

describe('the pool respects every gate (§9, §20)', () => {
  it('age, Base eligibility, plan, country and the area Level', () => {
    const groups = [
      group('wrongAge', { age: 5 }),
      group('wrongBase', { bases: [3] }),
      group('plus', { difficulties: group('x').difficulties.map((d) => ({ ...d, minimumPlan: 'PLUS' as const })) }),
      group('blocked', { difficulties: group('x').difficulties.map((d) => ({ ...d, blockedInCountry: true })) }),
      group('ok'),
    ];
    expect(run(groups).current.map((c) => c.activityId)).toEqual(['ok-2']);
  });
  it('after mastering, a locked next difficulty means the group waits — never back to an easier one', () => {
    const g = group('a', { difficulties: group('a').difficulties.map((d) => ({ ...d, areaLevel: d.difficulty <= 2 ? 1 : 2 })) });
    const outcomes = [{ assignmentId: '1:a-2', outcome: 'INDEPENDENT' as const }];
    const atLevel1 = run([g], { week: 2, child: { ...child, level: 1 }, outcomes });
    expect(atLevel1.current.concat(atLevel1.continue)).toEqual([]);
    const atLevel2 = run([g], { week: 2, child: { ...child, level: 2 }, outcomes });
    expect(atLevel2.current.concat(atLevel2.continue)[0]!.difficulty).toBe(3);
  });
  it('a difficulty on a locked area Level falls back to the nearest lower one that is open', () => {
    const g = group('a', { difficulties: group('a').difficulties.map((d) => ({ ...d, areaLevel: d.difficulty })) });
    expect(run([g], { child: { ...child, level: 1 } }).current[0]!.difficulty).toBe(1);
  });
});

describe('sort order and lists (prototype, AF §4, §14–15)', () => {
  it('mandatory first, then skills below benchmark, then name; mandatory clears once completed', () => {
    const groups = [group('a'), group('b', { skillId: 's', skillName: 'Shapes', benchmark: 60 }), group('c', { mandatory: true })];
    const r = run(groups, { child: { ...child, skills: { s: 40 } } });
    expect(r.current.map((c) => c.activityId)).toEqual(['c-2', 'b-2', 'a-2']);
    expect(r.current[1]!.reason).toBe('Shapes 40% is below the 60% benchmark · Difficulty 2');
    const done = run(groups, { week: 2, child: { ...child, skills: { s: 40 } }, outcomes: [{ assignmentId: '1:c-2', outcome: 'WITH_HELP' }, { assignmentId: '1:a-2', outcome: 'WITH_HELP' }, { assignmentId: '1:b-2', outcome: 'WITH_HELP' }] });
    expect(done.continue.concat(done.current).map((c) => c.activityId)).toContain('c-2');
    expect(done.continue.concat(done.current)[0]!.reason).not.toMatch(/Mandatory/);
  });
  it('Continue Learning holds groups attempted before; Recent holds the latest completions', () => {
    const r = run([group('a'), group('b')], { week: 2, outcomes: [{ assignmentId: '1:a-2', outcome: 'WITH_HELP' }] });
    expect(r.continue.map((c) => c.activityId)).toEqual(['a-2']);
    expect(r.recent).toEqual([{ name: 'a 2', level: 2, outcome: 'WITH_HELP' }]);
  });
  it('outcomes must belong to cards shown', () => {
    expect(() => run([group('a')], { outcomes: [{ assignmentId: '1:nope', outcome: 'INDEPENDENT' }] })).toThrow('Record outcomes only for activities shown in the preview.');
  });
});

describe('next refresh (guide §7: birthday 10 Oct → refresh 17 Oct)', () => {
  it('every 7 days from the cycle start', () => {
    expect(refreshDateFor(new Date('2026-10-10T00:00:00Z'), 1, 'anniversary')).toBe('2026-10-17');
  });
  it('or a weekday (0 = Sunday)', () => {
    expect(refreshDateFor(new Date('2026-10-10T00:00:00Z'), 1, '1')).toBe('2026-10-12'); // 10 Oct 2026 is a Saturday
  });
});
