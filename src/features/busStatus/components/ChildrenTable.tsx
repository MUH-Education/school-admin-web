import { DataTable, type Column } from '@/ui/DataTable'
import type { BusChildRow } from '../types'
import { EventCell } from './EventCell'

const columns: Column<BusChildRow>[] = [
  { header: 'Child', cell: (c) => <span className="font-semibold">{c.name}</span> },
  { header: 'Class', cell: (c) => <span className="font-mono text-[12.5px]">{c.className}</span> },
  { header: 'Stop', cell: (c) => c.stop },
  { header: 'Boarded morning', cell: (c) => <EventCell event={c.events.boardedMorning} /> },
  { header: 'Reached school', cell: (c) => <EventCell event={c.events.reachedSchool} /> },
  { header: 'Boarded evening', cell: (c) => <EventCell event={c.events.boardedEvening} /> },
  { header: 'Reached home', cell: (c) => <EventCell event={c.events.reachedHome} /> },
  // Filled in web phase 6 (Messages). The column is here so the table keeps its final shape.
  { header: 'SMS to parent', cell: () => null },
]

/** Every child of the route with the four events of the day. */
export function ChildrenTable({ rows }: { rows: BusChildRow[] }) {
  return (
    <DataTable
      caption="Children on this route"
      columns={columns}
      rows={rows}
      getRowKey={(c) => c.studentId}
    />
  )
}
