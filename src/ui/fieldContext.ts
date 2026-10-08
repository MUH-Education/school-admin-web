import { createContext, useContext } from 'react'

export interface FieldControl {
  id: string
  describedBy: string | undefined
  invalid: boolean
}

export const FieldContext = createContext<FieldControl | null>(null)

/** Inputs read their id, aria-describedby and invalid state from the Field around them. */
export function useFieldControl(): FieldControl | null {
  return useContext(FieldContext)
}
