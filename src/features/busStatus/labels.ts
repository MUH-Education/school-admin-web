import type { StatusTone } from '@/ui/StatusDot'
import type { BusPhase, RouteState } from './types'

export interface StateLabel {
  text: string
  tone: StatusTone
}

/**
 * The words and colour for a route (behaviour 10).
 * `time` is already shown as text: the school arrival for REACHED_SCHOOL, the start for NOT_STARTED.
 */
export function routeStateLabel(
  state: RouteState,
  lateMinutes: number,
  time: string | null,
): StateLabel {
  switch (state) {
    case 'ON_THE_WAY':
      return { text: 'On the way', tone: 'canal' }
    case 'REACHED_SCHOOL':
      return { text: time ? `Reached school ${time}` : 'Reached school', tone: 'good' }
    case 'LATE':
      return {
        text: `Late by ${lateMinutes} ${lateMinutes === 1 ? 'minute' : 'minutes'}`,
        tone: 'dust',
      }
    case 'NO_TAPS':
      return { text: 'No taps yet', tone: 'bad' }
    case 'NOT_STARTED':
      return { text: time ? `Not started · starts ${time}` : 'Not started', tone: 'muted' }
    case 'DONE':
      return { text: 'All children home', tone: 'good' }
  }
}

/** The three choices of the switch, and the words used in headings. */
export const phaseChoices: { value: BusPhase; label: string }[] = [
  { value: 'MORNING', label: 'Morning pickup' },
  { value: 'AT_SCHOOL', label: 'At school' },
  { value: 'EVENING', label: 'Evening drop' },
]
