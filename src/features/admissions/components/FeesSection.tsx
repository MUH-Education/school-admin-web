import { useEffect } from 'react'
import { Controller, type UseFormReturn, useWatch } from 'react-hook-form'
import { useClassFees, useSessions } from '@/features/fees/api'
import {
  discountReasons,
  frequencies,
  frequencyLabels,
  payModeLabels,
  payModes,
  type Frequency,
} from '@/features/fees/types'
import { useSettings } from '@/features/routes/api'
import { ChoiceGroup } from '@/ui/ChoiceGroup'
import { Field } from '@/ui/Field'
import { FormGrid, FormSection } from '@/ui/FormSection'
import { MoneyInput } from '@/ui/MoneyInput'
import { Select } from '@/ui/Select'
import type { AdmissionValues } from '../form'

/** "UKG" → "Class UKG"; "Class 5" stays as it is. */
function classWords(className: string): string {
  return className.startsWith('Class ') ? className : `Class ${className}`
}

/** Part 4: what the family pays in the year, and what they paid today. */
export function FeesSection({ form }: { form: UseFormReturn<AdmissionValues> }) {
  const {
    register,
    control,
    setValue,
    formState: { errors },
  } = form
  const className = useWatch({ control, name: 'className' })
  const usesBus = useWatch({ control, name: 'usesBus' })

  // The fee of the class comes from Fee setup, for the school year in progress.
  const sessions = useSessions()
  const sessionId = sessions.data?.find((s) => s.current)?.id ?? null
  const classFees = useClassFees(sessionId)
  const settings = useSettings()

  const classFee = classFees.data?.find((f) => f.className === className)?.amount ?? null
  const classFeeKnown = classFees.data !== undefined && className !== ''
  // Typing in the box is never overwritten by a refetch: only a new class or a new amount refills it.
  useEffect(() => {
    if (classFeeKnown) setValue('schoolFee', classFee, { shouldValidate: false })
  }, [className, classFee, classFeeKnown, setValue])

  const busFeePerChild = settings.data?.busFeePerChild ?? null
  useEffect(() => {
    if (usesBus === 'YES') setValue('busFee', busFeePerChild, { shouldValidate: false })
    if (usesBus === 'NO') setValue('busFee', 0, { shouldValidate: false })
  }, [usesBus, busFeePerChild, setValue])

  const schoolHint = !className
    ? 'Pick the class in part 1 and the fee is filled in.'
    : classFees.isError
      ? 'The class fee could not be read. Enter the fee here.'
      : classFee === null && classFeeKnown
        ? `The fee for ${classWords(className)} is not set yet. Enter it here.`
        : `Filled from the fee set for ${classWords(className)}. You can change it.`

  return (
    <FormSection
      title="4. Fees"
      description="What this family will pay in the year, and what they paid today."
    >
      <FormGrid>
        <Field
          label="School fee for the year (₹) *"
          hint={schoolHint}
          error={errors.schoolFee?.message}
        >
          <Controller
            control={control}
            name="schoolFee"
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
        {usesBus === 'YES' && (
          <Field
            label="Bus fee for the year (₹)"
            hint="Filled because the child uses the bus."
            error={errors.busFee?.message}
          >
            <Controller
              control={control}
              name="busFee"
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
        )}
        <Field label="Discount (₹)" error={errors.discount?.message}>
          <Controller
            control={control}
            name="discount"
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
        <Field label="Reason for discount" error={errors.discountReason?.message}>
          <Select {...register('discountReason')}>
            <option value="">No discount</option>
            {discountReasons.map((reason) => (
              <option key={reason} value={reason}>
                {reason}
              </option>
            ))}
          </Select>
        </Field>
      </FormGrid>

      <div className="flex flex-col gap-2">
        <Controller
          control={control}
          name="frequency"
          render={({ field }) => (
            <ChoiceGroup
              legend="The family will pay *"
              value={field.value as Frequency}
              onChange={field.onChange}
              choices={frequencies.map((value) => ({ value, label: frequencyLabels[value] }))}
            />
          )}
        />
        {errors.frequency?.message && (
          <p role="alert" className="text-[13px] font-semibold text-bad">
            {errors.frequency.message}
          </p>
        )}
      </div>

      <div className="h-px bg-rule" />
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-semibold">First payment, received today</h3>
        <p className="text-sm text-ink-soft">Leave empty if the family pays later.</p>
      </div>
      <FormGrid>
        <Field label="Amount received (₹)" error={errors.firstPaymentAmount?.message}>
          <Controller
            control={control}
            name="firstPaymentAmount"
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
        <Field label="Paid by" error={errors.firstPaymentMode?.message}>
          <Select {...register('firstPaymentMode')}>
            {payModes.map((mode) => (
              <option key={mode} value={mode}>
                {payModeLabels[mode]}
              </option>
            ))}
          </Select>
        </Field>
      </FormGrid>
    </FormSection>
  )
}
