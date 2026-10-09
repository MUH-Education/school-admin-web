import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp, saveLogin, sampleUserIds } from '@/test/utils'

async function openAnalytics(path = '/analytics') {
  saveLogin(sampleUserIds.owner)
  const view = renderApp(path)
  await screen.findByRole('table', { name: 'Students and families' })
  return view
}

const table = () => screen.getByRole('table', { name: 'Students and families' })
const dataRows = () => within(table()).getAllByRole('row').slice(1)
/** "Showing 1 to 25 of 62 students." : the numbers sit in their own spans, so read the whole line. */
const pagingLine = () =>
  screen.getByRole('navigation', { name: 'Pages' }).querySelector('p')?.textContent ?? ''
const firstColumn = () =>
  dataRows().map((row) => within(row).getAllByRole('cell')[0]?.textContent ?? '')

describe('Analytics list', () => {
  it('shows the eight columns of the design and 25 students to a page', async () => {
    await openAnalytics()
    const headers = within(table())
      .getAllByRole('columnheader')
      .map((h) => h.textContent?.replace(/\s*[↑↓]$/, ''))
    expect(headers).toEqual([
      'Student',
      'Class',
      'Village',
      "Father's occupation",
      'Bus',
      'School fee',
      'Bus fee',
      'Pending',
    ])
    expect(dataRows()).toHaveLength(25)
    expect(pagingLine()).toMatch(/^Showing 1 to 25 of \d+ students\.$/)
    expect(
      screen.getByText(/^Showing 25 of \d+\. Click a column name to sort\.$/),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled()
  })

  it('opens with the biggest debt on top, in rupees', async () => {
    await openAnalytics()
    const money = dataRows().map((row) => within(row).getAllByRole('cell')[7]?.textContent ?? '')
    expect(money[0]).toMatch(/^₹\d/)
    expect(money[0]).not.toBe('₹0')
    expect(money.at(-1)).toBe('₹0')
    const asNumber = money.map((m) => Number(m.replace(/[₹,]/g, '')))
    expect(asNumber).toEqual([...asNumber].sort((a, b) => b - a))
    expect(within(table()).getByRole('columnheader', { name: /Pending/ })).toHaveAttribute(
      'aria-sort',
      'descending',
    )
  })

  it('shows every fee status as a square and words, and a dash with a reason when there is none', async () => {
    await openAnalytics('/analytics?bus=NO')
    const cells = dataRows().flatMap((row) => within(row).getAllByRole('cell').slice(5, 7))
    expect(cells.some((c) => /On time|Delayed|Defaulted/.test(c.textContent ?? ''))).toBe(true)
    // Nobody here has a bus, so no bus fee: a dash that screen readers read as words.
    const busCell = within(dataRows()[0] as HTMLElement).getAllByRole('cell')[6] as HTMLElement
    expect(busCell).toHaveTextContent('No bus fee')
    expect(busCell.querySelector('[aria-hidden="true"]')).not.toBeNull()
    expect(within(dataRows()[0] as HTMLElement).getAllByRole('cell')[4]).toHaveTextContent('No bus')
  })

  it('sortIsWrittenToTheUrl', async () => {
    const { router } = await openAnalytics('/analytics?page=2')
    await userEvent.click(within(table()).getByRole('button', { name: 'Student' }))
    await waitFor(() => expect(router.state.location.search).toBe('?sort=name&dir=asc'))
    await waitFor(() => {
      const names = firstColumn()
      expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)))
    })
    expect(within(table()).getByRole('columnheader', { name: /Student/ })).toHaveAttribute(
      'aria-sort',
      'ascending',
    )

    await userEvent.click(within(table()).getByRole('button', { name: /Student/ }))
    await waitFor(() => expect(router.state.location.search).toBe('?sort=name&dir=desc'))

    await userEvent.click(within(table()).getByRole('button', { name: 'Class' }))
    await waitFor(() => expect(router.state.location.search).toBe('?sort=class&dir=asc'))
    await waitFor(() =>
      expect(within(dataRows()[0] as HTMLElement).getAllByRole('cell')[1]).toHaveTextContent(
        /^Nur/,
      ),
    )

    // Pending starts with the biggest debt, which is the first order: nothing is written.
    await userEvent.click(within(table()).getByRole('button', { name: 'Pending' }))
    await waitFor(() => expect(router.state.location.search).toBe(''))
  }, 20000)

  it('reads the sort from the address, and moves with Next and Back', async () => {
    const { router } = await openAnalytics('/analytics?sort=name&dir=asc')
    const first = firstColumn()
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    await waitFor(() => expect(router.state.location.search).toBe('?sort=name&dir=asc&page=2'))
    await waitFor(() => expect(pagingLine()).toMatch(/^Showing 26 to \d+ of \d+ students\.$/))
    expect(firstColumn()[0]).not.toBe(first[0])
    await userEvent.click(screen.getByRole('button', { name: 'Back' }))
    await waitFor(() => expect(router.state.location.search).toBe('?sort=name&dir=asc'))
  })

  it('goes back to page 1 when a filter changes', async () => {
    const { router } = await openAnalytics('/analytics?page=2')
    await userEvent.selectOptions(screen.getByLabelText('Village'), 'Jakhal')
    await waitFor(() => expect(router.state.location.search).toBe('?village=Jakhal'))
    await waitFor(() => expect(dataRows().length).toBeGreaterThan(0))
    for (const row of dataRows())
      expect(within(row).getAllByRole('cell')[2]).toHaveTextContent('Jakhal')
  })

  it('shows a message and a Clear filters button when nobody matches', async () => {
    saveLogin(sampleUserIds.owner)
    renderApp('/analytics?village=Jakhal&feeStatus=DELAYED')
    const box = await screen.findByText('Try other filters, or clear them.')
    expect(box).toBeInTheDocument()
    expect(screen.queryByRole('table', { name: 'Students and families' })).not.toBeInTheDocument()
  })

  it('shows the same number of students in the count line, the tile, the class bars and the table', async () => {
    const paths = [
      '/analytics',
      '/analytics?village=Jakhal',
      '/analytics?feeStatus=DELAYED',
      '/analytics?bus=NO',
      '/analytics?className=UKG&bus=YES',
      '/analytics?occupation=FARMER_LARGE&feeStatus=DEFAULTED',
      '/analytics?session=2',
    ]
    for (const path of paths) {
      const { unmount } = await openAnalytics(path).catch(async () => {
        // An empty table has no <table>; the page is still there.
        return renderApp(path)
      })
      const line = await screen.findByText(/^Showing (all )?\d+( of \d+)? students?\.$/)
      const n = Number(/Showing (?:all )?(\d+)/.exec(line.textContent ?? '')?.[1])

      const tile = screen.getByText('Students', { selector: 'div' }).nextElementSibling
      await waitFor(() => expect(tile?.textContent, path).toBe(String(n)))

      const classes = screen.getByRole('region', { name: 'Students in each class' })
      await waitFor(() => expect(classes.querySelectorAll('[title]')).toHaveLength(15))
      const bars = [...classes.querySelectorAll('[title]')].reduce(
        (sum, bar) => sum + Number(/: (\d+) student/.exec(bar.getAttribute('title') ?? '')?.[1]),
        0,
      )
      expect(bars, path).toBe(n)

      if (n === 0) {
        await screen.findByText('Try other filters, or clear them.')
      } else {
        await screen.findByRole('navigation', { name: 'Pages' })
        expect(Number(/of (\d+) students/.exec(pagingLine())?.[1]), path).toBe(n)
        await waitFor(() =>
          expect(screen.getByText(/^Showing \d+ of \d+\. Click/).textContent, path).toContain(
            ` of ${n}.`,
          ),
        )
      }
      unmount()
    }
  }, 40000)
})
