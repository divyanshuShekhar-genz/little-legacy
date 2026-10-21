import { describe, expect, it } from 'vitest';
import { sameSnapshot } from './snapshot';

describe('sameSnapshot (draft conflict check)', () => {
  it('treats key order as irrelevant — jsonb re-orders keys on save', () => {
    const live = { id: 'p1', status: 'AWAITING_MODERATION', message: 'Hi', pinned: false };
    const storedByJsonb = { id: 'p1', pinned: false, status: 'AWAITING_MODERATION', message: 'Hi' };
    expect(sameSnapshot(live, storedByJsonb)).toBe(true);
  });
  it('matches a Date against its stored ISO string', () => {
    const at = new Date('2026-09-14T10:00:00Z');
    expect(sameSnapshot({ approvedAt: at, nested: { at } }, { nested: { at: at.toISOString() }, approvedAt: at.toISOString() })).toBe(true);
  });
  it('detects a real change', () => {
    expect(sameSnapshot({ message: 'Hi' }, { message: 'Hello' })).toBe(false);
  });
  it('null and missing snapshots are equal only to each other', () => {
    expect(sameSnapshot(null, undefined)).toBe(true);
    expect(sameSnapshot(null, {})).toBe(false);
  });
});
