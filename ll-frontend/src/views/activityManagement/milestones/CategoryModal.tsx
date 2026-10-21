import { useLayoutEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Modal } from '@/components/ui/Modal';
import { TextAreaField, TextField } from '@/components/ui/Field';
import { DecisionActions, type SaveMode } from '@/components/DecisionActions';
import type { DevelopmentArea } from '@/api/areas';
import { useSaveCategory, type ActivityCategory } from '@/api/categories';
import { pText } from '../ConfirmModal';
import { saveWith } from '../saved';

/**
 * Prototype development-categories.js `developmentCategoryEditor()` (docs/API_REQUESTS.md #6).
 * Categories are optional; the first one takes over the area's existing levels and activities.
 * Validation messages come from the API.
 */
export function CategoryModal({ open, area, category, isFirst, onClose }: {
  open: boolean;
  area: DevelopmentArea;
  category?: ActivityCategory;
  /** The area has no categories yet. */
  isFirst: boolean;
  onClose: () => void;
}) {
  const save = useSaveCategory();
  const { register, reset, getValues } = useForm<{ name: string; description: string }>();

  useLayoutEffect(() => {
    if (open) reset({ name: category?.name ?? '', description: category?.description ?? '' });
  }, [open, category, reset]);

  const onSave = async (mode: SaveMode) => {
    const name = getValues('name').trim().replace(/\s+/g, ' ');
    const description = getValues('description').trim() || null;
    const result = await saveWith(
      () => save.mutateAsync({ id: category?.id, mode, areaId: area.id, name, description }),
      `${category ? 'Updated' : 'Added'} ${area.name} category: ${name}`,
    );
    if (result) onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={category ? 'Edit category' : 'Add category'}
      footer={<DecisionActions onClose={onClose} onSave={onSave} showReject={false} busy={save.isPending} />}
    >
      {open && (
        <form onSubmit={(e) => e.preventDefault()}>
          <TextField label="Category name" {...register('name')} />
          <TextAreaField label="Description" {...register('description')} />
          <p className={pText}>{area.name} · Categories are optional. Each category has its own levels and activities.</p>
          {!category && isFirst && area.counts.levels > 0 && <p className={pText}>Existing levels and activities will move into this first category.</p>}
        </form>
      )}
    </Modal>
  );
}
