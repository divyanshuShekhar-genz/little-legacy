import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

export function Panel({ title, subtitle, actions, children, className }: {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('mb-[22px] rounded-card border border-line bg-white p-6 shadow-card', className)}>
      {(title || actions) && (
        <div className="mb-[18px] flex items-start justify-between gap-4">
          <div>
            {title && <h2>{title}</h2>}
            {subtitle && <p className="mt-1 text-[12px] text-muted">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

/** Blue informational callout used throughout the prototype for rule explanations. */
export function Note({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('my-4 rounded-[10px] bg-note px-[18px] py-[15px] text-[12px] leading-[1.7] text-body', className)}>{children}</div>;
}
