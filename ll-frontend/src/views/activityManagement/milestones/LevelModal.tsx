import { useLayoutEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/Modal';
import { FormGrid, SelectField, TextField } from '@/components/ui/Field';
import { DecisionActions, type SaveMode } from '@/components/DecisionActions';
import type { DevelopmentArea } from '@/api/areas';
import type { ActivityCategory } from '@/api/categories';
import { DEFAULT_LEVEL_COLOUR, LEVEL_ICONS, useSaveLevel, type AreaLevel, type LevelIcon } from '@/api/levels';
import { pText } from '../ConfirmModal';
import { saveWith } from '../saved';

interface LevelForm {
  number: string;
  title: string;
  icon: LevelIcon | '';
  iconColor: string;
  requiredScore: string;
  requiredMastered: string;
}

/**
 * Prototype folder-alignment.js `levelEditor()`: an area level and its requirements
 * (docs/API_REQUESTS.md #6). The level number defaults to the next free one. Before a level
 * changes, the backend saves each child's current level, so levels never go down. When editing,
 * the icon and colour are sent only if the admin changed them: a level without them keeps none,
 * so its draft shows only the real changes.
 */
export function LevelModal({ open, area, category, level, nextNumber, onClose }: {
  open: boolean;
  area: DevelopmentArea;
  category: ActivityCategory | null;
  level?: AreaLevel;
  nextNumber: number;
  onClose: () => void;
}) {
  const save = useSaveLevel();
  const { register, reset, getValues } = useForm<LevelForm>();

  useLayoutEffect(() => {
    if (!open) return;
    reset({
      number: String(level?.number ?? nextNumber),
      title: level?.title ?? '',
      icon: level?.icon ?? 'Brain',
      iconColor: level?.iconColor ?? DEFAULT_LEVEL_COLOUR,
      requiredScore: String(level?.requiredScore ?? 0),
      requiredMastered: String(level?.requiredMastered ?? 0),
    });
  }, [open, level?.id]); // defaults are taken when the dialog opens

  const onSave = async (mode: SaveMode) => {
    const v = getValues();
    const number = Number(v.number);
    const requiredMastered = Number(v.requiredMastered);
    // The prototype's check, before sending (the API checks every rule).
    if (!Number.isInteger(number) || number < 1 || !Number.isInteger(requiredMastered)) {
      return void toast.error('Level and activities with repetitions complete must be whole numbers.');
    }
    const result = await saveWith(
      () =>
        save.mutateAsync({
          id: level?.id,
          mode,
          areaId: area.id,
          categoryId: category?.id ?? null,
          input: {
            number,
            title: v.title.trim() || null,
            ...(!level || v.icon !== (level.icon ?? 'Brain') ? { icon: v.icon || null } : {}),
            ...(!level || v.iconColor.toUpperCase() !== (level.iconColor ?? DEFAULT_LEVEL_COLOUR).toUpperCase() ? { iconColor: v.iconColor.toUpperCase() } : {}),
            requiredScore: Number(v.requiredScore),
            requiredMastered,
          },
        }),
      `${level ? 'Updated' : 'Added'} ${area.name} level ${number}`,
    );
    if (result) onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={level ? 'Edit Level' : 'Add New Level'}
      footer={<DecisionActions onClose={onClose} onSave={onSave} showReject={false} busy={save.isPending} />}
    >
      {open && (
        <form onSubmit={(e) => e.preventDefault()}>
          <FormGrid>
            <TextField label="Level number" type="number" {...register('number')} />
            <TextField label="Level name / title" {...register('title')} />
            <SelectField label="Icon" options={LEVEL_ICONS.map((i) => ({ value: i, label: i }))} {...register('icon')} />
            <TextField label="Icon colour" type="color" {...register('iconColor')} />
            <TextField label="Required score" type="number" {...register('requiredScore')} />
            <TextField label="Activities with repetitions complete" type="number" {...register('requiredMastered')} />
          </FormGrid>
          <p className={pText}>
            {area.name} · {category?.name ?? 'No category'} · Level requirements.
          </p>
        </form>
      )}
    </Modal>
  );
}
