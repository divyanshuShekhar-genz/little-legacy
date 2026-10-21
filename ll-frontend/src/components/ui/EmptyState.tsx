import type { ReactNode } from 'react';

export function EmptyState({ title, message, action }: { title: string; message?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-card border border-dashed border-line bg-white p-[45px] text-center">
      <h2>{title}</h2>
      {message && <p className="mx-auto mt-2 max-w-xl text-body">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
