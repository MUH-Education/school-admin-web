import { formatTime } from '@/lib/format'
import { DataTable, type Column } from '@/ui/DataTable'
import { eventLabels } from '../labels'
import type { Message } from '../types'
import { MessageStatusCell } from './MessageStatusCell'

const columns: Column<Message>[] = [
  { header: 'Time', mono: true, cell: (m) => formatTime(m.createdAt) },
  { header: 'Child', cell: (m) => <span className="font-semibold">{m.studentName}</span> },
  // The server hides the phone. It is shown as it comes and never logged.
  { header: 'Phone', mono: true, cell: (m) => m.phone },
  { header: 'Event', cell: (m) => eventLabels[m.event] },
  {
    header: 'Text',
    cell: (m) => <span className="block max-w-[340px] font-hindi">{m.text}</span>,
  },
  { header: 'Status', cell: (m) => <MessageStatusCell message={m} /> },
]

export function MessagesTable({ rows }: { rows: Message[] }) {
  return (
    <DataTable
      caption="Messages"
      columns={columns}
      rows={rows}
      getRowKey={(message) => message.id}
    />
  )
}
