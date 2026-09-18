import type { ReactNode } from "react";

export interface TableColumn {
  key: string;
  label: string;
  align?: "start" | "end";
  width?: string;
}

interface DataTableProps {
  columns: TableColumn[];
  caption: string;
  children: ReactNode;
}

/** Table on wide screens; CSS restacks each row into a labelled record on phones. */
export function DataTable({ columns, caption, children }: DataTableProps) {
  return (
    <div className="table-scroll">
      <table className="data-table">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                style={column.width ? { width: column.width } : undefined}
                className={column.align === "end" ? "align-end" : undefined}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
