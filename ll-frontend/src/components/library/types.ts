/**
 * Story and rhyme content, shaped like the Prisma models LibraryChapter, LibraryPage and
 * LibraryPageImage (ll-backend/prisma/schema.prisma). Positions start at 1, in reading order.
 * A page has one description; its stacked images have none (guide §14, OPEN_QUESTIONS Q4).
 */
export type LibraryKind = 'STORY' | 'RHYME';

export interface LibraryCategory {
  id: string;
  kind: LibraryKind;
  name: string;
}

export interface LibraryPageImage {
  id: string;
  position: number;
  imageUrl: string;
}

export interface LibraryPage {
  id: string;
  position: number;
  description: string | null;
  images: LibraryPageImage[];
}

export interface LibraryChapter {
  id: string;
  position: number;
  title: string;
  /** Uploaded audio (OPEN_QUESTIONS Q5); plays across the chapter's pages. */
  musicUrl: string | null;
  pages: LibraryPage[];
}

/** A category with how many items use it (Manage categories → Items). */
export interface LibraryCategoryRow extends LibraryCategory {
  itemCount: number;
}

/** Same as the API's draft-workflow result: live now, or stored as a draft for approval. */
export type SaveResult = { status: 'published'; id: string } | { status: 'draft'; draftId: string };

/** Rows added in the editor get a `new-` id until the server assigns a real one. */
export const newLibraryId = (prefix: string) => `new-${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export const emptyPage = (position: number): LibraryPage => ({ id: newLibraryId('page'), position, description: null, images: [] });

export const emptyChapter = (position: number): LibraryChapter => ({
  id: newLibraryId('chapter'),
  position,
  title: '',
  musicUrl: null,
  pages: [emptyPage(1)],
});
