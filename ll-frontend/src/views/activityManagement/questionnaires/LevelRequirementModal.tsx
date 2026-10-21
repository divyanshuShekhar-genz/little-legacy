import { useLayoutEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/Modal';
import { FormGrid, TextField } from '@/components/ui/Field';
import { DecisionActions, type SaveMode } from '@/components/DecisionActions';
import { useSaveLevel, type AreaLevel } from '@/api/levels';
import { saveWith } from '../saved';

/**
 * Prototype app.js `action === 'level'` ("Configure"): a level's score and repetition thresholds,
 * saved with PATCH /api/levels/:id (docs/API_REQUESTS.md #6). The PATCH takes the whole level, so
 * the rest of it is sent back unchanged. Children's earned levels never go down (the API freezes
 * them first).
 */
export function LevelRequirementModal({ area, level, onClose }: {
  area: { id: string; name: string };
  level: (AreaLevel & { category: { id: string; name: string } | null }) | null;
  onClose: () => void;
}) {
  const save = useSaveLevel();
  const { register, reset, getValues } = useForm<{ score: string; mastery: string }>();

  useLayoutEffect(() => {
    if (level) reset({ score: String(level.requiredScore), mastery: String(level.requiredMastered) });
  }, [level, reset]);

  const onSave = async (mode: SaveMode) => {
    if (!level) return;
    const requiredScore = Number(getValues('score'));
    const requiredMastered = Number(getValues('mastery'));
    if (!Number.isInteger(requiredMastered)) return void toast.error('Activities with repetitions complete must be a whole number');
    const result = await saveWith(
      () =>
        save.mutateAsync({
          id: level.id,
          mode,
          areaId: area.id,
          categoryId: level.category?.id ?? null,
          // Thresholds only: the icon and colour are left out, so they stay as stored.
          input: { number: level.number, title: level.title, requiredScore, requiredMastered },
        }),
      `Updated ${area.name} level ${level.number} thresholds`,
    );
    if (result) onClose();
  };

  return (
    <Modal
      open={Boolean(level)}
      onClose={onClose}
      title={level ? `${area.name} · Level ${level.number}` : ''}
      footer={<DecisionActions onClose={onClose} onSave={onSave} showReject={false} busy={save.isPending} />}
    >
      {level && (
        <form onSubmit={(e) => e.preventDefault()}>
          <FormGrid>
            <TextField label="Required score" type="number" min={0} step="any" {...register('score')} />
            <TextField label="Activities with repetitions complete" type="number" min={0} step="any" {...register('mastery')} />
          </FormGrid>
        </form>
      )}
    </Modal>
  );
}
