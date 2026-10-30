import type { ReactNode } from 'react';

export type DataColumn<T> = {
  key: string;
  header: string;
  align?: 'left' | 'right';
  render: (row: T) => ReactNode;
};

export function DataList<T extends { id: string }>({
  columns,
  rows,
  empty,
}: {
  columns: DataColumn<T>[];
  rows: T[];
  empty?: ReactNode;
}) {
  if (rows.length === 0) return <>{empty}</>;
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="ds-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={col.align === 'right' ? 'num' : undefined}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {columns.map((col) => (
                <td key={col.key} className={col.align === 'right' ? 'num ds-money' : undefined}>{col.render(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
