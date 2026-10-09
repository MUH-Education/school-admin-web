import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { makeRoute } from '@/test/busStatus'
import type { AttentionItem } from '../types'
import { AttentionBox } from './AttentionBox'
import { BusRouteRow } from './BusRouteRow'
import { PhaseSwitch } from './PhaseSwitch'

function inRouter(element: React.ReactElement) {
  const router = createMemoryRouter([{ path: '*', element }])
  return render(<RouterProvider router={router} />)
}

describe('BusRouteRow', () => {
  it('shows name, vehicle, attendant, stops, state, count and the link', () => {
    inRouter(<BusRouteRow route={makeRoute()} detailTo="/bus-status/routes/4" />)
    const row = screen.getByRole('article', { name: 'Route 4' })
    expect(row).toHaveTextContent('Small van · 14 seats')
    expect(row).toHaveTextContent('Attendant: Balwan')
    expect(within(row).getByRole('list', { name: 'Stops' })).toBeInTheDocument()
    expect(row).toHaveTextContent('On the way')
    expect(row).toHaveTextContent('11 of 19 boarded')
    expect(row).toHaveTextContent('1 absent')
    expect(within(row).getByRole('link', { name: 'View children of Route 4' })).toHaveAttribute(
      'href',
      '/bus-status/routes/4',
    )
    expect(row).toHaveClass('border-rule')
  })

  it('noTapsRowHasRedBorderAndRedState', () => {
    const route = makeRoute({
      name: 'Route 3',
      state: 'NO_TAPS',
      lateMinutes: 33,
      boarded: 0,
      absent: 0,
      total: 22,
      stops: [
        { name: 'Pirthala', due: '07:15', tappedAt: null, state: 'NEXT' },
        { name: 'Diwana', due: '07:24', tappedAt: null, state: 'LATER' },
      ],
    })
    inRouter(<BusRouteRow route={route} detailTo="/x" />)
    const row = screen.getByRole('article', { name: 'Route 3' })
    expect(row).toHaveClass('border-bad')
    expect(screen.getByText('No taps yet')).toHaveClass('text-bad')
    expect(row).toHaveTextContent('0 of 22 boarded')
    expect(row).toHaveTextContent('33 minutes behind')
    expect(screen.getByText('due 7:15')).toHaveClass('text-bad')
  })

  it('lateRowShowsMinutes', () => {
    const route = makeRoute({ name: 'Route 5', state: 'LATE', lateMinutes: 16, absent: 0 })
    inRouter(<BusRouteRow route={route} detailTo="/x" />)
    const row = screen.getByRole('article', { name: 'Route 5' })
    expect(row).toHaveClass('border-dust')
    expect(screen.getByText('Late by 16 minutes')).toHaveClass('text-dust-text')
    expect(row).toHaveTextContent('0 absent')
  })

  it('shows the arrival time for a bus at school and the start time for one not started', () => {
    const reached = makeRoute({
      name: 'Route 2',
      state: 'REACHED_SCHOOL',
      school: { due: '08:10', reachedAt: '07:46' },
    })
    const { unmount } = inRouter(<BusRouteRow route={reached} detailTo="/x" />)
    expect(screen.getByText('Reached school 7:46')).toHaveClass('text-good')
    unmount()
    const waiting = makeRoute({ name: 'Route 9', state: 'NOT_STARTED', startsAt: '07:50' })
    inRouter(<BusRouteRow route={waiting} detailTo="/x" />)
    expect(screen.getByText('Not started · starts 7:50')).toHaveClass('text-ink-soft')
  })
})

const noTaps: AttentionItem = {
  routeId: 3,
  kind: 'NO_TAPS',
  title: 'Route 3 has no taps yet',
  message: 'The first stop, Pirthala, was due at 7:15.',
}
const late: AttentionItem = {
  routeId: 5,
  kind: 'LATE',
  title: 'Route 5 is running 16 minutes late',
  message: 'Samain was due at 7:24 and was tapped at 7:40.',
}

describe('AttentionBox', () => {
  it('attentionBoxIsHiddenWhenEmpty', () => {
    inRouter(<AttentionBox items={[]} detailTo={(id) => `/r/${id}`} />)
    expect(screen.queryByText('Needs attention now')).not.toBeInTheDocument()
    expect(screen.queryByRole('region')).not.toBeInTheDocument()
  })

  it('shows one block per problem with the server text and a red top border', () => {
    inRouter(<AttentionBox items={[noTaps, late]} detailTo={(id) => `/r/${id}`} />)
    const box = screen.getByRole('region', { name: 'Needs attention' })
    expect(box).toHaveClass('border-t-bad')
    expect(within(box).getByText('Route 3 has no taps yet')).toHaveClass('text-bad')
    expect(within(box).getByText('Route 5 is running 16 minutes late')).toHaveClass(
      'text-dust-text',
    )
    expect(box).toHaveTextContent('The first stop, Pirthala, was due at 7:15.')
    expect(within(box).getAllByRole('link')).toHaveLength(2)
    expect(within(box).getAllByRole('link')[1]).toHaveAttribute('href', '/r/5')
  })
})

describe('PhaseSwitch', () => {
  it('marks the chosen phase with aria-pressed and tells the page about a click', async () => {
    const onChange = vi.fn()
    render(<PhaseSwitch value="MORNING" onChange={onChange} />)
    expect(screen.getByRole('button', { name: 'Morning pickup' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: 'At school' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Evening drop' }))
    expect(onChange).toHaveBeenCalledWith('EVENING')
  })

  it('presses nothing before the server has said which phase it chose', () => {
    render(<PhaseSwitch value={null} onChange={() => {}} />)
    for (const button of screen.getAllByRole('button')) {
      expect(button).toHaveAttribute('aria-pressed', 'false')
    }
  })
})
