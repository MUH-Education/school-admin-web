import type { StatusTone } from '@/ui/StatusDot'
import type { FeeStatus } from './types'

/** On time blue, Delayed amber, Defaulted red. The words always go with the square. */
export const feeStatusTone: Record<FeeStatus, StatusTone> = {
  ON_TIME: 'canal',
  DELAYED: 'dust',
  DEFAULTED: 'bad',
}
