import type { ComponentProps } from 'react'
import { TextInput } from './TextInput'

interface MoneyInputProps extends Omit<
  ComponentProps<'input'>,
  'value' | 'onChange' | 'type' | 'inputMode'
> {
  /** Whole rupees. Null: empty. */
  value: number | null
  onValueChange: (value: number | null) => void
}

const grouped = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })

/** Shows 30300 as 30,300 while the person types. Only digits are kept. */
export function MoneyInput({ value, onValueChange, ...rest }: MoneyInputProps) {
  return (
    <TextInput
      inputMode="numeric"
      autoComplete="off"
      value={value === null ? '' : grouped.format(value)}
      onChange={(event) => {
        const digits = event.target.value.replace(/\D/g, '')
        onValueChange(digits === '' ? null : Number(digits))
      }}
      {...rest}
    />
  )
}
