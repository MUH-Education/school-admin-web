import { useState } from 'react'
import { useStudentFees } from '@/features/fees/api'
import { feeStatusTone } from '@/features/fees/labels'
import {
  feeHeadLabels,
  feeStatusLabels,
  payModeLabels,
  type FeePayment,
  type StudentFees,
} from '@/features/fees/types'
import { formatDate, formatInr, formatLongDate } from '@/lib/format'
import { Button } from '@/ui/Button'
import { EmptyState } from '@/ui/EmptyState'
import { ErrorState } from '@/ui/ErrorState'
import { LoadingBlock } from '@/ui/LoadingBlock'
import { Panel } from '@/ui/Panel'
import { StatusDot } from '@/ui/StatusDot'
import { CorrectPaymentDialog } from './CorrectPaymentDialog'
import { RecordPaymentDialog } from './RecordPaymentDialog'

function Line({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <span className={bold ? 'font-semibold' : undefined}>{label}</span>
      <span className={`font-mono ${bold ? 'font-semibold' : ''}`}>{value}</span>
    </div>
  )
}

/** "Next payment: ₹7,500 on 1 January 2027. Bus fee: not used yet." */
function nextPaymentNote(fees: StudentFees): string {
  const next = fees.nextPayment
    ? `Next payment: ${formatInr(fees.nextPayment.amount)} on ${formatLongDate(fees.nextPayment.dueDate)}.`
    : 'No payment is left this year.'
  const hasBus = fees.heads.some((h) => h.head === 'BUS')
  return hasBus ? next : `${next} Bus fee: not used yet.`
}

interface Props {
  studentId: number
  /** FEES_EDIT: shows "Record a payment". The server checks again. */
  canRecord?: boolean
  /** FEES_CORRECT (the owner): shows "Correct a wrong payment" on each payment line. */
  canCorrect?: boolean
}

/**
 * "Fees this year": the numbers of the server, the status of each fee head and the payment list.
 * The caller shows this box only to a person with FEES_VIEW; without it no call is made.
 */
export function FeesBox({ studentId, canRecord = false, canCorrect = false }: Props) {
  const fees = useStudentFees(studentId)
  const [recording, setRecording] = useState(false)
  const [correcting, setCorrecting] = useState<FeePayment | null>(null)
  return (
    <Panel
      aria-label="Fees this year"
      className="flex flex-col gap-3.5 px-6 pt-[22px] pb-6 text-[14.5px] leading-[1.45]"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2 className="text-[17px] font-semibold">Fees this year</h2>
        {fees.data?.plan && canRecord && (
          <Button
            variant="secondary"
            className="px-4! text-[14.5px]"
            onClick={() => setRecording(true)}
          >
            Record a payment
          </Button>
        )}
      </div>
      {fees.isPending ? (
        <LoadingBlock />
      ) : fees.isError ? (
        <ErrorState error={fees.error} onRetry={() => void fees.refetch()} />
      ) : fees.data.plan === null ? (
        <EmptyState
          title="No fee plan for this year"
          hint="This child has no fees recorded for the year yet."
        />
      ) : (
        <>
          <FeesNumbers
            fees={fees.data}
            onCorrect={canCorrect ? (payment) => setCorrecting(payment) : undefined}
          />
          {correcting && (
            <CorrectPaymentDialog
              studentId={studentId}
              payment={correcting}
              onClose={() => setCorrecting(null)}
            />
          )}
          <RecordPaymentDialog
            key={recording ? 'open' : 'closed'}
            open={recording}
            studentId={studentId}
            fees={fees.data}
            onClose={() => setRecording(false)}
          />
        </>
      )}
    </Panel>
  )
}

function FeesNumbers({
  fees,
  onCorrect,
}: {
  fees: StudentFees
  onCorrect: ((payment: FeePayment) => void) | undefined
}) {
  const plan = fees.plan
  if (!plan) return null
  return (
    <>
      <div className="flex flex-col gap-2.5 text-[15px]">
        <Line label="School fee for the year" value={formatInr(plan.schoolFee)} />
        {plan.busFee > 0 && <Line label="Bus fee for the year" value={formatInr(plan.busFee)} />}
        {plan.discount > 0 && (
          <Line
            label={`Discount (${plan.discountReason ?? 'no reason'})`}
            value={formatInr(plan.discount)}
          />
        )}
        <Line label="Paid so far" value={formatInr(fees.paidSoFar)} />
        <Line label="Pending now" value={formatInr(fees.pendingNow)} />
        <Line label="Still to pay" value={formatInr(fees.stillToPay)} bold />
      </div>
      <p className="text-[13.5px] text-ink-soft">{nextPaymentNote(fees)}</p>

      <ul
        aria-label="Status of each fee"
        className="flex flex-col gap-2 border-t border-rule pt-3.5"
      >
        {fees.heads.map((h) => (
          <li key={h.head} className="flex items-center justify-between gap-3 text-[14px]">
            <span>{feeHeadLabels[h.head]}</span>
            <StatusDot tone={feeStatusTone[h.status]} plain>
              {feeStatusLabels[h.status]}
            </StatusDot>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-2 border-t border-rule pt-3.5">
        <h3 className="text-[14px] font-semibold">Payments</h3>
        {fees.payments.length === 0 ? (
          <p className="text-[14px] text-ink-soft">No payment yet.</p>
        ) : (
          <ul aria-label="Payments" className="flex flex-col">
            {fees.payments.map((p) => (
              <PaymentLine key={p.id} payment={p} onCorrect={onCorrect} />
            ))}
          </ul>
        )}
      </div>
    </>
  )
}

function PaymentLine({
  payment: p,
  onCorrect,
}: {
  payment: FeePayment
  onCorrect: ((payment: FeePayment) => void) | undefined
}) {
  const isCorrection = p.correctionOf !== null
  return (
    <li className="flex flex-col gap-1 border-t border-rule py-[9px] text-[14px] first:border-t-0">
      <div className="grid grid-cols-[88px_minmax(0,1fr)_auto] items-baseline gap-x-3.5 gap-y-1">
        <span className="font-mono text-[12.5px] text-ink-soft">{formatDate(p.paidOn)}</span>
        <span>
          <span className={`font-mono ${isCorrection ? 'text-bad' : ''}`}>
            {formatInr(p.amount)}
          </span>
          <span className="text-ink-soft">
            {' '}
            · {isCorrection ? 'Correction' : payModeLabels[p.mode]}
          </span>
          {p.corrected && <span className="text-ink-soft"> · Corrected</span>}
        </span>
        <span className="font-mono text-[12.5px] text-ink-soft">{p.receiptNo}</span>
      </div>
      {p.note && <p className="text-[13px] text-ink-soft">Note: {p.note}</p>}
      {onCorrect && !isCorrection && !p.corrected && (
        <button
          type="button"
          onClick={() => onCorrect(p)}
          aria-label={`Correct a wrong payment: ${p.receiptNo}`}
          className="self-start text-[13px] font-semibold text-bad underline"
        >
          Correct a wrong payment
        </button>
      )}
    </li>
  )
}
