import { routeStateLabel } from './labels'

describe('routeStateLabel', () => {
  it('uses the words and colours of behaviour 10', () => {
    expect(routeStateLabel('ON_THE_WAY', 0, null)).toEqual({ text: 'On the way', tone: 'canal' })
    expect(routeStateLabel('REACHED_SCHOOL', 0, '7:46')).toEqual({
      text: 'Reached school 7:46',
      tone: 'good',
    })
    expect(routeStateLabel('NO_TAPS', 33, null)).toEqual({ text: 'No taps yet', tone: 'bad' })
    expect(routeStateLabel('NOT_STARTED', 0, '7:50')).toEqual({
      text: 'Not started · starts 7:50',
      tone: 'muted',
    })
  })

  it('lateRowShowsMinutes', () => {
    expect(routeStateLabel('LATE', 16, null)).toEqual({ text: 'Late by 16 minutes', tone: 'dust' })
    expect(routeStateLabel('LATE', 1, null).text).toBe('Late by 1 minute')
  })

  it('has words for a bus that has no time to show and for the evening end', () => {
    expect(routeStateLabel('REACHED_SCHOOL', 0, null).text).toBe('Reached school')
    expect(routeStateLabel('NOT_STARTED', 0, null).text).toBe('Not started')
    expect(routeStateLabel('DONE', 0, null)).toEqual({ text: 'All children home', tone: 'good' })
  })
})
