import { uploadKindFromUrl } from '@/api/uploads';
import type { LibraryChapter } from './types';
import { LibraryImage } from './LibraryImage';
import { imageLabel } from './StackedImages';

/**
 * What a parent reads, in order: chapters → pages → stacked images, with each chapter's
 * background music (it plays across that chapter's pages). Rhymes also pass their media and lyrics.
 */
export function LibraryPreview({ title, chapters, mediaUrl, lyrics }: {
  title: string;
  chapters: LibraryChapter[];
  mediaUrl?: string | null;
  lyrics?: string | null;
}) {
  return (
    <div className="grid gap-[18px]">
      <h3 className="m-0">{title || 'Untitled'}</h3>
      {mediaUrl &&
        (uploadKindFromUrl(mediaUrl) === 'VIDEO' ? (
          <video src={mediaUrl} controls className="w-full max-w-[480px] rounded-card" aria-label="Rhyme video" />
        ) : (
          <audio src={mediaUrl} controls className="w-full max-w-sm" aria-label="Rhyme audio" />
        ))}
      {lyrics && <p className="whitespace-pre-line leading-[1.7] text-body">{lyrics}</p>}
      {chapters.length === 0 && <p className="text-muted">No chapters yet.</p>}
      {chapters.map((chapter, c) => (
        <section key={chapter.id} className="grid gap-[15px] rounded-md border border-line p-[15px]">
          <div className="grid gap-2">
            <strong>
              {/* A default name ("Chapter 1" in chapter 1, e.g. a rhyme's only chapter) isn't repeated. */}
              Chapter {c + 1}
              {chapter.title.trim() !== `Chapter ${c + 1}` && ` · ${chapter.title.trim() || 'Untitled chapter'}`}
            </strong>
            {chapter.musicUrl ? (
              <audio src={chapter.musicUrl} controls className="w-full max-w-sm" aria-label={`Background music for chapter ${c + 1}`} />
            ) : (
              <span className="text-[12px] text-muted">No background music</span>
            )}
          </div>
          {chapter.pages.length === 0 && <p className="text-muted">No pages yet.</p>}
          {chapter.pages.map((page, p) => (
            <article key={page.id} className="grid gap-2.5 rounded-md bg-canvas p-[15px]">
              <span className="eyebrow">Page {p + 1}</span>
              {page.images.length === 0 && <span className="text-[12px] text-muted">No images</span>}
              {page.images.map((image, i) => (
                <LibraryImage key={image.id} src={image.imageUrl} label={imageLabel(i)} className="h-[180px] w-full max-w-[360px]" />
              ))}
              {page.description && <p className="leading-[1.7] text-body">{page.description}</p>}
            </article>
          ))}
        </section>
      ))}
    </div>
  );
}
