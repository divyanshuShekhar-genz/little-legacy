import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';

/**
 * Reorder one item in a list (guide §14): type a position number, or use Move up / Move down.
 * `index` is 0-based; staff see and type 1-based positions.
 */
export function ReorderControls({ index, count, label, onMove, disabled }: {
  index: number;
  count: number;
  /** What is being moved, for screen readers: "chapter", "page", "image". */
  label: string;
  onMove: (to: number) => void;
  disabled?: boolean;
}) {
  const [typed, setTyped] = useState(String(index + 1));
  useEffect(() => setTyped(String(index + 1)), [index]);

  const commit = () => {
    const n = Number(typed);
    if (Number.isInteger(n) && n >= 1 && n !== index + 1) onMove(Math.min(n, count) - 1);
    else setTyped(String(index + 1));
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="flex items-center gap-2 text-[12px] text-body">
        Position
        <input
          className="input w-[70px] py-2"
          type="number"
          min={1}
          max={count}
          value={typed}
          disabled={disabled || count < 2}
          aria-label={`Position of this ${label}`}
          onChange={(e) => setTyped(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commit();
            }
          }}
        />
      </label>
      <Button size="sm" onClick={() => onMove(index - 1)} disabled={disabled || index === 0} aria-label={`Move ${label} up`}>
        Move up
      </Button>
      <Button size="sm" onClick={() => onMove(index + 1)} disabled={disabled || index === count - 1} aria-label={`Move ${label} down`}>
        Move down
      </Button>
    </div>
  );
}
