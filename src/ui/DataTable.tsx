import type { ReactNode } from 'react'

export interface Column<Row> {
  header: string
  cell: (row: Row) => ReactNode
  /** Mono font, for numbers, phones and codes. */
  mono?: boolean
  /** Hidden header text for a column with only buttons. */
  headerHidden?: boolean
  /** Right-aligned header and cells, for money. Only in the `grid` layout. */
  align?: 'right'
  /**
   * Makes the column name a button that sorts. `direction` is the order now (null: the table is
   * sorted by another column). The header says it for screen readers with `aria-sort`.
   */
  sort?: { direction: 'asc' | 'desc' | null; onSort: () => void }
}

/** A roomy layout like the Enquiry list design: fixed and flexible columns in a CSS grid. */
export interface GridLayout {
  /** The grid-template-columns of every row, for example "64px minmax(150px, 1.3fr) 52px". */
  columns: string
  /** The box scrolls sideways below this width, in pixels. */
  minWidth: number
  /** CSS padding of the header row and of a body row. Without it: 14px above and below, 18px at the sides. */
  padding?: { header: string; row: string }
  /** The text size class of the rows. Default `text-[14px]`; the Analytics list uses `text-[13.5px]`. */
  textSize?: string
}

interface DataTableProps<Row> {
  caption: string
  columns: Column<Row>[]
  rows: Row[]
  getRowKey: (row: Row) => string | number
  /** Without it the table lays out by itself. */
  grid?: GridLayout
}

/** The box scrolls sideways when the table is wider than the screen. */
export function DataTable<Row>({ caption, columns, rows, getRowKey, grid }: DataTableProps<Row>) {
  if (grid)
    return (
      <GridTable
        caption={caption}
        columns={columns}
        rows={rows}
        getRowKey={getRowKey}
        grid={grid}
      />
    )
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

/** The same table with rows made of a CSS grid. The roles keep it a table for screen readers. */
function GridTable<Row>({
  caption,
  columns,
  rows,
  getRowKey,
  grid,
}: DataTableProps<Row> & { grid: GridLayout }) {
  const rowStyle = { gridTemplateColumns: grid.columns }
  return (
    <div className="overflow-x-auto border border-rule bg-panel">
      <table
        role="table"
        className={`block w-full text-left ${grid.textSize ?? 'text-[14px]'}`}
        style={{ minWidth: grid.minWidth }}
      >
        <caption className="sr-only">{caption}</caption>
        <thead role="rowgroup" className="block">
          <tr
            role="row"
            style={grid.padding ? { ...rowStyle, padding: grid.padding.header } : rowStyle}
            className={`grid items-end gap-x-4 ${grid.padding ? '' : 'px-[18px] py-3.5'}`}
          >
            {columns.map((column) => (
              <th
                key={column.header}
                role="columnheader"
                scope="col"
                aria-sort={ariaSort(column)}
                className={`block font-mono text-[11px] font-normal tracking-[0.08em] text-ink-soft uppercase ${column.align === 'right' ? 'text-right' : 'text-left'}`}
              >
                {column.headerHidden ? (
                  <span className="sr-only">{column.header}</span>
                ) : column.sort ? (
                  <SortButton column={column} sort={column.sort} />
                ) : (
                  column.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody role="rowgroup" className="block">
          {rows.map((row) => (
            <tr
              key={getRowKey(row)}
              role="row"
              style={grid.padding ? { ...rowStyle, padding: grid.padding.row } : rowStyle}
              className={`grid items-center gap-x-4 border-t border-rule ${grid.padding ? '' : 'px-[18px] py-3.5'}`}
            >
              {columns.map((column) => (
                <td
                  key={column.header}
                  role="cell"
                  className={`block ${column.align === 'right' ? 'text-right' : ''} ${column.mono ? 'font-mono text-[12.5px] text-ink-soft' : ''}`}
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

function ariaSort<Row>(column: Column<Row>): 'ascending' | 'descending' | 'none' | undefined {
  if (!column.sort) return undefined
  if (column.sort.direction === 'asc') return 'ascending'
  if (column.sort.direction === 'desc') return 'descending'
  return 'none'
}

/** The column name as a button. The arrow shows the order of the column that is sorted now. */
function SortButton<Row>({
  column,
  sort,
}: {
  column: Column<Row>
  sort: NonNullable<Column<Row>['sort']>
}) {
  return (
    <button
      type="button"
      onClick={sort.onSort}
      className={`cursor-pointer uppercase hover:text-ink hover:underline ${sort.direction ? 'text-ink' : ''}`}
    >
      {column.header}
      {sort.direction && <span aria-hidden="true"> {sort.direction === 'asc' ? '↑' : '↓'}</span>}
    </button>
  )
}
