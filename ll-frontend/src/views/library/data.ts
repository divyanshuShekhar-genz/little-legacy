/**
 * Types and checks for Stories and Rhymes, as docs/API_REQUESTS.md #17 / #18 return them (Prisma
 * LibraryItem, kind STORY or RHYME, and LibraryCategory). The data comes from src/api/library.ts.
 */
import type { PlanTier } from '@/constants/plans';
import { emptyChapter, type LibraryChapter, type LibraryKind } from '@/components/library/types';

/** The ContentStatus values an item can have here (no delete / withdraw yet, OPEN_QUESTIONS Q29). */
export type LibraryStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'PUBLISHED';

/** What the editor changes. `categoryId` may be empty only in a draft. */
export interface LibraryContent {
  title: string;
  categoryId: string | null;
  coverUrl: string | null;
  description: string | null;
  minimumPlan: PlanTier;
  chapters: LibraryChapter[];
  /** Rhymes only: uploaded audio or video (OPEN_QUESTIONS Q15). Always null for stories. */
  mediaUrl: string | null;
  /** Rhymes only: the prototype's "Lyrics / text". Always null for stories. */
  lyrics: string | null;
}

/** GET /api/stories/:id (or rhymes). The kind comes from the route. */
export interface LibraryItem extends LibraryContent {
  /** A never-published item's id is its draft's id until the first publish. */
  id: string;
  status: LibraryStatus;
  /** The pending draft (for Draft approvals links), or null. */
  draftId: string | null;
  /**
   * An unpublished change to a published item. Parents keep seeing the live content until it
   * is approved (guide §1: saving a draft never changes what parents see).
   */
  pending: { status: 'DRAFT' | 'PENDING_APPROVAL'; content: LibraryContent } | null;
}

/** One row of the Stories or Rhymes table. */
export interface LibraryRow {
  id: string;
  title: string;
  categoryId: string | null;
  categoryName: string | null;
  chapterCount: number;
  status: LibraryStatus;
  pendingStatus: 'DRAFT' | 'PENDING_APPROVAL' | null;
  minimumPlan: PlanTier;
  updatedAt: string;
}

/** A new item's starting chapters: rhymes start with the prototype's "Chapter 1". */
export const newChapters = (kind: LibraryKind): LibraryChapter[] =>
  kind === 'RHYME' ? [{ ...emptyChapter(1), title: 'Chapter 1' }] : [emptyChapter(1)];

/**
 * Checks, in order (prototype workspace.js `storyEditor`). "Save in draft" needs only a title so
 * staff can keep unfinished work; Approve / Submit for approval needs the rest.
 * Our wording: "Choose a category." (the prototype always has one selected) and "Enter a rhyme
 * title." (the prototype says "Enter a story title." for rhymes too).
 */
export function itemError(kind: LibraryKind, content: LibraryContent, mode: 'publish' | 'draft'): string | null {
  if (!content.title.trim()) return kind === 'RHYME' ? 'Enter a rhyme title.' : 'Enter a story title.';
  if (mode === 'draft') return null;
  if (kind === 'RHYME' && content.chapters.length !== 1) return 'Each rhyme must have exactly one chapter.';
  if (!content.categoryId) return 'Choose a category.';
  if (content.chapters.length === 0 || content.chapters.some((c) => !c.title.trim() || c.pages.length === 0)) {
    return 'Every chapter needs a name and at least one page.';
  }
  return null;
}

/** Category names: trimmed, inner spaces collapsed, not empty or "All" (prototype). */
export const normaliseCategoryName = (name: string) => name.trim().replace(/\s+/g, ' ');
export const CATEGORY_NAME_ERROR = 'Enter a category name other than All.';
/** The prototype's rename dialog uses a shorter message than Add. */
export const RENAME_NAME_ERROR = 'Enter a category name.';
export const CATEGORY_EXISTS_ERROR = 'This category already exists.';
export const NO_REPLACEMENT_ERROR = 'Create a replacement category first.';
