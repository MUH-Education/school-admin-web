import { render, screen, within } from '@testing-library/react'
import { StopStrip, type StripStop } from './StopStrip'

const route4: StripStop[] = [
  { name: 'Sadhanwas', due: '07:25', tappedAt: '07:26', state: 'DONE' },
  { name: 'Jakhal', due: '07:40', tappedAt: '07:42', state: 'DONE' },
  { name: 'Kanheri', due: '07:55', tappedAt: null, state: 'NEXT' },
  { name: 'Tohana town', due: '08:02', tappedAt: null, state: 'LATER' },
]
const school = { due: '08:10', reachedAt: null }

function squares(container: HTMLElement) {
  return [...container.querySelectorAll('[data-square]')].map((el) =>
    el.getAttribute('data-square'),
  )
}

describe('StopStrip', () => {
  it('stopStripShowsDoneNextLater', () => {
    const { container } = render(<StopStrip stops={route4} school={school} />)
    expect(squares(container)).toEqual(['done', 'done', 'next', 'later', 'later'])
    const items = within(screen.getByRole('list', { name: 'Stops' })).getAllByRole('listitem')
    expect(items).toHaveLength(5)
    // The tap time of a done stop, the due time of the others.
    expect(items[0]).toHaveTextContent('7:26')
    expect(items[1]).toHaveTextContent('7:42')
    expect(items[2]).toHaveTextContent('due 7:55')
    expect(items[3]).toHaveTextContent('due 8:02')
    // The state is also in words, not only in colour.
    expect(items[0]).toHaveTextContent('Sadhanwas, done')
    expect(items[2]).toHaveTextContent('Kanheri, next stop')
    expect(items[3]).toHaveTextContent('Tohana town, later')
  })

  it('draws the done square filled, the next with a blue border, and later with a grey one', () => {
    const { container } = render(<StopStrip stops={route4} school={school} />)
    const [done, , next, later] = [...container.querySelectorAll('[data-square]')]
    expect(done).toHaveClass('bg-canal')
    expect(next).toHaveClass('border-canal', 'bg-panel')
    expect(later).toHaveClass('border-rule-mid', 'bg-panel')
  })

  it('makes the line blue only between two squares the bus has reached', () => {
    const { container } = render(<StopStrip stops={route4} school={school} />)
    const lines = [...container.querySelectorAll('li > div:first-child > span:nth-child(2)')]
    expect(lines.map((line) => line.classList.contains('bg-canal'))).toEqual([
      true, // Sadhanwas to Jakhal: both done
      false, // Jakhal to Kanheri: the bus has not reached Kanheri
      false,
      false,
    ])
  })

  it('schoolSquareIsGreenWhenReached', () => {
    const stops: StripStop[] = route4.map((s) => ({
      ...s,
      tappedAt: s.tappedAt ?? '08:00',
      state: 'DONE',
    }))
    const { container } = render(
      <StopStrip stops={stops} school={{ due: '08:10', reachedAt: '07:46' }} />,
    )
    const last = [...container.querySelectorAll('[data-square]')].at(-1)
    expect(last).toHaveAttribute('data-square', 'school')
    expect(last).toHaveClass('bg-good')
    const school = screen.getAllByRole('listitem').at(-1)
    expect(school).toHaveTextContent('School, reached')
    expect(school).toHaveTextContent('7:46')
    // The line into School is blue too.
    const lines = [...container.querySelectorAll('li > div:first-child > span:nth-child(2)')]
    expect(lines.every((line) => line.classList.contains('bg-canal'))).toBe(true)
  })

  it('keeps the school square grey and shows its due time before the bus is there', () => {
    const { container } = render(<StopStrip stops={route4} school={school} />)
    const last = [...container.querySelectorAll('[data-square]')].at(-1)
    expect(last).toHaveClass('border-rule-mid')
    expect(screen.getAllByRole('listitem').at(-1)).toHaveTextContent('due 8:10')
  })

  it('shows a late tap in amber with the word late', () => {
    const stops: StripStop[] = [
      { name: 'Samain', due: '07:24', tappedAt: '07:40', state: 'DONE', late: true },
      { name: 'Jamalpur', due: '07:34', tappedAt: null, state: 'NEXT' },
    ]
    render(<StopStrip stops={stops} school={school} />)
    const time = screen.getByText('7:40, late')
    expect(time).toHaveClass('text-dust-text')
    // A next stop that is overdue is not red when the bus has taps.
    expect(screen.getByText('due 7:34')).toHaveClass('text-ink-soft')
  })

  it('draws the first stop in red when the bus has no taps', () => {
    const stops: StripStop[] = [
      { name: 'Pirthala', due: '07:15', tappedAt: null, state: 'NEXT' },
      { name: 'Diwana', due: '07:24', tappedAt: null, state: 'LATER' },
    ]
    const { container } = render(<StopStrip stops={stops} school={school} noTaps />)
    expect(container.querySelector('[data-square="next"]')).toHaveClass('border-bad')
    expect(screen.getByText('due 7:15')).toHaveClass('text-bad')
    expect(screen.getByText('due 7:24')).toHaveClass('text-ink-soft')
  })

  it('writes afternoon times with pm', () => {
    const stops: StripStop[] = [{ name: 'Kulan', due: '15:35', tappedAt: null, state: 'NEXT' }]
    render(<StopStrip stops={stops} school={{ due: '15:30', reachedAt: null }} />)
    expect(screen.getByText('due 3:35 pm')).toBeInTheDocument()
  })
})
