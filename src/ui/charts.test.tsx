import { render, screen, within } from '@testing-library/react'
import { BarColumns, type BarGroup } from './BarColumns'
import { BarList } from './BarList'
import { percentOf, partWidths } from './chartMath'
import { StackedBar, type StackedRow } from './StackedBar'

const months: BarGroup[] = [
  {
    label: 'Apr',
    bars: [
      { value: 96, color: 'chart1', title: 'School fee, Apr: 96% collected' },
      { value: 99, color: 'chart2', title: 'Bus fee, Apr: 99% collected' },
    ],
  },
  {
    label: 'May',
    bars: [
      { value: 50, color: 'chart1', title: 'School fee, May: 50% collected' },
      { value: null, color: 'chart2', title: 'Bus fee, May: nothing was due' },
    ],
  },
]

function renderMonths(emptyMessage?: string) {
  return render(
    <BarColumns
      label="Fee collected each month"
      groups={months}
      max={100}
      ticks={['100%', '50%', '0%']}
      variant="grouped"
      height={200}
      axisWidth={36}
      emptyMessage={emptyMessage}
    />,
  )
}

describe('BarColumns', () => {
  it('groupedBarsHaveHeightsFromTheData', () => {
    renderMonths()
    expect(screen.getByTitle('School fee, Apr: 96% collected')).toHaveStyle({ height: '96%' })
    expect(screen.getByTitle('Bus fee, Apr: 99% collected')).toHaveStyle({ height: '99%' })
    expect(screen.getByTitle('School fee, May: 50% collected')).toHaveStyle({ height: '50%' })
    // Nothing to measure: no height, but still a bar with a title.
    expect(screen.getByTitle('Bus fee, May: nothing was due')).toHaveStyle({ height: '0%' })
  })

  it('percentOf starts at zero and never goes over the top line', () => {
    expect(percentOf(0, 30)).toBe(0)
    expect(percentOf(15, 30)).toBe(50)
    expect(percentOf(26, 30)).toBe(86.7)
    expect(percentOf(45, 30)).toBe(100)
    expect(percentOf(null, 30)).toBe(0)
    expect(percentOf(5, 0)).toBe(0)
  })

  it('writes the axis words and the label of each group', () => {
    renderMonths()
    for (const word of ['100%', '50%', '0%', 'Apr', 'May']) {
      expect(screen.getByText(word)).toBeInTheDocument()
    }
  })

  it('everyBarHasATitleWithItsValue', () => {
    const { container } = renderMonths()
    const bars = container.querySelectorAll('[title]')
    expect(bars).toHaveLength(4)
    for (const bar of bars) expect(bar.getAttribute('title')).toMatch(/\S/)
    // No number is printed on a bar.
    for (const bar of bars) expect(bar).toBeEmptyDOMElement()
  })

  it('emptyResultShowsMessageNotAnEmptyChart', () => {
    const { container } = renderMonths('No students match these filters')
    expect(screen.getByText('No students match these filters')).toBeInTheDocument()
    expect(container.querySelectorAll('[title]')).toHaveLength(0)
    expect(screen.queryByText('Apr')).not.toBeInTheDocument()
    // The same height as the chart: 200 + 1 (line) + 8 + the label row.
    expect(screen.getByRole('img')).toHaveStyle({ height: '224.4px' })
  })
})

describe('StackedBar', () => {
  const rows: StackedRow[] = [
    {
      name: 'Farmer, small',
      note: '82 students · 56% on time',
      parts: [
        { value: 46, color: 'chart1', title: 'Farmer, small: 46 on time' },
        { value: 27, color: 'chart2', title: 'Farmer, small: 27 delayed' },
        { value: 9, color: 'chart3', title: 'Farmer, small: 9 defaulted' },
      ],
      title: 'Farmer, small: 46 on time, 27 delayed, 9 defaulted',
    },
    {
      name: 'Family abroad',
      note: '9 students · 100% on time',
      parts: [
        { value: 9, color: 'chart1', title: 'Family abroad: 9 on time' },
        { value: 0, color: 'chart2', title: 'Family abroad: 0 delayed' },
        { value: 0, color: 'chart3', title: 'Family abroad: 0 defaulted' },
      ],
      title: 'Family abroad: 9 on time, 0 delayed, 0 defaulted',
    },
  ]

  it('stackedBarPartsAddUpTo100Percent', () => {
    for (const row of rows) {
      const sum = partWidths(row.parts).reduce((a, b) => a + b, 0)
      expect(sum).toBeCloseTo(100, 6)
    }
    expect(partWidths([{ value: 0 }])).toEqual([0])
    render(<StackedBar rows={rows} />)
    const bar = screen.getByTitle(rows[0]?.title ?? '')
    const widths = [...bar.children].map((part) => parseFloat((part as HTMLElement).style.width))
    expect(widths.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 1)
  })

  it('gives every bar and every part a title with its value, and the colours stay out of the text', () => {
    render(<StackedBar rows={rows} />)
    expect(screen.getByTitle('Farmer, small: 27 delayed')).toBeInTheDocument()
    expect(screen.getByText('82 students · 56% on time')).toHaveClass('text-ink-soft')
    expect(screen.getByText('Farmer, small')).not.toHaveClass('text-chart-1')
  })

  it('emptyResultShowsMessageNotAnEmptyChart', () => {
    render(<StackedBar rows={[]} emptyMessage="No students match these filters" />)
    expect(screen.getByText('No students match these filters')).toBeInTheDocument()
  })
})

describe('BarList', () => {
  it('barListIsSortedBiggestFirst', () => {
    render(
      <BarList
        rows={[
          { name: 'Kanheri', value: 26, title: 'Kanheri: 26 students' },
          { name: 'Tohana town', value: 48, title: 'Tohana town: 48 students' },
          { name: 'Jakhal', value: 31, title: 'Jakhal: 31 students' },
        ]}
      />,
    )
    const names = screen.getAllByText(/Kanheri|Tohana town|Jakhal/).map((n) => n.textContent)
    expect(names).toEqual(['Tohana town', 'Jakhal', 'Kanheri'])
    // The biggest bar fills the track; the others are measured against it.
    expect(screen.getByTitle('Tohana town: 48 students')).toHaveStyle({ width: '100%' })
    expect(screen.getByTitle('Jakhal: 31 students')).toHaveStyle({ width: '64.6%' })
    // The number is at the end of the bar.
    const row = screen.getByText('Jakhal').parentElement as HTMLElement
    expect(within(row).getByText('31')).toBeInTheDocument()
  })

  it('emptyResultShowsMessageNotAnEmptyChart', () => {
    render(<BarList rows={[]} emptyMessage="No students match these filters" />)
    expect(screen.getByText('No students match these filters')).toBeInTheDocument()
  })
})
