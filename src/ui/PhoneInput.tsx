import type { ComponentProps } from 'react'
import { TextInput } from './TextInput'

/** Accepts `98123 45678`, `09812345678` or `+91 98123 45678`. The server normalizes it. */
export function PhoneInput(props: Omit<ComponentProps<typeof TextInput>, 'type'>) {
  return <TextInput type="tel" inputMode="tel" autoComplete="tel" {...props} />
}
