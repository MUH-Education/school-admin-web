import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/ui/useToast'
import { addTaps, outcomeAfterPress, type TapInput } from './tap'
import type { AnswerOutcome, EventType } from './types'
import type { ChildView } from './viewState'

/**
 * Saves taps (see addTaps). If the phone cannot save, the screen does not change and a short
 * message says so, so nobody believes a tap was kept when it was not.
 */
export function useSaveTaps() {
  const toast = useToast()
  const { t } = useTranslation()
  return useCallback(
    (inputs: TapInput[]) => {
      addTaps(inputs).catch(() => toast.show(t('common.saveFailed')))
    },
    [toast, t],
  )
}

/** The tap for a press on one answer button: the same button again takes the answer back. */
export function pressInput(
  child: Pick<ChildView, 'studentId' | 'answers'>,
  eventType: EventType,
  pressed: AnswerOutcome,
): TapInput {
  return {
    studentId: child.studentId,
    eventType,
    outcome: outcomeAfterPress(child.answers[eventType]?.outcome ?? null, pressed),
  }
}
