import type { ReactNode } from 'react';

export interface Column<T> {
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
}

/** `error` (a load failure) replaces the rows and shows in the danger colour, so it can't pass for an empty table. */
export function DataTable<T>({ columns, rows, rowKey, loading, error, empty = 'No matching records' }: {
  columns: Column<T>[];
  rows: T[] | undefined;
  rowKey: (row: T) => string | number;
  loading?: boolean;
  error?: string | null;
  empty?: string;
}) {
  return (
    <div className="overflow-auto">
      <table className="w-full border-collapse whitespace-nowrap text-left">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.header} className="border-b border-line px-3 py-4 text-[12px] font-semibold text-muted first:pl-0">
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="p-[45px] text-center text-muted">
                Loading…
              </td>
            </tr>
          ) : error ? (
            <tr>
              <td colSpan={columns.length} role="alert" className="p-[45px] text-center text-danger">
                {error}
              </td>
            </tr>
          ) : rows && rows.length > 0 ? (
            rows.map((row) => (
              <tr key={rowKey(row)}>
                {columns.map((c) => (
                  <td key={c.header} className={`border-b border-line px-3 py-4 align-middle first:pl-0 ${c.className ?? ''}`}>
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className="p-[45px] text-center text-faint">
                {empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
