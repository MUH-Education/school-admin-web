import type { ComponentProps } from 'react'
import { useFieldControl } from './fieldContext'
import { inputClass } from './TextInput'

/** Several lines of text. Put it inside a Field, like the other inputs. */
export function TextArea({ className = '', rows = 3, ...rest }: ComponentProps<'textarea'>) {
  const field = useFieldControl()
  return (
    <textarea
      id={field?.id}
      rows={rows}
      aria-describedby={field?.describedBy}
      aria-invalid={field?.invalid || undefined}
      className={`${inputClass} py-3 ${field?.invalid ? 'border-bad' : 'border-rule-strong'} ${className}`}
      {...rest}
    />
  )
}
