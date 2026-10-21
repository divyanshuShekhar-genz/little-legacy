import { useEffect, useState } from 'react';
import { cn } from '@/utils/cn';

/**
 * A stacked image. If the file can't be loaded (missing on local storage, OPEN_QUESTIONS Q13),
 * shows a neutral tile instead of a broken image: the label over "Not available", each on its own
 * line and cut short rather than overflowing. `compact` (thumbnails too small for both, e.g. in
 * Draft approvals) shows only "Not available"; the label stays in the tooltip and for screen readers.
 */
export function LibraryImage({ src, label, className, compact = false }: { src: string; label: string; className?: string; compact?: boolean }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);

  if (failed || !src) {
    return (
      <div
        role="img"
        aria-label={`${label}: not available`}
        title={`${label}: not available`}
        className={cn(
          'flex flex-col items-center justify-center overflow-hidden rounded-card border border-line bg-canvas text-center leading-[1.25] text-muted',
          compact ? 'p-1 text-[10px]' : 'gap-0.5 p-2 text-[12px]',
          className,
        )}
      >
        {!compact && <span className="max-w-full truncate font-semibold text-body">{label}</span>}
        <span>Not available</span>
      </div>
    );
  }
  return <img src={src} alt={label} onError={() => setFailed(true)} className={cn('rounded-card object-cover', className)} />;
}
