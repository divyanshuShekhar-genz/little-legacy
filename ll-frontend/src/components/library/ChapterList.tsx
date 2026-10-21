import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { FileUpload } from '@/components/ui/FileUpload';
import { moveItem, withPositions } from '@/utils/reorder';
import { emptyChapter, type LibraryChapter } from './types';
import { PageList } from './PageList';
import { ReorderControls } from './ReorderControls';

/** The prototype's `p.note`. */
function EditorNote({ children }: { children: string }) {
  return <p className="mb-6 mt-2 rounded-[10px] bg-note px-[18px] py-[15px] text-[12px] leading-[1.7] text-body">{children}</p>;
}

/**
 * Chapters with their background music and pages (guide §14; prototype workspace.js `storyEditor`).
 * Stories: any number of chapters. Rhymes pass `singleChapter`: exactly one chapter, with no Add,
 * Delete or reorder (§15). Music is an uploaded audio file (OPEN_QUESTIONS Q5), not a YouTube link.
 */
export function ChapterList({ chapters, onChange, singleChapter, disabled }: {
  chapters: LibraryChapter[];
  onChange: (chapters: LibraryChapter[]) => void;
  singleChapter?: boolean;
  disabled?: boolean;
}) {
  const set = (next: LibraryChapter[]) => onChange(withPositions(next));
  const update = (id: string, patch: Partial<LibraryChapter>) => set(chapters.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  return (
    <div>
      {singleChapter ? (
        <EditorNote>Each rhyme has one chapter. Add pages and stacked images within this chapter.</EditorNote>
      ) : (
        <>
          <div className="flex items-center justify-between gap-[15px]">
            <h3>Chapters</h3>
            <Button disabled={disabled} onClick={() => set([...chapters, emptyChapter(chapters.length + 1)])}>
              + Add chapter
            </Button>
          </div>
          <EditorNote>Add as many chapters as your story needs. There is no chapter-count limit.</EditorNote>
        </>
      )}

      {chapters.map((chapter, i) => (
        <section key={chapter.id} className="my-3 grid gap-[15px] rounded-md border border-line p-[15px]">
          <div className="flex flex-wrap items-center justify-between gap-[15px]">
            <h3 className="m-0">Chapter {i + 1}</h3>
            {!singleChapter && (
              <>
                <ReorderControls index={i} count={chapters.length} label="chapter" disabled={disabled} onMove={(to) => set(moveItem(chapters, i, to))} />
                <Button disabled={disabled || chapters.length === 1} onClick={() => set(chapters.filter((c) => c.id !== chapter.id))}>
                  Delete chapter
                </Button>
              </>
            )}
          </div>
          <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2">
            <TextField label="Chapter name" value={chapter.title} disabled={disabled} onChange={(e) => update(chapter.id, { title: e.target.value })} />
            <FileUpload label="Background music" kind="AUDIO" value={chapter.musicUrl} disabled={disabled} onChange={(musicUrl) => update(chapter.id, { musicUrl })} />
          </div>
          <PageList pages={chapter.pages} disabled={disabled} onChange={(pages) => update(chapter.id, { pages })} />
        </section>
      ))}

      <EditorNote>Pages stay in chapter order. Each page has one description and its stacked images, matching the mobile reader.</EditorNote>
    </div>
  );
}
