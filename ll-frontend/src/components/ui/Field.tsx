import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

interface FieldShellProps {
  label: string;
  error?: string;
  hint?: ReactNode;
  /** Span both columns of a FormGrid. */
  full?: boolean;
  htmlFor: string;
  children: ReactNode;
}

function FieldShell({ label, error, hint, full, htmlFor, children }: FieldShellProps) {
  return (
    <div className={cn('grid gap-[7px] text-[12px] text-body', full && 'col-span-full')}>
      <label htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint && !error && <span className="text-muted">{hint}</span>}
      {error && <span className="text-danger">{error}</span>}
    </div>
  );
}

type Common = { label: string; error?: string; hint?: ReactNode; full?: boolean };

export const TextField = forwardRef<HTMLInputElement, Common & InputHTMLAttributes<HTMLInputElement>>(
  ({ label, error, hint, full, id, className, ...props }, ref) => {
    const auto = useId();
    const fieldId = id ?? auto;
    return (
      <FieldShell label={label} error={error} hint={hint} full={full} htmlFor={fieldId}>
        <input ref={ref} id={fieldId} className={cn('input w-full', className)} aria-invalid={Boolean(error)} {...props} />
      </FieldShell>
    );
  },
);
TextField.displayName = 'TextField';

export const TextAreaField = forwardRef<HTMLTextAreaElement, Common & TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ label, error, hint, full = true, id, className, ...props }, ref) => {
    const auto = useId();
    const fieldId = id ?? auto;
    return (
      <FieldShell label={label} error={error} hint={hint} full={full} htmlFor={fieldId}>
        <textarea ref={ref} id={fieldId} className={cn('input min-h-[90px] w-full', className)} aria-invalid={Boolean(error)} {...props} />
      </FieldShell>
    );
  },
);
TextAreaField.displayName = 'TextAreaField';

export interface Option {
  value: string;
  label: string;
}

export const SelectField = forwardRef<HTMLSelectElement, Common & SelectHTMLAttributes<HTMLSelectElement> & { options: Option[] }>(
  ({ label, error, hint, full, id, options, className, ...props }, ref) => {
    const auto = useId();
    const fieldId = id ?? auto;
    return (
      <FieldShell label={label} error={error} hint={hint} full={full} htmlFor={fieldId}>
        <select ref={ref} id={fieldId} className={cn('input w-full', className)} aria-invalid={Boolean(error)} {...props}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </FieldShell>
    );
  },
);
SelectField.displayName = 'SelectField';

export const CheckboxField = forwardRef<HTMLInputElement, { label: ReactNode } & InputHTMLAttributes<HTMLInputElement>>(
  ({ label, className, ...props }, ref) => (
    <label className={cn('flex cursor-pointer items-center gap-3 rounded-card bg-[#f7f5f9] p-2.5 text-sm', className)}>
      <input ref={ref} type="checkbox" className="h-4 w-4 accent-primary" {...props} />
      <span>{label}</span>
    </label>
  ),
);
CheckboxField.displayName = 'CheckboxField';

export function FormGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('grid grid-cols-1 gap-[18px] sm:grid-cols-2', className)}>{children}</div>;
}
