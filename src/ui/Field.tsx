import { useId, type ReactNode } from 'react'
import { FieldContext } from './fieldContext'

interface FieldProps {
  label: string
  hint?: string
  error?: string
  children: ReactNode
}

/** Label + input + hint + error text. The input inside gets its id automatically. */
export function Field({ label, hint, error, children }: FieldProps) {
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <FieldContext value={{ id, describedBy, invalid: Boolean(error) }}>
      <div className="flex flex-col gap-2">
        <label htmlFor={id} className="text-[15px] font-semibold">
          {label}
        </label>
        {children}
        {hint && (
          <p id={hintId} className="text-[13px] text-ink-soft">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} role="alert" className="text-[13px] font-semibold text-bad">
            {error}
          </p>
        )}
      </div>
    </FieldContext>
  )
}
