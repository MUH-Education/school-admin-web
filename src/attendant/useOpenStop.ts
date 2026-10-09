import { useEffect } from 'react'
import { useSearchParams } from 'react-router'

/**
 * Which stop is open on the pickup and drop pages. The stop is kept in the address (?stop=3):
 * - with a stop in the address, that stop;
 * - else the first stop that still has work, else the last stop.
 * The choice is written to the address at once, so the stop stays open when its last child gets
 * an answer (the attendant can still change a tap). Only `open(...)` moves to another stop.
 */
export function useOpenStop<T extends { id: number }>(stops: T[], hasWork: (stop: T) => boolean) {
  const [params, setParams] = useSearchParams()
  const asked = Number(params.get('stop'))
  const fromAddress = stops.findIndex((s) => s.id === asked)
  const firstOpen = stops.findIndex(hasWork)
  const index = fromAddress >= 0 ? fromAddress : firstOpen >= 0 ? firstOpen : stops.length - 1

  const current: T | undefined = stops[index]
  const currentId = current?.id
  const hasStopInAddress = params.has('stop')
  useEffect(() => {
    if (currentId !== undefined && !hasStopInAddress) {
      setParams({ stop: String(currentId) }, { replace: true })
    }
  }, [currentId, hasStopInAddress, setParams])

  return {
    index,
    current,
    next: stops[index + 1] as T | undefined,
    open: (stop: T) => setParams({ stop: String(stop.id) }, { replace: true }),
  }
}
