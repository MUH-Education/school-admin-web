import { useEffect, useState } from 'react'

/** Counts down in whole seconds. `start(60)` begins at 60 and stops at 0. */
export function useCountdown(): [left: number, start: (seconds: number) => void] {
  const [left, setLeft] = useState(0)
  useEffect(() => {
    if (left <= 0) return
    const timer = setTimeout(() => setLeft((value) => value - 1), 1000)
    return () => clearTimeout(timer)
  }, [left])
  return [left, setLeft]
}
