import { useState } from 'react'
import { ApiError } from '@/api/errors'
import { useCorrectPayment } from '@/features/fees/api'
import type { FeePayment } from '@/features/fees/types'
import { formatDate, formatInr } from '@/lib/format'
import { Button } from '@/ui/Button'
import { Dialog } from '@/ui/Dialog'
import { Field } from '@/ui/Field'
import { TextArea } from '@/ui/TextArea'
import { useToast } from '@/ui/useToast'

interface Props {
  studentId: number
  payment: FeePayment
  onClose: () => void
}

/**
 * Owner only (FEES_CORRECT). A payment is never deleted: a line with minus amounts takes it back.
 * Because it changes money records, it asks twice: first for a note, then "Are you sure?".
 */
export function CorrectPaymentDialog({ studentId, payment, onClose }: Props) {
  const toast = useToast()
  const correct = useCorrectPayment(studentId)
  const [step, setStep] = useState<'note' | 'sure'>('note')
  const [note, setNote] = useState('')
  const [noteError, setNoteError] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const what = `${payment.receiptNo}, ${formatInr(payment.amount)} on ${formatDate(payment.paidOn)}`

  function next() {
    if (!note.trim()) {
      setNoteError('Write why this payment is wrong.')
      return
    }
    setNoteError(null)
    setStep('sure')
  }

  async function confirm() {
    setServerError(null)
    try {
      const row = await correct.mutateAsync({ paymentId: payment.id, note: note.trim() })
      toast.show(`Payment corrected. Receipt number ${row.receiptNo}`)
      onClose()
    } catch (error) {
      if (error instanceof ApiError && error.fields.note) {
        setNoteError(error.fields.note)
        setStep('note')
      } else {
        setServerError(
          error instanceof ApiError ? error.message : 'Something went wrong. Try again.',
        )
      }
    }
  }

  if (step === 'note') {
    return (
      <Dialog open title="Correct a wrong payment" onClose={onClose}>
        <div className="flex flex-col gap-4">
          <p>
            Payment <span className="font-mono">{what}</span>. It stays in the list. A line with
            minus {formatInr(payment.amount)} is added, so the money is taken back.
          </p>
          <Field label="Why is it wrong? *" error={noteError ?? undefined} compact>
            <TextArea rows={3} value={note} onChange={(event) => setNote(event.target.value)} />
          </Field>
          <div className="flex flex-wrap justify-end gap-3">
            <Button variant="plain" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={next}>Continue</Button>
          </div>
        </div>
      </Dialog>
    )
  }
  return (
    <Dialog open title="Are you sure?" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <p>
          This changes the money records. Payment <span className="font-mono">{what}</span> will be
          taken back.
        </p>
        <p className="text-ink-soft">Your note: {note.trim()}</p>
        {serverError && (
          <p role="alert" className="border border-bad bg-bad-soft p-3 font-semibold text-bad">
            {serverError}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="plain" onClick={() => setStep('note')}>
            Go back
          </Button>
          <Button variant="danger" saving={correct.isPending} onClick={() => void confirm()}>
            Yes, correct the payment
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
