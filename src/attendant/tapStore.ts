import { phoneDb } from './phoneDb'
import type { EventType, Manifest, MarkResult, ServerAnswer, Tap, TapProblem } from './types'

const MANIFEST_KEY = 'current'

/** One unsent tap per child, per event, per day. A newer tap takes the place of the older one. */
export function tapKey(tap: Pick<Tap, 'serviceDate' | 'studentId' | 'eventType'>): string {
  return `${tap.serviceDate}|${tap.studentId}|${tap.eventType}`
}

export async function getManifest(): Promise<Manifest | null> {
  return (await (await phoneDb()).get('manifest', MANIFEST_KEY)) ?? null
}

/** A new day's manifest takes the place of the old one. The tap queue is not touched. */
export async function saveManifest(manifest: Manifest): Promise<void> {
  await (await phoneDb()).put('manifest', manifest, MANIFEST_KEY)
}

/** All unsent taps, oldest first. */
export async function getQueue(): Promise<Tap[]> {
  const taps = await (await phoneDb()).getAll('tapQueue')
  return taps.sort((a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt))
}

export async function getProblems(): Promise<TapProblem[]> {
  const problems = await (await phoneDb()).getAll('tapProblems')
  return problems.sort((a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt))
}

export async function clearProblems(): Promise<void> {
  await (await phoneDb()).clear('tapProblems')
}

export function answerIn(
  manifest: Manifest | null,
  studentId: number,
  eventType: EventType,
): ServerAnswer | undefined {
  for (const stop of manifest?.stops ?? []) {
    const child = stop.children.find((c) => c.studentId === studentId)
    if (child) return child.taps[eventType]
  }
  return undefined
}

/**
 * Puts one or many taps in the queue in one step: all are written or none. A newer tap for the same
 * child and event takes the place of the older one. A CLEARED tap for an answer the server cannot have is simply dropped:
 * the unsent tap it takes back was never handed to the network and the manifest has no answer.
 * Reads and writes happen in one step, so a sync run cannot slip in between.
 */
export async function writeTaps(taps: Tap[]): Promise<Tap[]> {
  const db = await phoneDb()
  const tx = db.transaction(['tapQueue', 'manifest'], 'readwrite')
  const queue = tx.objectStore('tapQueue')
  const manifest = (await tx.objectStore('manifest').get(MANIFEST_KEY)) ?? null
  const written: Tap[] = []
  for (const tap of taps) {
    const key = tapKey(tap)
    if (tap.outcome === 'CLEARED') {
      const queued = await queue.get(key)
      const serverHasAnswer =
        manifest?.date === tap.serviceDate && answerIn(manifest, tap.studentId, tap.eventType)
      const mightBeOnServer = (queued?.tries ?? 0) > 0
      if (!serverHasAnswer && !mightBeOnServer) {
        await queue.delete(key)
        continue
      }
    }
    await queue.put(tap, key)
    written.push(tap)
  }
  await tx.done
  return written
}

/** Counts a try on each tap that is about to be sent (only if it is still the same tap). */
export async function markTried(taps: Tap[]): Promise<void> {
  const db = await phoneDb()
  const tx = db.transaction('tapQueue', 'readwrite')
  for (const tap of taps) {
    const key = tapKey(tap)
    const current = await tx.store.get(key)
    if (current?.id === tap.id) await tx.store.put({ ...current, tries: current.tries + 1 }, key)
  }
  await tx.done
}

/**
 * The server answered. In one step:
 * - ok: the tap leaves the queue and the saved manifest learns the answer;
 * - not ok: the tap leaves the queue and goes to the problems list.
 * A tap that was replaced while it was on the way stays as it is (the new one is sent next).
 * Returns the number of confirmed and of refused taps.
 */
export async function settle(
  sent: Tap[],
  results: MarkResult[],
  nameOf: (studentId: number) => string | null,
): Promise<{ confirmed: number; refused: number }> {
  const db = await phoneDb()
  const tx = db.transaction(['tapQueue', 'tapProblems', 'manifest'], 'readwrite')
  const queue = tx.objectStore('tapQueue')
  const manifestStore = tx.objectStore('manifest')
  let manifest = (await manifestStore.get(MANIFEST_KEY)) ?? null
  let manifestChanged = false
  let confirmed = 0
  let refused = 0

  for (const [index, tap] of sent.entries()) {
    const result = results[index]
    if (!result) continue
    const key = tapKey(tap)
    const current = await queue.get(key)
    if (current?.id !== tap.id) continue
    await queue.delete(key)
    if (result.ok) {
      confirmed++
      if (manifest && manifest.date === tap.serviceDate) {
        manifest = withAnswer(manifest, tap)
        manifestChanged = true
      }
    } else {
      refused++
      await tx.objectStore('tapProblems').put({
        ...tap,
        error: result.error ?? 'UNKNOWN',
        name: nameOf(tap.studentId) ?? '',
      })
    }
  }
  if (manifest && manifestChanged) await manifestStore.put(manifest, MANIFEST_KEY)
  await tx.done
  return { confirmed, refused }
}

/** The manifest with one tap put on top of it (a CLEARED tap takes the answer away). */
function withAnswer(manifest: Manifest, tap: Tap): Manifest {
  return {
    ...manifest,
    stops: manifest.stops.map((stop) => ({
      ...stop,
      children: stop.children.map((child) => {
        if (child.studentId !== tap.studentId) return child
        const taps = { ...child.taps }
        if (tap.outcome === 'CLEARED') delete taps[tap.eventType]
        else taps[tap.eventType] = { outcome: tap.outcome, occurredAt: tap.occurredAt }
        return { ...child, taps }
      }),
    })),
  }
}
