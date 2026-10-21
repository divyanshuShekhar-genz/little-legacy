import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

/** The prototype's `.editor-card` (folder-alignment.css): a bordered block inside an editor. */
export function EditorCard({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn('my-3 rounded-md border border-line p-[15px]', className)}>{children}</section>;
}

/** The prototype's `.editor-card .row`: a bold label on the left, an action on the right. */
export function EditorCardRow({ label, children }: { label: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-[15px] border-b border-line pb-[17px]">
      <strong className="mb-[5px] block">{label}</strong>
      {children}
    </div>
  );
}

/** The prototype's `p.note` (blue callout with paragraph margins). */
export function NoteText({ children }: { children: ReactNode }) {
  return <p className="mb-6 mt-2 rounded-[10px] bg-note px-[18px] py-[15px] text-[12px] leading-[1.7] text-body">{children}</p>;
}
