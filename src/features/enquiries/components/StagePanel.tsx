import { useState } from 'react'
import { Link } from 'react-router'
import { ApiError } from '@/api/errors'
import { Button } from '@/ui/Button'
import { Field } from '@/ui/Field'
import { InlineForm } from '@/ui/InlineForm'
import { Panel } from '@/ui/Panel'
import { StatusDot } from '@/ui/StatusDot'
import { TextArea } from '@/ui/TextArea'
import { useToast } from '@/ui/useToast'
import { useChangeStatus } from '../api'
import { moveLabels, statusTones } from '../labels'
import { statusLabels, type Enquiry, type EnquiryStatus } from '../types'

/** The stage as words with a square, and one button for each stage the server allows next. */
export function StagePanel({ enquiry, canEdit }: { enquiry: Enquiry; canEdit: boolean }) {
  const toast = useToast()
  const change = useChangeStatus(enquiry.id)
  const [asking, setAsking] = useState(false)
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState<string | undefined>()
  const [error, setError] = useState<string | null>(null)

  async function move(status: EnquiryStatus, why?: string) {
    setError(null)
    setReasonError(undefined)
    try {
      await change.mutateAsync({ status, ...(why ? { reason: why } : {}) })
      toast.show(`Moved to ${statusLabels[status]}`)
      setAsking(false)
      setReason('')
    } catch (e) {
      if (e instanceof ApiError && e.fields.reason) setReasonError(e.fields.reason)
      else setError(e instanceof ApiError ? e.message : 'Something went wrong. Try again.')
    }
  }

  function submitLost() {
    // The server checks too; this saves a round trip for an empty box.
    if (!reason.trim()) setReasonError('Say why the enquiry is lost.')
    else void move('LOST', reason.trim())
  }

  return (
    <Panel aria-label="Stage" className="flex flex-col gap-4">
      <h2 className="text-[15.5px] font-semibold">Stage</h2>
      <div className="flex flex-col gap-1">
        <div>
          <StatusDot tone={statusTones[enquiry.status]} large>
            {statusLabels[enquiry.status]}
          </StatusDot>
        </div>
        {enquiry.status === 'LOST' && enquiry.lostReason && (
          <p className="text-sm text-ink-soft">Reason: {enquiry.lostReason}</p>
        )}
      </div>
      {enquiry.status === 'ADMITTED' && enquiry.studentId !== null && (
        <Link to={`/students/${enquiry.studentId}`} className="font-semibold text-canal underline">
          Open the student
        </Link>
      )}
      {canEdit && enquiry.nextStages.length > 0 && !asking && (
        <div className="flex flex-wrap gap-2.5">
          {enquiry.nextStages.map((stage) =>
            stage === 'LOST' ? (
              <Button key={stage} variant="danger" onClick={() => setAsking(true)}>
                {moveLabels[stage]}
              </Button>
            ) : (
              <Button
                key={stage}
                variant="secondary"
                disabled={change.isPending}
                onClick={() => void move(stage)}
              >
                {moveLabels[stage]}
              </Button>
            ),
          )}
        </div>
      )}
      {error && !asking && (
        <p role="alert" className="border border-bad bg-bad-soft p-3 font-semibold text-bad">
          {error}
        </p>
      )}
      {asking && (
        <InlineForm
          framed
          title="Why is this enquiry lost?"
          submitLabel="Mark as lost"
          saving={change.isPending}
          error={error}
          onSubmit={submitLost}
          onCancel={() => {
            setAsking(false)
            setReasonError(undefined)
          }}
        >
          <Field compact label="Reason *" error={reasonError}>
            <TextArea
              rows={2}
              placeholder="e.g. Fee is too high"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </Field>
        </InlineForm>
      )}
    </Panel>
  )
}
