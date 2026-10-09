import type { BusChildRow } from '../types'
import { EventCell } from './EventCell'

/** Same columns as BusDetail.dc.html: three that stretch, four events of 96px, SMS last. */
const GRID =
  'grid gap-x-4 px-4 [grid-template-columns:minmax(130px,1.3fr)_64px_minmax(110px,1fr)_96px_96px_96px_96px_minmax(200px,1.6fr)]'

const headers = [
  'Child',
  'Class',
  'Stop',
  'Boarded morning',
  'Reached school',
  'Boarded evening',
  'Reached home',
  'SMS to parent',
]

/**
 * Every child of the route with the four events of the day. It is a table for screen readers
 * (ARIA roles) and a grid on the screen, so the columns have the widths of the design.
 */
export function ChildrenTable({ rows }: { rows: BusChildRow[] }) {
  return (
    <div className="overflow-x-auto border border-rule bg-panel">
      <div role="table" aria-label="Children on this route" className="min-w-[940px]">
        <div role="row" className={`${GRID} items-end py-3`}>
          {headers.map((header) => (
            <div
              key={header}
              role="columnheader"
              className="font-mono text-[11px] tracking-[0.08em] text-ink-soft uppercase"
            >
              {header}
            </div>
          ))}
        </div>
        {rows.map((child) => (
          <div
            key={child.studentId}
            role="row"
            className={`${GRID} items-center border-t border-rule py-[11px] text-[13.5px]`}
          >
            <div role="cell" className="font-semibold">
              {child.name}
            </div>
            <div role="cell" className="font-mono text-[12.5px]">
              {child.className}
            </div>
            <div role="cell">{child.stop}</div>
            <div role="cell">
              <EventCell event={child.events.boardedMorning} />
            </div>
            <div role="cell">
              <EventCell event={child.events.reachedSchool} />
            </div>
            <div role="cell">
              <EventCell event={child.events.boardedEvening} />
            </div>
            <div role="cell">
              <EventCell event={child.events.reachedHome} />
            </div>
            {/* Filled in web phase 6 (Messages). The column is here so the table keeps its shape. */}
            <div role="cell" className="text-[12.5px] text-ink-soft" />
          </div>
        ))}
      </div>
    </div>
  )
}
