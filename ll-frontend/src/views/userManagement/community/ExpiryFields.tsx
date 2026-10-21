import type { UseFormRegisterReturn } from 'react-hook-form';
import { TextField } from '@/components/ui/Field';

/** Split a stored duration back into the Days / Hours inputs (0 / 0 = no expiry). */
export const expiryDefaults = (hours: number | null) => ({
  expiryDays: Math.floor((hours ?? 0) / 24),
  expiryHours: (hours ?? 0) % 24,
});

/**
 * Prototype admin-rebuild.js `expiryField()`: "Expire after" Days + Hours.
 * Pass `register('expiryDays', { valueAsNumber: true })` etc. from the parent form.
 */
export function ExpiryFields({ days, hours }: { days: UseFormRegisterReturn; hours: UseFormRegisterReturn }) {
  return (
    <>
      <h3>Expire after</h3>
      <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2">
        <TextField label="Days" type="number" min={0} max={36500} step={1} {...days} />
        <TextField label="Hours" type="number" min={0} max={23} step={1} {...hours} />
      </div>
      <p className="mb-6 mt-2 leading-[1.7] text-muted">
        The timer starts when the post is approved, including approval after a draft. Set both to 0 for no expiry.
      </p>
    </>
  );
}
