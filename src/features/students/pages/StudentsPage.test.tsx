import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { renderApp, saveLogin, sampleUserIds } from '@/test/utils'

async function openStudents(path = '/students', userId: number = sampleUserIds.owner) {
  saveLogin(userId)
  const view = renderApp(path)
  await screen.findByRole('table', { name: 'Students' })
  return view
}

describe('Students page', () => {
  it('shows 25 students, the counts and the paging sentence', async () => {
    await openStudents()
    const table = screen.getByRole('table', { name: 'Students' })
    // One header row and 25 student rows.
    expect(within(table).getAllByRole('row')).toHaveLength(26)
    expect(screen.getByText(/students\.$/, { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText(/Showing/).textContent).toMatch(/^Showing 1 to 25 of \d+ students\.$/)
    expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled()
  })

  it('shows the phone as it comes from the server and the photo square', async () => {
    await openStudents('/students?q=Ishaan')
    const row = screen.getByText('Ishaan Sharma').closest('tr') as HTMLElement
    expect(within(row).getByText('98XXX XX340')).toBeInTheDocument()
    expect(within(row).getByText('A-2026-118')).toBeInTheDocument()
    expect(within(row).getByText('4 A')).toBeInTheDocument()
    expect(within(row).getByText('No bus')).toBeInTheDocument()
    expect(within(row).getByText('IS')).toBeInTheDocument()
  })

  it('shows the photo of a student who has one', async () => {
    await openStudents('/students?q=Aryan')
    const row = screen.getByText('Aryan Punia').closest('tr') as HTMLElement
    expect(
      await within(row).findByRole('img', { name: 'Photo of Aryan Punia' }),
    ).toBeInTheDocument()
    expect(within(row).getByText('Route 4 · Jakhal')).toBeInTheDocument()
  })

  it('filtersAreKeptInTheUrl', async () => {
    const { router } = await openStudents('/students?village=Jakhal&page=1')
    // The filter comes from the address.
    expect(screen.getByLabelText('Village')).toHaveValue('Jakhal')
    const table = screen.getByRole('table', { name: 'Students' })
    expect(within(table).getAllByText('Jakhal').length).toBeGreaterThan(0)

    // A new choice goes to the address and starts again at page 1.
    await userEvent.selectOptions(screen.getByLabelText('Class'), 'UKG')
    await waitFor(() => expect(router.state.location.search).toBe('?className=UKG&village=Jakhal'))
    await userEvent.selectOptions(screen.getByLabelText('Bus'), 'Uses the bus')
    await waitFor(() =>
      expect(router.state.location.search).toBe('?className=UKG&bus=YES&village=Jakhal'),
    )
  })

  it('opens page 2 from the address and moves with Next and Back', async () => {
    const { router } = await openStudents('/students')
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    await waitFor(() => expect(router.state.location.search).toBe('?page=2'))
    await waitFor(() =>
      expect(screen.getByText(/Showing/).textContent).toMatch(/^Showing 26 to \d+ of \d+ students/),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Back' }))
    await waitFor(() => expect(router.state.location.search).toBe(''))
  })

  it('filters by one route from the Bus list', async () => {
    const { router } = await openStudents('/students')
    const bus = screen.getByLabelText('Bus')
    await within(bus).findByRole('option', { name: 'Route 4' })
    await userEvent.selectOptions(bus, 'Route 4')
    await waitFor(() => expect(router.state.location.search).toBe('?bus=4'))
    await waitFor(() => {
      const rows = within(screen.getByRole('table', { name: 'Students' })).getAllByRole('row')
      expect(rows.length).toBeGreaterThan(1)
      for (const row of rows.slice(1))
        expect(within(row).getByText(/^Route 4 · /)).toBeInTheDocument()
    })
  })

  it('searchWaitsBeforeCallingTheServer', async () => {
    let calls = 0
    server.use(
      http.get('http://localhost:3000/api/v1/students', ({ request }) => {
        calls += 1
        const q = new URL(request.url).searchParams.get('q')
        return HttpResponse.json({
          items: [],
          page: 1,
          pageSize: 25,
          total: 0,
          usesBus: 0,
          noBus: 0,
          villages: [q ?? ''],
        })
      }),
    )
    saveLogin(sampleUserIds.owner)
    const { router } = renderApp('/students')
    await screen.findByText('No students yet')
    expect(calls).toBe(1)

    await userEvent.type(screen.getByLabelText(/Search by name/), 'ish')
    // Three keys, and nothing was asked yet.
    expect(calls).toBe(1)
    expect(router.state.location.search).toBe('')
    // 300 ms after the last key, one question and the address changes.
    await waitFor(() => expect(router.state.location.search).toBe('?q=ish'), { timeout: 1500 })
    await waitFor(() => expect(calls).toBe(2))
    expect(screen.getByLabelText(/Search by name/)).toHaveValue('ish')
  })

  it('keeps the search text after a reload', async () => {
    await openStudents('/students?q=Ishaan')
    expect(screen.getByLabelText(/Search by name/)).toHaveValue('Ishaan')
    const table = screen.getByRole('table', { name: 'Students' })
    expect(within(table).getAllByRole('row')).toHaveLength(2)
  })

  it('shows an empty state with a way back when nothing matches', async () => {
    saveLogin(sampleUserIds.owner)
    const { router } = renderApp('/students?q=zzzzzz')
    expect(await screen.findByText('No student matches')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Clear the filters' }))
    await waitFor(() => expect(router.state.location.search).toBe(''))
    await screen.findByRole('table', { name: 'Students' })
  })

  it('shows an error with Retry, then the list', async () => {
    let fail = true
    server.use(
      http.get('http://localhost:3000/api/v1/students', () =>
        fail
          ? HttpResponse.json({ error: 'SERVER', message: 'boom' }, { status: 500 })
          : HttpResponse.json({
              items: [],
              page: 1,
              pageSize: 25,
              total: 0,
              usesBus: 0,
              noBus: 0,
              villages: [],
            }),
      ),
    )
    saveLogin(sampleUserIds.owner)
    renderApp('/students')
    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong')
    fail = false
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByText('No students yet')).toBeInTheDocument()
  })

  it('shows a loading state first', async () => {
    server.use(
      http.get('http://localhost:3000/api/v1/students', async () => {
        await delay(150)
        return HttpResponse.json({
          items: [],
          page: 1,
          pageSize: 25,
          total: 0,
          usesBus: 0,
          noBus: 0,
          villages: [],
        })
      }),
    )
    saveLogin(sampleUserIds.owner)
    renderApp('/students')
    // The page is there (the log-in check has its own "Loading…"), and its list is still loading.
    await screen.findByLabelText(/Search by name/)
    expect(within(screen.getByLabelText('Student list')).getByText('Loading…')).toBeInTheDocument()
    expect(await screen.findByText('No students yet')).toBeInTheDocument()
  })

  it('hides New admission from a role that cannot admit', async () => {
    await openStudents('/students', sampleUserIds.transport)
    expect(screen.queryByRole('link', { name: 'New admission' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Import from a sheet' })).not.toBeInTheDocument()
  })

  it('shows New admission to the admissions desk', async () => {
    await openStudents('/students', sampleUserIds.admissions)
    // One link in the menu and one on the page.
    const links = screen.getAllByRole('link', { name: 'New admission' })
    expect(links).toHaveLength(2)
    for (const link of links) expect(link).toHaveAttribute('href', '/admissions/new')
  })

  it('opens a student from the Open link', async () => {
    const { router } = await openStudents('/students?q=Ishaan')
    await userEvent.click(screen.getByRole('link', { name: 'Open Ishaan Sharma' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/students/1'))
  })
})

describe('Students page: the Fee column', () => {
  const cell = (name: string, column: number) => {
    const row = screen.getByText(name).closest('tr') as HTMLElement
    return within(row).getAllByRole('cell')[column] as HTMLElement
  }

  it('studentsListShowsFeeStatus: On time, Delayed and Defaulted, each with its words', async () => {
    await openStudents('/students?q=Rohit')
    const table = screen.getByRole('table', { name: 'Students' })
    expect(within(table).getByRole('columnheader', { name: 'Fee' })).toBeInTheDocument()
    expect(cell('Rohit Kumar', 6)).toHaveTextContent('Defaulted')

    await userEvent.clear(screen.getByRole('searchbox'))
    await userEvent.type(screen.getByRole('searchbox'), 'Mohit')
    await screen.findByText('Mohit Nain')
    await waitFor(() => expect(cell('Mohit Nain', 6)).toHaveTextContent('Delayed'))

    await userEvent.clear(screen.getByRole('searchbox'))
    await userEvent.type(screen.getByRole('searchbox'), 'Ishaan')
    await screen.findByText('Ishaan Sharma')
    await waitFor(() => expect(cell('Ishaan Sharma', 6)).toHaveTextContent('On time'))
  })

  it('shows a dash for a child with no fee plan', async () => {
    // Child 13 has no plan in the sample. Search by name from the list.
    await openStudents('/students?page=1')
    const rows = within(screen.getByRole('table', { name: 'Students' }))
      .getAllByRole('row')
      .slice(1)
    const dashRows = rows.filter((r) => within(r).queryByText('No fee plan'))
    expect(dashRows.length).toBeGreaterThan(0)
    expect(dashRows[0]).not.toHaveTextContent('On time')
  })

  it('has no Fee column for a role without FEES_VIEW', async () => {
    await openStudents('/students', sampleUserIds.transport)
    const table = screen.getByRole('table', { name: 'Students' })
    expect(within(table).queryByRole('columnheader', { name: 'Fee' })).not.toBeInTheDocument()
    expect(within(table).queryByText('On time')).not.toBeInTheDocument()
  })
})
