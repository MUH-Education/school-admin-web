import { useState } from 'react'
import { usePermissions } from '@/auth/usePermissions'
import { useRoutes } from '@/features/routes/api'
import { sessionLabel } from '@/lib/format'
import { Button } from '@/ui/Button'
import { EmptyState } from '@/ui/EmptyState'
import { ErrorState } from '@/ui/ErrorState'
import { FilterBar, FilterField, filterInputClass } from '@/ui/FilterBar'
import { LinkButton } from '@/ui/LinkButton'
import { LoadingBlock } from '@/ui/LoadingBlock'
import { PageHeader } from '@/ui/PageHeader'
import { Pagination } from '@/ui/Pagination'
import { Select } from '@/ui/Select'
import { TextInput } from '@/ui/TextInput'
import { useStudents } from '../api'
import { ImportDialog } from '../components/ImportDialog'
import { StudentsTable } from '../components/StudentsTable'
import { classNames } from '../types'
import { useStudentFilters } from './useStudentFilters'

export function StudentsPage() {
  const { can } = usePermissions()
  const controls = useStudentFilters()
  const { filters } = controls
  const students = useStudents(filters)
  const routes = useRoutes()
  const [importing, setImporting] = useState(false)

  const page = students.data
  const summary = page && (
    <>
      <strong>
        {page.total} {page.total === 1 ? 'student' : 'students'}.
      </strong>{' '}
      <span className="text-ink-soft">
        {page.usesBus} use the bus. {page.noBus} {page.noBus === 1 ? 'does' : 'do'} not.
      </span>
    </>
  )

  return (
    <>
      <PageHeader
        label={`Admissions · Session ${sessionLabel()}`}
        title="Students"
        description="Find a student, then open them to change anything: photo, parents' numbers, bus route or class."
        action={
          <div className="flex flex-wrap gap-2.5">
            {can('STUDENTS_EDIT') && (
              <Button variant="secondary" onClick={() => setImporting(true)}>
                Import from a sheet
              </Button>
            )}
            {can('ADMISSIONS_CREATE') && (
              <LinkButton to="/admissions/new">New admission</LinkButton>
            )}
          </div>
        }
      />

      <FilterBar label="Find a student" summary={summary}>
        <FilterField label="Search by name, admission number or phone" wide>
          <TextInput
            type="search"
            className={filterInputClass}
            placeholder="e.g. Ishaan, A-2026-118 or 98120"
            value={controls.searchText}
            onChange={(event) => controls.typeSearch(event.target.value)}
          />
        </FilterField>
        <FilterField label="Class">
          <Select
            className={filterInputClass}
            value={filters.className}
            onChange={(event) => controls.setFilter('className', event.target.value)}
          >
            <option value="">All classes</option>
            {classNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </Select>
        </FilterField>
        <FilterField label="Bus">
          <Select
            className={filterInputClass}
            value={filters.bus}
            onChange={(event) => controls.setFilter('bus', event.target.value)}
          >
            <option value="">All students</option>
            <option value="YES">Uses the bus</option>
            <option value="NO">No bus</option>
            {(routes.data ?? []).map((route) => (
              <option key={route.id} value={String(route.id)}>
                {route.name}
              </option>
            ))}
          </Select>
        </FilterField>
        <FilterField label="Village">
          <Select
            className={filterInputClass}
            value={filters.village}
            onChange={(event) => controls.setFilter('village', event.target.value)}
          >
            <option value="">All villages</option>
            {/* The chosen village stays on the list even while the answer is loading. */}
            {[
              ...new Set([
                ...(page?.villages ?? []),
                ...(filters.village ? [filters.village] : []),
              ]),
            ]
              .sort((a, b) => a.localeCompare(b))
              .map((village) => (
                <option key={village} value={village}>
                  {village}
                </option>
              ))}
          </Select>
        </FilterField>
      </FilterBar>

      <section aria-label="Student list" className="flex flex-col gap-2.5">
        {students.isPending ? (
          <LoadingBlock />
        ) : students.isError ? (
          <ErrorState error={students.error} onRetry={() => void students.refetch()} />
        ) : page && page.total === 0 ? (
          <EmptyState
            title={controls.anyFilter ? 'No student matches' : 'No students yet'}
            hint={
              controls.anyFilter
                ? 'Try a shorter search, or clear the filters.'
                : 'Add the first student with New admission.'
            }
            action={
              controls.anyFilter ? (
                <Button variant="plain" onClick={controls.clear}>
                  Clear the filters
                </Button>
              ) : undefined
            }
          />
        ) : (
          page && (
            <>
              <StudentsTable rows={page.items} />
              <Pagination
                page={page.page}
                pageSize={page.pageSize}
                total={page.total}
                noun="students"
                onPage={controls.setPage}
              />
              <p className="text-[12.5px] text-ink-soft">
                The square shows the first letters of the name until a photo is added.
              </p>
            </>
          )
        )}
      </section>
      <ImportDialog open={importing} onClose={() => setImporting(false)} />
    </>
  )
}
