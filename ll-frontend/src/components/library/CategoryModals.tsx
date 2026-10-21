import { useLayoutEffect, useState } from 'react';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { SelectField, TextField } from '@/components/ui/Field';
import { DataTable } from '@/components/ui/DataTable';
import { errorMessage } from '@/api/client';
import { DRAFT_SAVED } from '@/constants/messages';
import type { LibraryCategoryRow, SaveResult } from './types';

/** Runs a category change and toasts the result: applied now, or waiting for Super Admin. */
async function run<R extends SaveResult>(action: () => Promise<R>, done: string | ((result: R) => string)) {
  try {
    const result = await action();
    toast.success(result.status === 'published' ? (typeof done === 'string' ? done : done(result)) : DRAFT_SAVED);
    return true;
  } catch (e) {
    toast.error(errorMessage(e));
    return false;
  }
}

/** Close + primary action, as in the prototype's modal footer. */
function Footer({ onClose, action, onAction, busy }: { onClose: () => void; action: string; onAction: () => void; busy: boolean }) {
  return (
    <>
      <Button onClick={onClose} disabled={busy}>
        Close
      </Button>
      <Button variant="primary" onClick={onAction} disabled={busy}>
        {action}
      </Button>
    </>
  );
}

/** "Add story category" / "Add rhyme category" (prototype parent-content.js). */
export function AddCategoryModal({ open, title, onClose, onSave }: {
  open: boolean;
  title: string;
  onClose: () => void;
  onSave: (name: string) => Promise<SaveResult>;
}) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  useLayoutEffect(() => {
    if (open) setName('');
  }, [open]);

  const save = async () => {
    setBusy(true);
    if (await run(() => onSave(name), 'Category added')) onClose();
    setBusy(false);
  };

  return (
    <Modal open={open} onClose={onClose} title={title} footer={<Footer onClose={onClose} action="Save" onAction={save} busy={busy} />}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <TextField label="Category name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </form>
    </Modal>
  );
}

type View = { name: 'list' } | { name: 'rename'; row: LibraryCategoryRow; value: string } | { name: 'delete'; row: LibraryCategoryRow; replacementId: string };

/**
 * "Manage categories" (prototype admin-rebuild.js `manageLibraryCategories`): Category | Items,
 * with Rename or merge and Delete. Renaming to another category's name merges the two; deleting a
 * category in use moves its content to the category chosen in "Move content to".
 */
export function ManageCategoriesModal({ open, onClose, categories, onRename, onDelete }: {
  open: boolean;
  onClose: () => void;
  categories: LibraryCategoryRow[];
  onRename: (id: string, name: string) => Promise<SaveResult & { merged?: boolean }>;
  onDelete: (id: string, replacementId: string | null) => Promise<SaveResult>;
}) {
  const [view, setView] = useState<View>({ name: 'list' });
  const [busy, setBusy] = useState(false);
  useLayoutEffect(() => {
    if (open) setView({ name: 'list' });
  }, [open]);
  const back = () => setView({ name: 'list' });

  const act = async (action: () => Promise<boolean>) => {
    setBusy(true);
    if (await action()) back();
    setBusy(false);
  };

  if (view.name === 'rename') {
    const save = () => act(() => run(() => onRename(view.row.id, view.value), (r) => (r.merged ? 'Categories merged' : 'Category renamed')));
    return (
      <Modal open={open} onClose={onClose} title="Rename or merge category" footer={<Footer onClose={back} action="Save" onAction={save} busy={busy} />}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <TextField label="Category name" value={view.value} onChange={(e) => setView({ ...view, value: e.target.value })} autoFocus />
          <p className="mb-6 mt-2 leading-[1.7] text-muted">
            Use an existing name to merge into that category. All {view.row.itemCount} items will move to the chosen name.
          </p>
        </form>
      </Modal>
    );
  }

  if (view.name === 'delete') {
    const others = categories.filter((c) => c.id !== view.row.id);
    const remove = () => act(() => run(() => onDelete(view.row.id, view.row.itemCount ? view.replacementId || null : null), 'Category deleted'));
    return (
      <Modal open={open} onClose={onClose} title="Delete category" footer={<Footer onClose={back} action="Delete" onAction={remove} busy={busy} />}>
        <p className="mb-6 mt-2 leading-[1.7]">Delete {view.row.name}?</p>
        {view.row.itemCount > 0 && (
          <SelectField
            label="Move content to"
            value={view.replacementId}
            onChange={(e) => setView({ ...view, replacementId: e.target.value })}
            options={others.map((c) => ({ value: c.id, label: c.name }))}
          />
        )}
      </Modal>
    );
  }

  const startDelete = (row: LibraryCategoryRow) => {
    const others = categories.filter((c) => c.id !== row.id);
    if (row.itemCount > 0 && others.length === 0) return void toast.error('Create a replacement category first.');
    setView({ name: 'delete', row, replacementId: others[0]?.id ?? '' });
  };

  return (
    <Modal open={open} onClose={onClose} title="Manage categories" footer={<Button onClick={onClose}>Close</Button>}>
      <DataTable
        rows={categories}
        rowKey={(c) => c.id}
        columns={[
          { header: 'Category', cell: (c) => c.name },
          { header: 'Items', cell: (c) => c.itemCount },
          {
            header: '',
            cell: (c) => (
              <div className="flex gap-2">
                <Button onClick={() => setView({ name: 'rename', row: c, value: c.name })}>Rename or merge</Button>
                <Button onClick={() => startDelete(c)}>Delete</Button>
              </div>
            ),
          },
        ]}
      />
    </Modal>
  );
}
