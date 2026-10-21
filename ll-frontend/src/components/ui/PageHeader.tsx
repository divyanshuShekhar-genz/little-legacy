import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/utils/cn';

export function PageHeader({ eyebrow, title, subtitle, actions, back }: {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  /**
   * Back link to the parent hub, e.g. "← User Management". Sits on the right, level with the top
   * of the heading block (the eyebrow line); page actions, if any, go underneath it.
   */
  back?: { to: string; label: string };
}) {
  return (
    <div
      className={cn(
        'mb-7 flex flex-wrap justify-between gap-5 max-[650px]:items-start',
        // With a back link, align to the top; otherwise actions are vertically centred (prototype .heading).
        back ? 'items-start' : 'items-center',
      )}
    >
      <div className="min-w-0 max-w-full">
        {eyebrow && <span className="eyebrow">Little Legacy / {eyebrow}</span>}
        <h1>{title}</h1>
        {subtitle && <p className="mt-2 leading-[1.7] text-muted">{subtitle}</p>}
      </div>
      {(back || actions) && (
        // A small basis keeps this beside the title; when the actions don't fit, they wrap here (right-aligned)
        // instead of the whole block dropping below the heading.
        <div className="flex min-w-0 flex-[1_1_240px] flex-col items-end gap-3">
          {back && (
            <Link
              to={back.to}
              className="inline-flex items-center rounded-md border border-[#ded6e5] bg-white px-3.5 py-2.5 leading-[normal] text-[#334155] hover:bg-canvas"
            >
              ← {back.label}
            </Link>
          )}
          {actions && <div className="flex flex-wrap justify-end gap-2">{actions}</div>}
        </div>
      )}
    </div>
  );
}
