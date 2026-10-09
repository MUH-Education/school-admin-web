import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { renderApp, saveLogin, sampleUserIds } from '@/test/utils'

async function openAnalytics(path = '/analytics', userId: number = sampleUserIds.owner) {
  saveLogin(userId)
  const view = renderApp(path)
  await screen.findByRole('heading', { name: 'Analytics', level: 1 })
  return view
}

const panel = (name: string) => screen.getByRole('region', { name })

/** The number in "Showing 37 of 290 students." or "Showing all 62 students." */
async function countLine(): Promise<number> {
  const line = await screen.findByText(/^Showing (all )?\d+( of \d+)? students?\.$/)
  return Number(/Showing (?:all )?(\d+)/.exec(line.textContent ?? '')?.[1])
}

/** The class bars have a title "UKG: 12 students". Adding them up gives the students. */
function classBarTotal(): number {
  return [...panel('Students in each class').querySelectorAll('[title]')].reduce(
    (sum, bar) => sum + Number(/: (\d+) student/.exec(bar.getAttribute('title') ?? '')?.[1]),
    0,
  )
}

async function loaded() {
  await waitFor(() =>
    expect(panel('Students in each class').querySelector('[title]')).not.toBeNull(),
  )
  await waitFor(() => expect(panel('Students by village').querySelector('[title]')).not.toBeNull())
  await waitFor(() =>
    expect(panel('Fee collected each month').querySelector('[title]')).not.toBeNull(),
  )
}

describe('Analytics page', () => {
  it('shows the header, six filters, five tiles and four charts', async () => {
    await openAnalytics()
    expect(screen.getByText('Reports · Students, families and fees')).toBeInTheDocument()
    const filters = screen.getByRole('region', { name: 'Filters' })
    expect(within(filters).getAllByRole('combobox')).toHaveLength(6)
    const tiles = await screen.findByRole('region', { name: 'Summary' })
    for (const label of [
      'Students',
      'Using the bus',
      'School fee collected',
      'Bus fee collected',
      'Fee pending',
    ]) {
      expect(within(tiles).getByText(label)).toBeInTheDocument()
    }
    for (const name of [
      'Fee collected each month',
      "Fee payment by father's occupation",
      'Students in each class',
      'Students by village',
    ]) {
      expect(panel(name)).toBeInTheDocument()
    }
    await loaded()
    expect(screen.getByText('Showing all', { exact: false })).toBeInTheDocument()
  })

  it('draws 15 class bars, the top 8 villages, and two bars for each month', async () => {
    await openAnalytics()
    await loaded()
    const classBars = panel('Students in each class').querySelectorAll('[title]')
    expect(classBars).toHaveLength(15)
    expect(classBars[0]?.getAttribute('title')).toMatch(/^Nursery: \d+ students?$/)
    expect(panel('Students by village').querySelectorAll('[title]').length).toBeLessThanOrEqual(8)
    expect(panel('Fee collected each month').querySelectorAll('[title]').length).toBe(14)
    // The axis of chart 3 rounds up from the data: 0, a middle number, a top number.
    expect(within(panel('Students in each class')).getByText('0')).toBeInTheDocument()
  })

  it('everyBarHasATitleWithItsValue', async () => {
    await openAnalytics()
    await loaded()
    await screen.findByText(/Largest class/)
    for (const name of [
      'Fee collected each month',
      "Fee payment by father's occupation",
      'Students in each class',
      'Students by village',
    ]) {
      const bars = panel(name).querySelectorAll('[title]')
      expect(bars.length, name).toBeGreaterThan(0)
      for (const bar of bars) expect(bar.getAttribute('title'), name).toMatch(/\d/)
    }
  })

  it('writes the newest month and the biggest and smallest class in words', async () => {
    await openAnalytics()
    await loaded()
    expect(await screen.findByText(/October so far: school fee/)).toBeInTheDocument()
    expect(screen.getByText(/Largest class: .+ with/)).toBeInTheDocument()
    expect(screen.getByText(/children are below Class 9/)).toBeInTheDocument()
  })

  it('shows the same number in the count line, the Students tile and the class bars, for any filter', async () => {
    const paths = [
      '/analytics',
      '/analytics?village=Jakhal',
      '/analytics?village=Jakhal&feeStatus=DELAYED',
      '/analytics?bus=NO',
      '/analytics?className=UKG&bus=YES',
    ]
    for (const path of paths) {
      const { unmount } = await openAnalytics(path)
      const n = await countLine()
      const tile = (await screen.findByText('Students', { selector: 'div' })).nextElementSibling
      await waitFor(() => expect(tile?.textContent).toBe(String(n)), { timeout: 4000 })
      await waitFor(() => expect(classBarTotal(), path).toBe(n))
      unmount()
    }
  })

  it('allQueriesUseTheSameFilterObject: six calls, one set of filters', async () => {
    const urls: URL[] = []
    server.events.on('request:start', ({ request }) => {
      const url = new URL(request.url)
      if (url.pathname.startsWith('/api/v1/analytics/')) urls.push(url)
    })
    await openAnalytics('/analytics?village=Kanheri&feeStatus=DEFAULTED')
    await loaded()
    server.events.removeAllListeners()
    expect(new Set(urls.map((u) => u.pathname)).size).toBe(6)
    for (const url of urls) {
      expect(url.searchParams.get('village')).toBe('Kanheri')
      expect(url.searchParams.get('feeStatus')).toBe('DEFAULTED')
    }
  })

  it('filterChangeKeepsOldDataUntilNewArrives', async () => {
    // The answers for a village come late, so the old numbers can be seen on the screen.
    server.use(
      http.get('/api/v1/analytics/:name', async ({ request }) => {
        if (new URL(request.url).searchParams.get('village')) await delay(300)
      }),
    )
    await openAnalytics()
    await loaded()
    const before = await countLine()
    const tiles = screen.getByRole('region', { name: 'Summary' })

    await userEvent.selectOptions(screen.getByLabelText('Village'), 'Jakhal')
    // At once: the old numbers are still there, a little faded and marked busy.
    const wrapper = tiles.parentElement as HTMLElement
    await waitFor(() => expect(wrapper).toHaveAttribute('aria-busy', 'true'))
    expect(wrapper).toHaveClass('opacity-60')
    expect(within(tiles).getByText(String(before), { selector: 'div' })).toBeInTheDocument()
    expect(panel('Students in each class').querySelectorAll('[title]')).toHaveLength(15)
    expect(screen.queryByText('Loading…')).not.toBeInTheDocument()

    // Then the new numbers, in full colour.
    await waitFor(() => expect(wrapper).not.toHaveAttribute('aria-busy'), { timeout: 4000 })
    const after = await countLine()
    expect(after).toBeLessThan(before)
    expect(screen.getByText(`Showing ${after} of ${before} students.`)).toBeInTheDocument()
    expect(classBarTotal()).toBe(after)
  })

  it('emptyResultShowsMessageNotAnEmptyChart', async () => {
    // Nobody in Jakhal is late with the fees in the sample data.
    await openAnalytics('/analytics?village=Jakhal&feeStatus=DELAYED')
    await screen.findByText(/^Showing 0 of \d+ students\.$/)
    for (const name of [
      'Fee collected each month',
      "Fee payment by father's occupation",
      'Students in each class',
      'Students by village',
    ]) {
      await waitFor(() =>
        expect(
          within(panel(name)).getByText('No students match these filters'),
        ).toBeInTheDocument(),
      )
      // No bars at all.
      expect(panel(name).querySelectorAll('[title]')).toHaveLength(0)
    }
  })

  it('shows an error with Retry in the box that failed, and the other boxes keep working', async () => {
    let fail = true
    server.use(
      http.get('/api/v1/analytics/students-by-village', () =>
        fail ? HttpResponse.json({ error: 'X', message: 'x' }, { status: 500 }) : undefined,
      ),
    )
    await openAnalytics()
    const box = panel('Students by village')
    const retry = await within(box).findByRole('button', { name: 'Retry' })
    // The class chart is fine.
    await waitFor(() =>
      expect(panel('Students in each class').querySelectorAll('[title]')).toHaveLength(15),
    )
    fail = false
    await userEvent.click(retry)
    await waitFor(() => expect(box.querySelectorAll('[title]').length).toBeGreaterThan(0))
  })

  it('shows the error of the count line in the tiles, with Retry', async () => {
    server.use(
      http.get('/api/v1/analytics/summary', () =>
        HttpResponse.json({ error: 'X', message: 'x' }, { status: 500 }),
      ),
    )
    await openAnalytics()
    expect(await screen.findByText('The count could not be loaded.')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Retry' }).length).toBeGreaterThan(0)
  })

  it('transportInchargeCannotOpenAnalytics, and has no menu item', async () => {
    saveLogin(sampleUserIds.transport)
    renderApp('/analytics')
    expect(
      await screen.findByRole('heading', { name: 'You cannot open this page' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Analytics' })).not.toBeInTheDocument()
  })

  it('has the menu item for the owner, and the admissions desk may open the page', async () => {
    await openAnalytics()
    expect(screen.getByRole('link', { name: 'Analytics' })).toBeInTheDocument()
  })

  it('opens for the admissions desk, who has ANALYTICS_VIEW', async () => {
    await openAnalytics('/analytics', sampleUserIds.admissions)
    expect(screen.getByRole('link', { name: 'Analytics' })).toBeInTheDocument()
  })
})
