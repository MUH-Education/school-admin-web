import { Link } from 'react-router'
import { formatDayMonth } from '@/lib/format'
import { DataTable, type Column } from '@/ui/DataTable'
import { StatusDot } from '@/ui/StatusDot'
import { nextStepText, shortClass, statusTones } from '../labels'
import { statusLabels, sourceLabels, type EnquiryRow } from '../types'

const columns: Column<EnquiryRow>[] = [
  { header: 'Date', cell: (e) => formatDayMonth(e.createdOn), mono: true },
  { header: 'Parent', cell: (e) => <span className="font-semibold">{e.parentName}</span> },
  { header: 'Phone', cell: (e) => e.phone, mono: true },
  { header: 'Village', cell: (e) => e.village },
  {
    header: 'Class',
    cell: (e) => <span className="font-mono text-[12.5px]">{shortClass(e.className)}</span>,
  },
  { header: 'Source', cell: (e) => sourceLabels[e.source] },
  {
    header: 'Status',
    cell: (e) => (
      <StatusDot tone={statusTones[e.status]} inkText>
        {statusLabels[e.status]}
      </StatusDot>
    ),
  },
  {
    header: 'Next step',
    cell: (e) => {
      const next = nextStepText(e)
      return (
        <span
          className={`block text-[13.5px] ${
            next.overdue ? 'font-semibold text-bad' : next.empty ? 'text-ink-soft' : ''
          }`}
        >
          {next.text}
        </span>
      )
    },
  },
  {
    header: 'Open',
    headerHidden: true,
    cell: (e) => (
      <Link
        to={`/enquiries/${e.id}`}
        aria-label={`Open the enquiry of ${e.parentName}`}
        className="text-canal underline"
      >
        Open
      </Link>
    ),
  },
]

/** The columns of Enquiries.dc.html. */
const grid = {
  columns:
    '64px minmax(150px, 1.3fr) 120px minmax(100px, 1fr) 76px minmax(96px, 0.9fr) 112px minmax(170px, 1.4fr) 52px',
  minWidth: 940,
}

export function EnquiriesTable({ rows }: { rows: EnquiryRow[] }) {
  return (
    <DataTable
      caption="Enquiries"
      columns={columns}
      rows={rows}
      getRowKey={(row) => row.id}
      grid={grid}
    />
  )
}
