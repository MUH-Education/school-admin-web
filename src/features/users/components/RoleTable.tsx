import { roleHints, roleLabels } from '@/auth/roles'
import type { Permission } from '@/auth/types'
import type { Role } from '../types'

type Level = 'full' | 'view' | 'own' | 'none'

interface PageRow {
  page: string
  hint: string
  /** The permission that lets the role open the page. */
  open: Permission
  /** The permission that lets the role change things. Missing: opening is already "Full". */
  full?: Permission
  /** The page only shows data. */
  viewOnly?: boolean
}

/** The pages shown in the table. What each role may do comes from GET /roles. */
const pages: PageRow[] = [
  {
    page: 'Bus status',
    hint: 'Where each bus is today',
    open: 'BUS_STATUS_VIEW',
    full: 'TRIPS_RECORD_ANY',
  },
  {
    page: 'Routes and load',
    hint: 'Seats, children and cost per route',
    open: 'ROUTES_VIEW',
    full: 'ROUTES_EDIT',
  },
  {
    page: 'Vehicles and staff',
    hint: 'Vehicles, drivers, attendants, papers',
    open: 'VEHICLES_VIEW',
    full: 'VEHICLES_EDIT',
  },
  {
    page: 'Students',
    hint: 'Details, photo, parents, bus route',
    open: 'STUDENTS_VIEW',
    full: 'STUDENTS_EDIT',
  },
  { page: 'Messages', hint: 'Every SMS sent to parents', open: 'MESSAGES_VIEW', viewOnly: true },
  {
    page: 'Enquiries',
    hint: 'Parents asking about admission',
    open: 'ENQUIRIES_VIEW',
    full: 'ENQUIRIES_EDIT',
  },
  {
    page: 'New admission and fees',
    hint: 'Student, family and fee details',
    open: 'ADMISSIONS_CREATE',
  },
  {
    page: 'Analytics',
    hint: 'Fee and family graphs, with filters',
    open: 'ANALYTICS_VIEW',
    viewOnly: true,
  },
  { page: 'Users and roles', hint: 'This page', open: 'USERS_MANAGE' },
  {
    page: 'Trip screen on phone',
    hint: 'Tapping children on the bus',
    open: 'TRIPS_RECORD',
    full: 'TRIPS_RECORD_ANY',
  },
]

function levelOf(role: Role, row: PageRow): Level {
  if (!role.permissions.includes(row.open)) return 'none'
  if (row.viewOnly) return 'view'
  if (!row.full || role.permissions.includes(row.full)) return 'full'
  return row.open === 'TRIPS_RECORD' ? 'own' : 'view'
}

const words: Record<Level, string> = {
  full: 'Full',
  view: 'View',
  own: 'Own route only',
  none: '—',
}

function Cell({ level }: { level: Level }) {
  return (
    <td className={`px-4 py-3 ${level === 'none' ? 'text-ink-soft' : ''}`}>
      <span className="inline-flex items-center gap-[7px]">
        {level !== 'none' && (
          <span
            aria-hidden="true"
            className={`size-2.5 flex-none border-2 border-canal ${level === 'full' ? 'bg-canal' : 'bg-panel'}`}
          />
        )}
        {words[level]}
      </span>
    </td>
  )
}

export function RoleTable({ roles }: { roles: Role[] }) {
  return (
    <section aria-label="What each role can do" className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h2 className="text-[15px] font-semibold">What each role can do</h2>
        <div className="flex flex-wrap gap-x-[18px] gap-y-1.5 text-[12.5px] text-ink-soft">
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2.5 bg-canal" />
            Full: see and change
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2.5 border-2 border-canal bg-panel" />
            View: see only
          </span>
          <span>— : cannot open</span>
        </div>
      </div>
      <div className="overflow-x-auto border border-rule bg-panel">
        <table className="w-full min-w-[900px] border-collapse text-left text-[13.5px]">
          <caption className="sr-only">What each role can do</caption>
          <thead>
            <tr className="border-b-2 border-ink align-bottom">
              <th
                scope="col"
                className="px-4 py-3.5 font-mono text-[11px] font-normal tracking-[0.08em] text-ink-soft uppercase"
              >
                Page
              </th>
              {roles.map((role) => (
                <th key={role.role} scope="col" className="px-4 py-3.5 font-normal">
                  <div className="text-sm font-semibold">{roleLabels[role.role]}</div>
                  <div className="text-xs text-ink-soft">{roleHints[role.role]}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pages.map((row) => (
              <tr key={row.page} className="border-t border-rule">
                <th scope="row" className="px-4 py-3 text-left font-normal">
                  <div className="font-semibold">{row.page}</div>
                  <div className="text-xs text-ink-soft">{row.hint}</div>
                </th>
                {roles.map((role) => (
                  <Cell key={role.role} level={levelOf(role, row)} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
