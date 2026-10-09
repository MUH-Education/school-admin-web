import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { ApiError } from '@/api/errors'
import { useRecordPayment } from '@/features/fees/api'
import {
  feeHeadLabels,
  payModeLabels,
  payModes,
  type FeeHead,
  type PaymentBody,
  type StudentFees,
} from '@/features/fees/types'
import { formatInr, todayIso } from '@/lib/format'
import { Button } from '@/ui/Button'
import { ChoiceGroup } from '@/ui/ChoiceGroup'
import { DateInput } from '@/ui/DateInput'
import { Dialog } from '@/ui/Dialog'
import { Field } from '@/ui/Field'
import { MoneyInput } from '@/ui/MoneyInput'
import { Select } from '@/ui/Select'
import { TextArea } from '@/ui/TextArea'
import { useToast } from '@/ui/useToast'

type Which = FeeHead | 'BOTH'

const schema = z
  .object({
    which: z.string(),
    schoolAmount: z.number().nullable(),
    busAmount: z.number().nullable(),
    paidOn: z.string().min(1, 'Enter the date.'),
    mode: z.string().min(1, 'Pick how it was paid.'),
    note: z.string(),
  })
  .superRefine((v, ctx) => {
    const problem = (path: 'schoolAmount' | 'busAmount' | 'paidOn', message: string) =>
      ctx.addIssue({ code: 'custom', path: [path], message })
    const school = v.which !== 'BUS'
    const bus = v.which !== 'SCHOOL'
    if (school && !v.schoolAmount) problem('schoolAmount', 'Enter the amount received.')
    if (bus && !v.busAmount) problem('busAmount', 'Enter the amount received.')
    if (v.paidOn > todayIso()) problem('paidOn', 'The date is in the future.')
  })

type Values = z.infer<typeof schema>

interface Props {
  open: boolean
  studentId: number
  fees: StudentFees
  onClose: () => void
}

/** What each fee head still has to pay in the year. A payment may not be more than this. */
function leftOf(fees: StudentFees, head: FeeHead): number {
  const h = fees.heads.find((x) => x.head === head)
  return h ? h.total - h.paid : 0
}

/** "Record a payment": which fee, how much, when, how. The server gives the receipt number. */
export function RecordPaymentDialog({ open, studentId, fees, onClose }: Props) {
  const toast = useToast()
  const record = useRecordPayment(studentId)
  const [serverError, setServerError] = useState<string | null>(null)
  const hasBus = fees.heads.some((h) => h.head === 'BUS')

  const pending = (head: FeeHead) => fees.heads.find((h) => h.head === head)?.pendingNow ?? 0
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      which: 'SCHOOL',
      // The money that is due now is the usual amount.
      schoolAmount: pending('SCHOOL') || null,
      busAmount: pending('BUS') || null,
      paidOn: todayIso(),
      mode: 'UPI',
      note: '',
    },
  })
  const {
    control,
    register,
    setError,
    formState: { errors },
  } = form
  const which = useWatch({ control, name: 'which' }) as Which

  const choices: { value: Which; label: string }[] = [
    { value: 'SCHOOL', label: feeHeadLabels.SCHOOL },
    ...(hasBus
      ? ([
          { value: 'BUS', label: feeHeadLabels.BUS },
          { value: 'BOTH', label: 'Both' },
        ] as const)
      : []),
  ]

  function close() {
    form.reset()
    setServerError(null)
    onClose()
  }

  async function save(v: Values) {
    setServerError(null)
    const body: PaymentBody = {
      schoolAmount: v.which === 'BUS' ? 0 : (v.schoolAmount ?? 0),
      busAmount: v.which === 'SCHOOL' ? 0 : (v.busAmount ?? 0),
      paidOn: v.paidOn,
      mode: v.mode as PaymentBody['mode'],
      ...(v.note.trim() ? { note: v.note.trim() } : {}),
    }
    try {
      const payment = await record.mutateAsync(body)
      toast.show(`Payment saved. Receipt number ${payment.receiptNo}`)
      close()
    } catch (error) {
      if (!(error instanceof ApiError)) {
        setServerError('Something went wrong. Try again.')
        return
      }
      // The server's own sentence goes under the amount that is too large.
      const names = (['schoolAmount', 'busAmount', 'paidOn', 'mode', 'note'] as const).filter(
        (name) => error.fields[name],
      )
      for (const name of names) setError(name, { message: error.fields[name] })
      if (names.length === 0 && error.code === 'PAYMENT_TOO_LARGE') {
        setError(which === 'BUS' ? 'busAmount' : 'schoolAmount', { message: error.message })
      } else if (names.length === 0) {
        setServerError(error.message)
      }
    }
  }

  const amountField = (name: 'schoolAmount' | 'busAmount', head: FeeHead) => (
    <Field
      label={`${feeHeadLabels[head]}: amount received (₹)`}
      hint={`Left to pay this year: ${formatInr(leftOf(fees, head))}`}
      error={errors[name]?.message}
      compact
    >
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <MoneyInput
            className="font-mono"
            value={field.value}
            onValueChange={field.onChange}
            onBlur={field.onBlur}
          />
        )}
      />
    </Field>
  )

  return (
    <Dialog open={open} title="Record a payment" onClose={close}>
      <form
        noValidate
        aria-label="Record a payment"
        onSubmit={(event) => void form.handleSubmit(save)(event)}
        className="flex flex-col gap-4"
      >
        <Controller
          control={control}
          name="which"
          render={({ field }) => (
            <ChoiceGroup
              legend="Which fee is paid?"
              value={field.value as Which}
              onChange={field.onChange}
              choices={choices}
            />
          )}
        />
        {which !== 'BUS' && amountField('schoolAmount', 'SCHOOL')}
        {which !== 'SCHOOL' && amountField('busAmount', 'BUS')}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Date" error={errors.paidOn?.message} compact>
            <DateInput {...register('paidOn')} />
          </Field>
          <Field label="Paid by" error={errors.mode?.message} compact>
            <Select {...register('mode')}>
              {payModes.map((mode) => (
                <option key={mode} value={mode}>
                  {payModeLabels[mode]}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Note (optional)" error={errors.note?.message} compact>
          <TextArea rows={2} {...register('note')} />
        </Field>
        {serverError && (
          <p role="alert" className="border border-bad bg-bad-soft p-3 font-semibold text-bad">
            {serverError}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="plain" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" saving={record.isPending}>
            Save payment
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
