import type { ReactNode } from 'react'

export interface Column<Row> {
  header: string
  cell: (row: Row) => ReactNode
  /** Mono font, for numbers, phones and codes. */
  mono?: boolean
  /** Hidden header text for a column with only buttons. */
  headerHidden?: boolean
}

interface DataTableProps<Row> {
  caption: string
  columns: Column<Row>[]
  rows: Row[]
  getRowKey: (row: Row) => string | number
}

/** The box scrolls sideways when the table is wider than the screen. */
export function DataTable<Row>({ caption, columns, rows, getRowKey }: DataTableProps<Row>) {
  return (
    <div className="overflow-x-auto border border-rule bg-panel">
      <table className="w-full min-w-[760px] border-collapse text-left text-[13.5px]">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.header}
                scope="col"
                className="px-4 py-3 font-mono text-[11px] font-normal tracking-[0.08em] text-ink-soft uppercase"
              >
                {column.headerHidden ? (
                  <span className="sr-only">{column.header}</span>
                ) : (
                  column.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={getRowKey(row)} className="border-t border-rule">
              {columns.map((column) => (
                <td
                  key={column.header}
                  className={`px-4 py-3 ${column.mono ? 'font-mono text-[12.5px] text-ink-soft' : ''}`}
                >
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
