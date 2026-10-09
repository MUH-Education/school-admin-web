import type { ComponentProps } from 'react'
import { TextInput } from './TextInput'

/** A date box. The value is an ISO date, "2026-10-12". Put it inside a Field. */
export function DateInput(props: Omit<ComponentProps<'input'>, 'type'>) {
  return <TextInput type="date" {...props} />
}
