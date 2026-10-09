import type { FormEvent, ReactNode } from 'react'
import { Button } from './Button'

interface InlineFormProps {
  title: string
  children: ReactNode
  submitLabel: string
  saving?: boolean
  /** A message from the server, for example "Rajpal drives Van 1 on these days." */
  error?: string | null
  onSubmit: () => void
  onCancel: () => void
  /** More buttons after Cancel, for example "Remove this number". */
  extraActions?: ReactNode
  /** A 2px border all round, for a form that opens in the middle of a box. */
  framed?: boolean
}

/** A small form that opens inside a box, not in a dialog. */
export function InlineForm({
  title,
  children,
  submitLabel,
  saving = false,
  error,
  onSubmit,
  onCancel,
  extraActions,
  framed = false,
}: InlineFormProps) {
  function submit(event: FormEvent) {
    event.preventDefault()
    onSubmit()
  }
  return (
    <form
      noValidate
      aria-label={title}
      onSubmit={submit}
      className={`flex flex-col gap-4 bg-canal-tint px-[18px] pt-[18px] pb-5 ${
        framed ? 'border-2 border-canal' : 'border-t-2 border-t-canal'
      }`}
    >
      <h3 className="text-[15.5px] font-semibold">{title}</h3>
      {children}
      {error && (
        <p role="alert" className="border border-bad bg-bad-soft p-3 font-semibold text-bad">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2.5">
        <Button type="submit" saving={saving} className="min-h-12 px-[22px]">
          {submitLabel}
        </Button>
        <Button variant="plain" onClick={onCancel} className="min-h-12">
          Cancel
        </Button>
        {extraActions}
      </div>
    </form>
  )
}
