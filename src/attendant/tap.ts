import { isoWithOffset, todayIso } from '@/lib/format'
import { refreshLocalState } from './localState'
import { writeTaps } from './tapStore'
import type { AnswerOutcome, EventType, Outcome, Tap } from './types'

export interface TapInput {
  studentId: number
  eventType: EventType
  outcome: Outcome
}

function randomId(): string {
  return globalThis.crypto.randomUUID()
}

/** Builds a tap with the phone's time. This time is never changed, also when the tap is sent hours later. */
export function makeTap(input: TapInput, now: Date = new Date()): Tap {
  return {
    id: randomId(),
    studentId: input.studentId,
    eventType: input.eventType,
    outcome: input.outcome,
    serviceDate: todayIso(now),
    occurredAt: isoWithOffset(now),
    tries: 0,
  }
}

/**
 * The tap, step by step (docs/07-attendant-offline.md):
 * 1. build it with the phone's time; 2. write it to IndexedDB and wait until the write is done;
 * 3. only then let the screen know. Sending is a separate job (sync.ts).
 * An unsent tap for the same child and event is replaced, not doubled.
 */
export async function addTaps(inputs: TapInput[], now: Date = new Date()): Promise<void> {
  if (inputs.length === 0) return
  await writeTaps(inputs.map((input) => makeTap(input, now)))
  await refreshLocalState()
}

export function addTap(input: TapInput, now: Date = new Date()): Promise<void> {
  return addTaps([input], now)
}

/**
 * What does a press on a button do? The same button again takes the answer back (CLEARED).
 * The other button changes the answer.
 */
export function outcomeAfterPress(shown: AnswerOutcome | null, pressed: AnswerOutcome): Outcome {
  return shown === pressed ? 'CLEARED' : pressed
}
