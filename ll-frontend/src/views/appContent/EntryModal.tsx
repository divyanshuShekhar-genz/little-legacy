import { useLayoutEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { SelectField, TextAreaField, TextField } from '@/components/ui/Field';
import { errorMessage } from '@/api/client';
import { useAppContent, useSaveEntry } from '@/api/appContent';
import { SURFACES, SURFACE_LABELS, entryError, type AppContentEntry, type AppContentSurface } from './data';

interface EntryForm {
  key: string;
  surface: AppContentSurface;
  page: string;
  title: string;
  body: string;
}

/**
 * Prototype parent-content.js `appEntryEditor()`: one working-draft entry. Saving changes the
 * draft only (parents see it once a version is published), so the footer is Close · Save to draft
 * rather than the approval footer (deliberate difference, guide §22). Messages are the prototype's;
 * the same checks run here first, and the server's message shows if it still refuses.
 */
export function EntryModal({ open, entry, defaultSurface, defaultPage, onClose }: {
  open: boolean;
  entry?: AppContentEntry;
  defaultSurface: AppContentSurface;
  defaultPage: string;
  onClose: () => void;
}) {
  const save = useSaveEntry();
  const { data } = useAppContent();
  const { register, reset, getValues, watch } = useForm<EntryForm>();
  const surface = watch('surface');

  useLayoutEffect(() => {
    if (open) {
      reset({
        key: entry?.key ?? '',
        surface: entry?.surface ?? defaultSurface,
        page: entry?.page ?? defaultPage,
        title: entry?.title ?? '',
        body: entry?.body ?? '',
      });
    }
  }, [open, entry, defaultSurface, defaultPage, reset]);

  const onSave = async () => {
    const v = getValues();
    const next: AppContentEntry = { key: entry?.key ?? v.key.trim(), surface: v.surface, page: v.surface === 'PAGE_FAQ' ? v.page.trim() : null, title: v.title, body: v.body };
    const error = entryError(next, data.entries.map((e) => e.key), !entry);
    if (error) return void toast.error(error);
    try {
      const saved = await save.mutateAsync({ originalKey: entry?.key, entry: next });
      toast.success(`Saved App Content draft: ${saved.key}`);
      onClose();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={entry ? 'Edit content entry' : 'Add content entry'}
      footer={
        <div className="flex flex-wrap justify-end gap-2.5">
          <Button onClick={onClose}>Close</Button>
          <Button variant="primary" onClick={onSave} disabled={save.isPending}>
            Save to draft
          </Button>
        </div>
      }
    >
      {open && (
        <form onSubmit={(e) => e.preventDefault()}>
          <TextField label="Key" readOnly={Boolean(entry)} {...register('key')} />
          <SelectField label="Surface" options={SURFACES.map((s) => ({ value: s, label: SURFACE_LABELS[s] }))} {...register('surface')} />
          <TextField label="Page route (required for FAQ)" disabled={surface !== 'PAGE_FAQ'} {...register('page')} />
          <TextField label="Title / question" {...register('title')} />
          <TextAreaField label="Body / answer" {...register('body')} />
          <p className="mb-6 mt-2 leading-[1.7] text-muted">
            Use plain text. Keys and page routes identify the parent screen; editing does not change its action or navigation.
          </p>
        </form>
      )}
    </Modal>
  );
}
