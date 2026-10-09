import { insightText, loadBoardInsights } from './insights'
import type { LoadBoardRow } from './types'

function row(
  name: string,
  type: 'SMALL_VAN' | 'MID_BUS',
  seats: number,
  kids: number,
): LoadBoardRow {
  const yearlyCost = 30300 * 11
  const feeGot = Math.round(kids * 8360 * 100) / 100
  return {
    routeId: Number(name.replace(/\D/g, '')),
    name,
    vehicle: name,
    vehicleType: type,
    seats,
    children: kids,
    load: kids / seats,
    overBy: Math.max(0, kids - seats),
    spare: Math.max(0, seats - kids),
    yearlyCost,
    costPerChild: kids > 0 ? yearlyCost / kids : 0,
    feeGot,
    surplus: feeGot - yearlyCost,
    verdict: kids > seats ? 'OVER' : kids / seats < 0.6 ? 'LOW' : 'OK',
  }
}

// The nine routes of the design: 255 children on 150 seats.
const sample = [
  row('Route 1', 'SMALL_VAN', 14, 24),
  row('Route 2', 'SMALL_VAN', 14, 27),
  row('Route 3', 'SMALL_VAN', 14, 22),
  row('Route 4', 'SMALL_VAN', 14, 19),
  row('Route 5', 'SMALL_VAN', 14, 26),
  row('Route 6', 'SMALL_VAN', 14, 21),
  row('Route 7', 'SMALL_VAN', 14, 25),
  row('Route 8', 'MID_BUS', 26, 46),
  row('Route 9', 'MID_BUS', 26, 45),
]

describe('loadBoardInsights', () => {
  it('insightsSayTooFewSeatsWhenNoSpareSeats', () => {
    const texts = loadBoardInsights(sample).map(insightText)
    expect(texts[0]).toBe(
      '105 children travel without a seat, and 0 seats are empty. So the problem is too few seats, not children spread badly across routes.',
    )
  })

  it('names the worst route', () => {
    const texts = loadBoardInsights(sample).map(insightText)
    expect(texts[1]).toBe('Every route is over. Route 2 is the worst: 27 children on 14 seats.')
  })

  it('compares the cost per child of each kind of vehicle', () => {
    const texts = loadBoardInsights(sample).map(insightText)
    expect(texts[2]).toBe(
      'Mid bus routes cost about ₹7,300 per child. Small van routes cost ₹12,300 to ₹17,500 per child.',
    )
  })

  it('adds up the yearly loss', () => {
    const texts = loadBoardInsights(sample).map(insightText)
    expect(texts[3]).toBe(
      'The school gets ₹8,360 per child and spends ₹11,764. The gap is about ₹3,400 for each of 255 children. That is the yearly loss of ₹8,67,900.',
    )
  })

  it('says children are badly spread when some routes are over and others have room', () => {
    const rows = [row('Route 1', 'SMALL_VAN', 14, 20), row('Route 2', 'SMALL_VAN', 14, 4)]
    const [first, second] = loadBoardInsights(rows).map(insightText)
    expect(first).toBe(
      '6 children travel without a seat, and 10 seats are empty. So part of the problem is how children are spread: fill the routes with empty seats first.',
    )
    expect(second).toBe('1 of 2 routes are over. Route 1 is the worst: 20 children on 14 seats.')
  })

  it('is calm when every child has a seat', () => {
    const rows = [row('Route 1', 'SMALL_VAN', 14, 12), row('Route 2', 'SMALL_VAN', 14, 10)]
    const texts = loadBoardInsights(rows).map(insightText)
    expect(texts[0]).toBe(
      'Every child has a seat. 6 seats are empty, so some routes can take more children.',
    )
    expect(texts.some((t) => t.includes('is the worst'))).toBe(false)
  })

  it('gives nothing when there are no routes', () => {
    expect(loadBoardInsights([])).toEqual([])
  })
})
