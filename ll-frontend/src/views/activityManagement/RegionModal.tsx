import { useLayoutEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/Modal';
import { CheckboxField, TextAreaField, TextField } from '@/components/ui/Field';
import { DecisionActions, type SaveMode } from '@/components/DecisionActions';
import { errorMessage } from '@/api/client';
import { useSaveRegion, type LearningRegion } from '@/api/regions';
import { DRAFT_SAVED } from '@/constants/messages';
import { pText } from './ConfirmModal';

interface RegionForm {
  name: string;
  countries: string;
  active: boolean;
  isDefault: boolean;
}

/**
 * Prototype admin-rebuild.js `regionEditor()`: add a regional learning category, or edit one
 * ("Edit countries"), through docs/API_REQUESTS.md #4 (Super Admin only). Validation messages
 * come from the API and match the prototype's. Deliberate additions (CP §2, OPEN_QUESTIONS Q8 /
 * Q19): "Active" and, when editing, "Default category".
 */
export function RegionModal({ open, region, onClose }: { open: boolean; region?: LearningRegion; onClose: () => void }) {
  const save = useSaveRegion();
  const { register, reset, getValues } = useForm<RegionForm>();

  useLayoutEffect(() => {
    if (open) {
      reset({
        name: region?.name ?? '',
        countries: region?.countries.map((c) => c.code).join(' ') ?? '',
        active: region?.active ?? false,
        isDefault: region?.isDefault ?? false,
      });
    }
  }, [open, region, reset]);

  const onSave = async (mode: SaveMode) => {
    const v = getValues();
    try {
      const result = await save.mutateAsync({
        id: region?.id,
        mode,
        input: {
          name: v.name,
          countryCodes: v.countries.split(/[\s,]+/).filter(Boolean),
          active: v.active,
          // Only "make default" is sent; the default moves by choosing another category.
          ...(region && v.isDefault && !region.isDefault ? { isDefault: true as const } : {}),
        },
      });
      toast.success(result.status === 'draft' ? DRAFT_SAVED : 'Regional category saved');
      onClose();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={region ? 'Edit regional category' : 'Add regional category'}
      footer={<DecisionActions onClose={onClose} onSave={onSave} showReject={false} busy={save.isPending} />}
    >
      {open && (
        <form onSubmit={(e) => e.preventDefault()}>
          <TextField label="Category name" {...register('name')} />
          <div className="mt-[18px]">
            <TextAreaField label="Country codes separated by spaces" {...register('countries')} />
          </div>
          <p className={pText}>
            Europe is represented by its countries. Edit this list to match your supported countries. Each country belongs to one learning
            category.
          </p>
          <div className="grid gap-2.5">
            <CheckboxField label="Active: new children in these countries get this category" {...register('active')} />
            {region && (
              <CheckboxField
                label={region.isDefault ? 'Default category (to change it, make another category the default)' : 'Make this the default category'}
                disabled={region.isDefault}
                {...register('isDefault')}
              />
            )}
          </div>
          {!region && <p className={pText}>New categories start empty. A new category can be made the default once it exists and is active.</p>}
        </form>
      )}
    </Modal>
  );
}
