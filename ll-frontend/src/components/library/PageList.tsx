import { Button } from '@/components/ui/Button';
import { TextAreaField } from '@/components/ui/Field';
import { moveItem, withPositions } from '@/utils/reorder';
import { emptyPage, type LibraryPage } from './types';
import { ReorderControls } from './ReorderControls';
import { StackedImages } from './StackedImages';

/**
 * The pages of one chapter: add, delete, reorder (prototype workspace.js `storyEditor`). Each page
 * has one description and its own stacked images. A page moves with its images, so other pages are
 * never touched. The last page can't be deleted, as in the prototype.
 */
export function PageList({ pages, onChange, disabled }: {
  pages: LibraryPage[];
  onChange: (pages: LibraryPage[]) => void;
  disabled?: boolean;
}) {
  const set = (next: LibraryPage[]) => onChange(withPositions(next));
  const update = (id: string, patch: Partial<LibraryPage>) => set(pages.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  return (
    <div className="grid gap-3">
      {pages.map((page, i) => (
        <section key={page.id} className="grid gap-[15px] rounded-md border border-line p-[15px]">
          <div className="flex flex-wrap items-center justify-between gap-[15px]">
            <strong>Page {i + 1}</strong>
            <ReorderControls index={i} count={pages.length} label="page" disabled={disabled} onMove={(to) => set(moveItem(pages, i, to))} />
            <Button disabled={disabled || pages.length === 1} onClick={() => set(pages.filter((p) => p.id !== page.id))}>
              Delete page
            </Button>
          </div>
          <TextAreaField
            label="Page description"
            value={page.description ?? ''}
            disabled={disabled}
            onChange={(e) => update(page.id, { description: e.target.value || null })}
          />
          <StackedImages images={page.images} disabled={disabled} onChange={(images) => update(page.id, { images })} />
        </section>
      ))}
      <div>
        <Button disabled={disabled} onClick={() => set([...pages, emptyPage(pages.length + 1)])}>
          + Add page
        </Button>
      </div>
    </div>
  );
}
