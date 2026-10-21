import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

type Tone = 'default' | 'success' | 'warning' | 'danger' | 'neutral';

const tones: Record<Tone, string> = {
  default: 'bg-accent-soft text-accent',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  neutral: 'bg-line text-body',
};

export function Badge({ tone = 'default', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={cn('inline-block rounded-full px-2.5 py-[5px] text-[11px]', tones[tone])}>{children}</span>;
}

/** Maps any backend status enum to a badge tone. */
export function StatusBadge({ status }: { status: string }) {
  const tone: Tone = ['PUBLISHED', 'RESOLVED', 'DELIVERED', 'MASTERED', 'ACTIVE'].includes(status)
    ? 'success'
    : ['REJECTED', 'CANCELLED', 'WITHDRAWN'].includes(status)
      ? 'danger'
      : ['PENDING_APPROVAL', 'AWAITING_MODERATION', 'NEW'].includes(status)
        ? 'warning'
        : 'default';
  // Q21 (CR9): "repetition" replaces "mastery" in what the admin reads.
  return <Badge tone={tone}>{status === 'MASTERED' ? 'Repetitions complete' : humanize(status)}</Badge>;
}

export const humanize = (value: string) =>
  value.charAt(0) + value.slice(1).toLowerCase().replace(/_/g, ' ');
