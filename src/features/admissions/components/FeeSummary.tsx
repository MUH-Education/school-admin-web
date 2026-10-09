import { useWatch, type Control } from 'react-hook-form'
import { describePayments } from '@/features/fees/feePreview'
import { formatInr, formatLongDate } from '@/lib/format'
import { previewOf, type AdmissionValues } from '../form'

const mono = 'font-mono'

function Line({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <span className={bold ? 'font-semibold' : undefined}>{label}</span>
      <span className={`${mono} ${bold ? 'font-semibold' : ''}`}>{value}</span>
    </div>
  )
}

/**
 * The box on the right of part 4. It is only a preview, calculated here on every key press by
 * feePreview(). After saving, the real numbers come from the server (the student page).
 */
export function FeeSummary({ control }: { control: Control<AdmissionValues> }) {
  const values = useWatch({ control }) as AdmissionValues
  const preview = previewOf(values)
  const usesBus = values.usesBus === 'YES'
  const frequencyChosen = Boolean(values.frequency)

  return (
    <aside
      aria-label="Fee summary"
      className="box-border flex min-w-0 flex-[1_1_300px] flex-col gap-4 text-[15px] leading-[1.45] border border-t-[3px] border-rule border-t-ink bg-panel px-6 pt-6 pb-[26px]"
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-[17px] font-semibold">Fee summary</h2>
        <p className="text-[13.5px] text-ink-soft">Changes as you fill the form.</p>
      </div>
      <div className="flex flex-col gap-3 text-[15px]">
        <Line label="School fee" value={formatInr(values.schoolFee ?? 0)} />
        {usesBus && <Line label="Bus fee" value={formatInr(values.busFee ?? 0)} />}
        <Line label="Discount" value={formatInr(values.discount ?? 0)} />
      </div>
      <div className="h-0.5 bg-ink" />
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[15px] font-semibold">Total for the year</span>
        <span className={`${mono} text-[24px] font-semibold`}>{formatInr(preview.total)}</span>
      </div>
      <div className="flex flex-col gap-3 text-[15px]">
        <Line label="Paid today" value={formatInr(preview.paidToday)} />
        <Line label="Still to pay" value={formatInr(preview.stillToPay)} bold />
      </div>
      <div className="flex flex-col gap-1 bg-paper px-4 py-3.5">
        <div className="font-mono text-[11px] tracking-[0.08em] text-ink-soft uppercase">
          Next payment
        </div>
        {!frequencyChosen ? (
          <div className="text-[15px]">Pick how often the family pays.</div>
        ) : preview.next ? (
          <>
            <div className="text-[15px]">
              <strong>{formatInr(preview.next.amount)}</strong> on{' '}
              {formatLongDate(preview.next.dueDate)}
            </div>
            <div className="text-[13.5px] text-ink-soft">
              {describePayments(preview.payments, formatInr)}
            </div>
          </>
        ) : (
          <div className="text-[15px]">
            {preview.total > 0 ? 'Nothing more to pay.' : 'Enter the fees to see the payments.'}
          </div>
        )}
      </div>
    </aside>
  )
}
