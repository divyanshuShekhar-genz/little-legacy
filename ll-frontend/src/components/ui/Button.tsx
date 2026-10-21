import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

type Variant = 'default' | 'primary' | 'danger' | 'ghost';

const variants: Record<Variant, string> = {
  default: 'border-[#ded6e5] bg-white text-[#334155] hover:bg-canvas',
  primary: 'border-primary bg-primary text-white hover:bg-primary-hover',
  danger: 'border-danger/30 bg-white text-danger hover:bg-danger-soft',
  ghost: 'border-transparent bg-transparent text-body hover:bg-line/60',
};

/** md = 14px (page content); sm = 12px (header buttons, which inherit the 12px header font). */
const sizes = { md: 'text-sm', sm: 'text-xs' } as const;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: keyof typeof sizes;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'default', size = 'md', className, type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md border px-3.5 py-2.5 leading-[normal] transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        sizes[size],
        variants[variant],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = 'Button';
