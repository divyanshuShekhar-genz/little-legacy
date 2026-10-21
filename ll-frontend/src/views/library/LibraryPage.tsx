import { useDeferredValue, useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { Toolbar } from '@/components/ui/Toolbar';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { CountryAccessButton } from '@/components/CountryAccessButton';
import { AddCategoryModal, ManageCategoriesModal } from '@/components/library/CategoryModals';
import type { LibraryKind } from '@/components/library/types';
import { PLAN_LABELS } from '@/constants/plans';
import type { LibraryRow } from './data';
import { LIBRARY_CONFIG } from './config';
import { useDeleteLibraryCategory, useLibraryCategories, useLibraryItems, useSaveLibraryCategory } from '@/api/library';
import { LibraryEditorModal } from './LibraryEditorModal';

type Dialog = { name: 'item'; id: string | null } | { name: 'addCategory' } | { name: 'categories' } | null;

const PENDING_LABEL = { DRAFT: 'Draft changes', PENDING_APPROVAL: 'Changes pending approval' } as const;

/**
 * Stories (guide §14) and Rhymes (§15): prototype app.js / parent-content.js library pages.
 * UI only: local data (docs/API_REQUESTS.md #17 Stories, #18 Rhymes). Country access restricts the
 * whole section, not single items (guide §21). Columns follow the prototype: stories list
 * Chapters; rhymes don't (always one).
 */
export function LibraryPage({ kind }: { kind: LibraryKind }) {
  const config = LIBRARY_CONFIG[kind];
  const { data: items, isLoading } = useLibraryItems(kind);
  const { data: categories } = useLibraryCategories(kind);
  const saveCategory = useSaveLibraryCategory(kind);
  const deleteCategory = useDeleteLibraryCategory(kind);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [dialog, setDialog] = useState<Dialog>(null);
  const close = () => setDialog(null);
  const term = useDeferredValue(search.trim().toLowerCase());

  const rows = items?.filter(
    (i) => (!categoryId || i.categoryId === categoryId) && (!term || `${i.title} ${i.categoryName ?? ''}`.toLowerCase().includes(term)),
  );

  const columns: Column<LibraryRow>[] = [
    { header: config.Noun, cell: (i) => i.title },
    { header: 'Category', cell: (i) => i.categoryName ?? '—' },
    ...(config.chaptersColumn ? [{ header: 'Chapters', cell: (i: LibraryRow) => i.chapterCount }] : []),
    {
      header: 'Status',
      cell: (i) => (
        <>
          <StatusBadge status={i.status} />
          {i.pendingStatus && <small className="mt-[5px] block text-[12px] text-muted">{PENDING_LABEL[i.pendingStatus]}</small>}
        </>
      ),
    },
    { header: 'Minimum plan', cell: (i) => PLAN_LABELS[i.minimumPlan] },
    { header: '', cell: (i) => <Button onClick={() => setDialog({ name: 'item', id: i.id })}>Edit {config.noun}</Button> },
  ];

  return (
    <>
      <PageHeader
        eyebrow={config.eyebrow}
        title={config.title}
        subtitle={config.subtitle}
        actions={
          <>
            <CountryAccessButton types={[config.restriction]} />
            <Button onClick={() => setDialog({ name: 'addCategory' })}>Add category</Button>
            <Button onClick={() => setDialog({ name: 'categories' })}>Manage categories</Button>
            <Button variant="primary" onClick={() => setDialog({ name: 'item', id: null })}>
              Add {config.noun}
            </Button>
          </>
        }
      />
      <Toolbar
        search={search}
        onSearch={setSearch}
        filter={categoryId}
        onFilter={setCategoryId}
        filters={(categories ?? []).map((c) => ({ value: c.id, label: c.name }))}
      />
      <Panel>
        <DataTable loading={isLoading} rows={rows} rowKey={(i) => i.id} columns={columns} />
      </Panel>

      <LibraryEditorModal kind={kind} open={dialog?.name === 'item'} itemId={dialog?.name === 'item' ? dialog.id : null} onClose={close} />
      <AddCategoryModal open={dialog?.name === 'addCategory'} title={config.addCategoryTitle} onClose={close} onSave={(name) => saveCategory.mutateAsync({ name })} />
      <ManageCategoriesModal
        open={dialog?.name === 'categories'}
        onClose={close}
        categories={categories ?? []}
        onRename={(id, name) => saveCategory.mutateAsync({ id, name })}
        onDelete={(id, replacementId) => deleteCategory.mutateAsync({ id, replacementId })}
      />
    </>
  );
}

export const StoriesPage = () => <LibraryPage kind="STORY" />;
export const RhymesPage = () => <LibraryPage kind="RHYME" />;
