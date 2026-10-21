import type { ReactNode } from 'react';
import type { Option } from './Field';

/** Standard search + filter bar ("Search records…" / "All" + filters). */
export function Toolbar({ search, onSearch, filter, onFilter, filters, children }: {
  search?: string;
  onSearch?: (value: string) => void;
  filter?: string;
  onFilter?: (value: string) => void;
  filters?: Option[];
  children?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-3">
      {onSearch && (
        <input
          className="input"
          aria-label="Search records"
          placeholder="Search records…"
          value={search ?? ''}
          onChange={(e) => onSearch(e.target.value)}
        />
      )}
      {onFilter && filters && (
        <select className="input" aria-label="Filter records" value={filter ?? ''} onChange={(e) => onFilter(e.target.value)}>
          <option value="">All</option>
          {filters.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      )}
      {children}
    </div>
  );
}
