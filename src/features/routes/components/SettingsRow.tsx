import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { ApiError } from '@/api/errors'
import { formatInr } from '@/lib/format'
import { Field } from '@/ui/Field'
import { MoneyInput } from '@/ui/MoneyInput'
import { Panel } from '@/ui/Panel'
import { ReadOnlyField } from '@/ui/ReadOnlyField'
import { TextInput } from '@/ui/TextInput'
import { useToast } from '@/ui/useToast'
import { useSaveSettings } from '../api'
import type { Settings } from '../types'

const schema = z.object({
  busMonths: z.string().regex(/^([1-9]|1[0-2])$/, 'Enter a number from 1 to 12.'),
  busFeePerChild: z.number('Enter the fee in rupees.').nonnegative('Enter the fee in rupees.'),
  feeCollectedPercent: z.string().regex(/^(\d{1,2}|100)$/, 'Enter a number from 0 to 100.'),
})
type FormValues = z.infer<typeof schema>

const note =
  'Change a number and every cost on this page is counted again. Example: fee ₹8,800 × 95% collected = ₹8,360 got per child.'

interface Props {
  settings: Settings
  /** True with SETTINGS_EDIT. Others see plain text. */
  canEdit: boolean
}

export function SettingsRow({ settings, canEdit }: Props) {
  if (!canEdit) {
    return (
      <Panel aria-label="Settings used for cost" className="px-5 pt-4 pb-[18px]">
        <dl className="flex flex-wrap items-start gap-x-8 gap-y-3.5">
          <ReadOnlyField label="Months the buses run" mono>
            {settings.busMonths}
          </ReadOnlyField>
          <ReadOnlyField label="Bus fee per child, per year" mono>
            {formatInr(settings.busFeePerChild)}
          </ReadOnlyField>
          <ReadOnlyField label="Fee collected" mono>
            {settings.feeCollectedPercent}%
          </ReadOnlyField>
          <p className="max-w-[420px] flex-[2_1_260px] pb-1 text-[13px] text-ink-soft">{note}</p>
        </dl>
      </Panel>
    )
  }
  return <EditableSettings settings={settings} />
}

function EditableSettings({ settings }: { settings: Settings }) {
  const toast = useToast()
  const save = useSaveSettings()
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      busMonths: String(settings.busMonths),
      busFeePerChild: settings.busFeePerChild,
      feeCollectedPercent: String(settings.feeCollectedPercent),
    },
  })

  async function submit(values: FormValues) {
    const next: Settings = {
      busMonths: Number(values.busMonths),
      busFeePerChild: values.busFeePerChild,
      feeCollectedPercent: Number(values.feeCollectedPercent),
    }
    if (
      next.busMonths === settings.busMonths &&
      next.busFeePerChild === settings.busFeePerChild &&
      next.feeCollectedPercent === settings.feeCollectedPercent
    ) {
      return
    }
    setServerError(null)
    try {
      await save.mutateAsync(next)
      toast.show('Numbers saved')
    } catch (error) {
      if (!(error instanceof ApiError)) {
        setServerError('Something went wrong. Try again.')
        return
      }
      for (const name of ['busMonths', 'busFeePerChild', 'feeCollectedPercent'] as const) {
        if (error.fields[name]) setError(name, { message: error.fields[name] })
      }
      if (Object.keys(error.fields).length === 0) setServerError(error.message)
    }
  }

  // The numbers are saved when the person leaves a box or presses Enter.
  const saveNow = () => void handleSubmit(submit)()

  return (
    <Panel aria-label="Settings used for cost" className="px-5 pt-4 pb-[18px]">
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          saveNow()
        }}
        className="flex flex-wrap items-start gap-x-5 gap-y-3.5"
      >
        <div className="max-w-[240px] flex-[1_1_170px]">
          <Field label="Months the buses run" error={errors.busMonths?.message}>
            <TextInput
              inputMode="numeric"
              className="min-h-11 font-mono"
              {...register('busMonths', { onBlur: saveNow })}
            />
          </Field>
        </div>
        <div className="max-w-[240px] flex-[1_1_170px]">
          <Field label="Bus fee per child, per year (₹)" error={errors.busFeePerChild?.message}>
            <Controller
              control={control}
              name="busFeePerChild"
              render={({ field }) => (
                <MoneyInput
                  ref={field.ref}
                  className="min-h-11 font-mono"
                  value={Number.isFinite(field.value) ? field.value : null}
                  onValueChange={(value) => field.onChange(value ?? Number.NaN)}
                  onBlur={() => {
                    field.onBlur()
                    saveNow()
                  }}
                />
              )}
            />
          </Field>
        </div>
        <div className="max-w-[240px] flex-[1_1_170px]">
          <Field label="Fee collected (%)" error={errors.feeCollectedPercent?.message}>
            <TextInput
              inputMode="numeric"
              className="min-h-11 font-mono"
              {...register('feeCollectedPercent', { onBlur: saveNow })}
            />
          </Field>
        </div>
        <p className="max-w-[420px] flex-[2_1_260px] self-end pb-1 text-[13px] text-ink-soft">
          {note}
        </p>
        {serverError && (
          <p role="alert" className="w-full text-[13px] font-semibold text-bad">
            {serverError}
          </p>
        )}
      </form>
    </Panel>
  )
}
