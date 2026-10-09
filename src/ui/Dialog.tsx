import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface DialogProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** A centred box over the page. Focus stays inside it. Escape closes it. */
export function Dialog({ open, title, onClose, children }: DialogProps) {
  const titleId = useId()
  const boxRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    if (!open) return
    const before = document.activeElement as HTMLElement | null
    const box = boxRef.current
    const first = box?.querySelector<HTMLElement>(FOCUSABLE)
    ;(first ?? box)?.focus()
    return () => before?.focus()
  }, [open])

  if (!open) return null

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.stopPropagation()
      onCloseRef.current()
      return
    }
    if (event.key !== 'Tab' || !boxRef.current) return
    const items = Array.from(boxRef.current.querySelectorAll<HTMLElement>(FOCUSABLE))
    const first = items[0]
    const last = items[items.length - 1]
    if (!first || !last) {
      event.preventDefault()
      return
    }
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-ink/60 p-4"
      onKeyDown={onKeyDown}
    >
      <div
        ref={boxRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="w-full max-w-[520px] border border-rule-strong bg-panel p-7"
      >
        <h2 id={titleId} className="mb-5 text-[19px] font-semibold">
          {title}
        </h2>
        {children}
      </div>
    </div>,
    document.body,
  )
}
