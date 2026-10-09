import type { ReactNode } from 'react'
import { Dialog } from '@/ui/Dialog'

const BUTTON_HEIGHT = 56

/** A question with two big buttons, in the phone font. The yes button is the filled one. */
export function QuestionDialog({
  open,
  title,
  hint,
  yes,
  no,
  onYes,
  onNo,
}: {
  open: boolean
  title: string
  hint?: ReactNode
  yes: string
  no: string
  onYes: () => void
  onNo: () => void
}) {
  return (
    <Dialog open={open} title={title} onClose={onNo} className="font-hindi">
      {hint && <p className="mb-5 text-ink-soft">{hint}</p>}
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={onYes}
          style={{ minHeight: BUTTON_HEIGHT }}
          className="cursor-pointer border-2 border-good bg-good text-[20px] font-bold text-white"
        >
          {yes}
        </button>
        <button
          type="button"
          onClick={onNo}
          style={{ minHeight: BUTTON_HEIGHT }}
          className="cursor-pointer border-2 border-rule-strong bg-panel text-[20px] font-semibold text-ink"
        >
          {no}
        </button>
      </div>
    </Dialog>
  )
}
