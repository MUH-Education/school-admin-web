import type { ComponentProps } from 'react'
import { useFieldControl } from './fieldContext'

/** The browser's own file chooser, in the Field style. Put it inside a Field. */
export function FileInput({ className = '', ...rest }: Omit<ComponentProps<'input'>, 'type'>) {
  const field = useFieldControl()
  return (
    <input
      type="file"
      id={field?.id}
      aria-describedby={field?.describedBy}
      aria-invalid={field?.invalid || undefined}
      className={`w-full min-h-12 border bg-panel px-3 py-2.5 text-[15px] text-ink file:mr-3 file:border file:border-rule-strong file:bg-panel file:px-3 file:py-1.5 file:text-ink ${
        field?.invalid ? 'border-bad' : 'border-rule-strong'
      } ${className}`}
      {...rest}
    />
  )
}
