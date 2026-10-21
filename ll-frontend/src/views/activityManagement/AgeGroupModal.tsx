import { useLayoutEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/Modal';
import { TextField } from '@/components/ui/Field';
import { DecisionActions, type SaveMode } from '@/components/DecisionActions';
import { useAddAgeGroup } from '@/api/areas';
import { saveWith } from './saved';

/** Prototype folder-alignment.js `ageGroupEditor()` (docs/API_REQUESTS.md #5). Any whole age, no upper limit. */
export function AgeGroupModal({ open, regionId, onClose, onAdded }: { open: boolean; regionId: string; onClose: () => void; onAdded?: (age: number) => void }) {
  const add = useAddAgeGroup();
  const { register, reset, getValues } = useForm<{ age: string }>();

  useLayoutEffect(() => {
    if (open) reset({ age: '' });
  }, [open, reset]);

  const onSave = async (mode: SaveMode) => {
    const raw = getValues('age').trim();
    const age = Number(raw);
    // The prototype's check, before sending (the API checks it too).
    if (!raw || !Number.isInteger(age) || age < 0) return void toast.error('Enter a non-negative age in years.');
    const result = await saveWith(() => add.mutateAsync({ mode, regionId, age }), `Added age group ${age}`);
    if (!result) return;
    if (result.status === 'published') onAdded?.(age);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add age group"
      footer={<DecisionActions onClose={onClose} onSave={onSave} showReject={false} busy={add.isPending} />}
    >
      {open && (
        <form onSubmit={(e) => e.preventDefault()}>
          <TextField label="Age in years" type="number" min={0} step="any" {...register('age')} />
          <p className="mb-6 mt-2 leading-[1.7] text-muted">Enter any age, using completed whole years. There is no upper age limit.</p>
        </form>
      )}
    </Modal>
  );
}
