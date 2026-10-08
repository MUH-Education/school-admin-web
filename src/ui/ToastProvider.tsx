import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { ToastContext } from './toastContext'

const SHOW_MS = 4000

/** A short message after a save, for example "Vehicle saved". */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const show = useCallback((text: string) => {
    clearTimeout(timer.current)
    setMessage(text)
    timer.current = setTimeout(() => setMessage(null), SHOW_MS)
  }, [])

  const api = useMemo(() => ({ show }), [show])

  return (
    <ToastContext value={api}>
      {children}
      <div role="status" aria-live="polite" className="fixed bottom-4 left-4 z-50">
        {message && (
          <div className="border border-ink bg-ink px-4 py-3 font-semibold text-white">
            {message}
          </div>
        )}
      </div>
    </ToastContext>
  )
}
