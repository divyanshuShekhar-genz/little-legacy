import { useLayoutEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/Modal';
import { FormGrid, SelectField, TextField } from '@/components/ui/Field';
import { DecisionActions, type SaveMode } from '@/components/DecisionActions';
import { errorMessage } from '@/api/client';
import { useSaveCountry, type Country } from '@/api/countries';
import { DRAFT_SAVED } from '@/constants/messages';

interface CountryForm {
  name: string;
  code: string;
  currency: string;
  deliveryCharge: string;
  deliveryEstimate: string;
  enabled: 'Enabled' | 'Disabled';
}

/** The prototype's toast for anything saved as a draft (admin-rebuild.js `done()`). */

/**
 * "Add country" / "Edit country" (prototype commerce.js `marketEditor`; docs/API_REQUESTS.md #3).
 * Code and currency can't change once the country exists. Validation messages come from the API.
 */
export function CountryModal({ open, country, onClose }: { open: boolean; country: Country | null; onClose: () => void }) {
  const save = useSaveCountry();
  const { register, reset, getValues } = useForm<CountryForm>();

  useLayoutEffect(() => {
    if (!open) return;
    reset({
      name: country?.name ?? '',
      code: country?.code ?? '',
      currency: country?.currency ?? '',
      deliveryCharge: country ? String(country.deliveryCharge) : '0',
      deliveryEstimate: country?.deliveryEstimate ?? '',
      enabled: !country || country.enabled ? 'Enabled' : 'Disabled',
    });
  }, [open, country, reset]);

  const onSave = async (mode: SaveMode) => {
    const v = getValues();
    try {
      const result = await save.mutateAsync({
        code: country?.code,
        mode,
        input: {
          name: v.name,
          code: v.code.trim().toUpperCase(),
          currency: v.currency.trim().toUpperCase(),
          // Sent as typed; the API rejects anything that isn't 0 or more ("Enter a delivery charge of 0 or more.").
          deliveryCharge: v.deliveryCharge.trim() === '' ? NaN : Number(v.deliveryCharge),
          deliveryEstimate: v.deliveryEstimate.trim() || null,
          enabled: v.enabled === 'Enabled',
        },
      });
      if (result.status === 'draft') toast.success(DRAFT_SAVED);
      else toast.success(country ? 'Country saved' : 'Country added');
      // A new country has no prices yet: the API says so in `notice`.
      const { notice } = result as { notice?: string };
      if (notice) toast.message(notice);
      onClose();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={country ? 'Edit country' : 'Add country'}
      footer={<DecisionActions onClose={onClose} onSave={onSave} showReject={false} busy={save.isPending} />}
    >
      {open && (
        <form onSubmit={(e) => e.preventDefault()}>
          <FormGrid>
            <TextField label="Country name" {...register('name')} />
            <TextField
              label="Country code (2 letters, e.g. IN)"
              maxLength={2}
              disabled={Boolean(country)}
              hint={country ? "A country's code can't be changed." : undefined}
              {...register('code')}
            />
            <TextField
              label="Currency code (e.g. INR, USD, GBP)"
              maxLength={3}
              disabled={Boolean(country)}
              hint={country ? "A country's currency can't be changed." : undefined}
              {...register('currency')}
            />
            <TextField label="Delivery charge per order" type="number" min={0} step="0.01" {...register('deliveryCharge')} />
            <TextField label="Delivery estimate" {...register('deliveryEstimate')} />
            <SelectField
              label="Availability"
              options={[
                { value: 'Enabled', label: 'Enabled' },
                { value: 'Disabled', label: 'Disabled' },
              ]}
              {...register('enabled')}
            />
          </FormGrid>
          <p className="mb-6 mt-4 leading-[1.7] text-muted">Amounts are configured manually in this currency. They are not converted automatically.</p>
        </form>
      )}
    </Modal>
  );
}
