import { useEffect, useState } from 'react'

/** The value, but only after it stayed the same for `ms` milliseconds. */
export function useDebounced<T>(value: T, ms: number): T {
  const [later, setLater] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setLater(value), ms)
    return () => clearTimeout(timer)
  }, [value, ms])
  return later
}
