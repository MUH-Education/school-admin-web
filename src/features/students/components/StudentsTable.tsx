import { Link } from 'react-router'
import { usePermissions } from '@/auth/usePermissions'
import { feeStatusTone } from '@/features/fees/labels'
import { feeStatusLabels } from '@/features/fees/types'
import { DataTable, type Column } from '@/ui/DataTable'
import { StatusDot } from '@/ui/StatusDot'
import { classAndSection } from '../labels'
import type { StudentListRow } from '../types'
import { StudentPhoto } from './StudentPhoto'

const firstColumns: Column<StudentListRow>[] = [
  {
    header: 'Photo',
    headerHidden: true,
    cell: (s) => <StudentPhoto id={s.id} name={s.name} hasPhoto={s.hasPhoto} size="small" />,
  },
  {
    header: 'Student',
    cell: (s) => (
      <div className="flex min-w-0 flex-col gap-px">
        <span className="font-semibold">{s.name}</span>
        <span className="font-mono text-xs text-ink-soft">{s.admissionNo}</span>
      </div>
    ),
  },
  {
    header: 'Class',
    cell: (s) => (
      <span className="font-mono text-[12.5px]">{classAndSection(s.className, s.section)}</span>
    ),
  },
  { header: 'Village', cell: (s) => s.village },
  {
    header: 'Bus',
    cell: (s) =>
      s.usesBus && s.route ? (
        `${s.route}${s.stop ? ` · ${s.stop}` : ''}`
      ) : (
        <span className="text-ink-soft">No bus</span>
      ),
  },
  { header: 'Parent phone', cell: (s) => s.parentPhone ?? '', mono: true },
]

/** The worst fee status of the year: a square and words. A dash: the child has no fee plan. */
const feeColumn: Column<StudentListRow> = {
  header: 'Fee',
  cell: (s) =>
    s.feeStatus ? (
      <StatusDot tone={feeStatusTone[s.feeStatus]} plain>
        {feeStatusLabels[s.feeStatus]}
      </StatusDot>
    ) : (
      <span className="text-ink-soft">
        <span aria-hidden="true">–</span>
        <span className="sr-only">No fee plan</span>
      </span>
    ),
}

const openColumn: Column<StudentListRow> = {
  header: 'Open',
  headerHidden: true,
  cell: (s) => (
    <Link
      to={`/students/${s.id}`}
      aria-label={`Open ${s.name}`}
      className="font-semibold text-canal underline"
    >
      Open
    </Link>
  ),
}

export function StudentsTable({ rows }: { rows: StudentListRow[] }) {
  // The Fee column is for people who may see fees. The server also leaves the status out for the others.
  const showFee = usePermissions().can('FEES_VIEW')
  const columns = showFee ? [...firstColumns, feeColumn, openColumn] : [...firstColumns, openColumn]
  return <DataTable caption="Students" columns={columns} rows={rows} getRowKey={(row) => row.id} />
}
