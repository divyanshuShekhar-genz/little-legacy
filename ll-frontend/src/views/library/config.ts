import type { RestrictionType } from '@/api/countryAccess';
import type { LibraryKind } from '@/components/library/types';

/**
 * Everything that differs between the Stories and Rhymes screens: wording (prototype app.js /
 * parent-content.js / workspace.js `storyEditor`), country-access type and editor shape.
 */
export interface LibraryConfig {
  /** "story" / "rhyme": used in toasts and notes. */
  noun: string;
  /** "Story" / "Rhyme": table column, editor title and field labels. */
  Noun: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  restriction: RestrictionType;
  addCategoryTitle: string;
  /** Rhymes have exactly one chapter (guide §15): no Add, Delete or reorder of chapters. */
  singleChapter: boolean;
  /** Stories list a Chapters column; rhymes don't (always one). */
  chaptersColumn: boolean;
  /** Rhymes also have "Lyrics / text" and their own audio or video (OPEN_QUESTIONS Q15). */
  media: boolean;
}

export const LIBRARY_CONFIG: Record<LibraryKind, LibraryConfig> = {
  STORY: {
    noun: 'story',
    Noun: 'Story',
    eyebrow: 'Stories',
    title: 'A whole little world, in pages.',
    subtitle: 'Prepare stories for the library.',
    restriction: 'STORIES',
    addCategoryTitle: 'Add story category',
    singleChapter: false,
    chaptersColumn: true,
    media: false,
  },
  RHYME: {
    noun: 'rhyme',
    Noun: 'Rhyme',
    eyebrow: 'Rhymes',
    title: 'A whole little world, in rhymes.',
    subtitle: 'Prepare rhymes for the library.',
    restriction: 'RHYMES',
    addCategoryTitle: 'Add rhyme category',
    singleChapter: true,
    chaptersColumn: false,
    media: true,
  },
};
