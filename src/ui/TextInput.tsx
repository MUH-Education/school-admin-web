import type { ComponentProps } from 'react'
import { useFieldControl } from './fieldContext'

export const inputClass =
  'w-full min-h-12 border bg-panel px-4 text-base text-ink placeholder:text-ink-soft'

export function TextInput({ className = '', ...rest }: ComponentProps<'input'>) {
  const field = useFieldControl()
  return (
    <input
      id={field?.id}
      aria-describedby={field?.describedBy}
      aria-invalid={field?.invalid || undefined}
      className={`${inputClass} ${field?.invalid ? 'border-bad' : 'border-rule-strong'} ${className}`}
      {...rest}
    />
  )
}
