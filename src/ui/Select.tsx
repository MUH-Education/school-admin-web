import type { ComponentProps } from 'react'
import { useFieldControl } from './fieldContext'
import { inputClass } from './TextInput'

export function Select({ className = '', ...rest }: ComponentProps<'select'>) {
  const field = useFieldControl()
  return (
    <select
      id={field?.id}
      aria-describedby={field?.describedBy}
      aria-invalid={field?.invalid || undefined}
      className={`${inputClass} ${field?.invalid ? 'border-bad' : 'border-rule-strong'} ${className}`}
      {...rest}
    />
  )
}
