/**
 * Parent Checklist (guide §22, PRODUCT_SPEC §21), on the API (docs/API_REQUESTS.md #25,
 * src/api/checklist.ts). Types follow #25's responses and the Prisma `ChecklistItem`. **Each
 * regional category has its own checklist and visible limit** (Q27, client answer 15 Oct), with
 * separate Week 1, Week 2 and Later-weeks lists (Q7: `week` 1, 2 or 3). A new category starts with
 * an empty checklist. Ticks are stored per child and never award learning points. The visible
 * limit is the Setting `checklist.visibleLimit:{regionId}`.
 */
export type ChecklistWeek = 1 | 2 | 3;
export const WEEKS: ChecklistWeek[] = [1, 2, 3];
export const WEEK_LABELS: Record<ChecklistWeek, string> = { 1: 'Week 1', 2: 'Week 2', 3: 'Later weeks' };

/** ContentStatus values an item has here ("Status: Draft / Published" in the prototype). */
export type ChecklistStatus = 'DRAFT' | 'PUBLISHED';

export interface ChecklistContent {
  /** The regional category whose checklist this is. An item stays in its category. */
  regionId: string;
  week: ChecklistWeek;
  title: string;
  description: string;
  /** "Display order" within its week. */
  position: number;
  status: ChecklistStatus;
}

/** A change waiting for Super Admin: new content, or a removal (`content: null`). */
export interface PendingChange {
  status: 'DRAFT' | 'PENDING_APPROVAL';
  content: ChecklistContent | null;
  authorName: string;
  /** Its row in Draft approvals (approve / reject there or from the editor). */
  draftId: string;
}

export interface ChecklistItem extends ChecklistContent {
  id: string;
  /** Never published: the item exists only as a pending addition, and its `id` is the draft's id. */
  isNew: boolean;
  pending: PendingChange | null;
}

export interface VisibleLimit {
  regionId: string;
  value: number;
  pending: { status: 'DRAFT' | 'PENDING_APPROVAL'; value: number; authorName: string; draftId: string } | null;
}

/** Prototype message (checklist.js `checklistEditor()`). */
export const ITEM_ERROR = 'Enter a title, instructions and a whole-number order of at least 1.';
/** Our wording. */
export const LIMIT_ERROR = 'Enter a whole number of at least 1.';
/** Our wording (#25). */
export const REGION_ERROR = 'Choose a regional learning category.';

export function itemError(c: ChecklistContent): string | null {
  return !c.title.trim() || !c.description.trim() || !Number.isSafeInteger(c.position) || c.position < 1 ? ITEM_ERROR : null;
}

/** Guide §22's example uses a limit of 5; a category without its own setting uses it (shown while loading). */
export const DEFAULT_VISIBLE_LIMIT = 5;
