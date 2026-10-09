import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { ApiError } from '@/api/errors'
import { formatDayMonth, todayIso } from '@/lib/format'
import { ChoiceGroup } from '@/ui/ChoiceGroup'
import { DateInput } from '@/ui/DateInput'
import { Field } from '@/ui/Field'
import { InlineForm } from '@/ui/InlineForm'
import { Select } from '@/ui/Select'
import { useToast } from '@/ui/useToast'
import { useChangeAssignment, useStaff } from '../api'
import { dutyLabels, reasonLabels } from '../labels'
import type { AssignmentReason, Duty, VehicleDetail, VehiclePerson } from '../types'

const ADD_NEW = 'NEW'

const schema = z
  .object({
    staffId: z.string().min(1, 'Pick a person.'),
    fromDate: z.string().min(1, 'Enter the date.'),
    reason: z.enum(['ON_LEAVE', 'LEFT_SCHOOL', 'MOVED', 'OTHER']),
    length: z.enum(['TEMP', 'FOREVER']),
    toDate: z.string(),
  })
  .superRefine((v, ctx) => {
    if (v.length !== 'TEMP') return
    if (!v.toDate) {
      ctx.addIssue({ code: 'custom', path: ['toDate'], message: 'Enter the last day.' })
    } else if (v.fromDate && v.toDate < v.fromDate) {
      ctx.addIssue({
        code: 'custom',
        path: ['toDate'],
        message: 'The last day must not be before the first day.',
      })
    }
  })
type FormValues = z.infer<typeof schema>
const knownFields = ['staffId', 'fromDate', 'reason', 'toDate'] as const

interface Props {
  vehicle: VehicleDetail
  duty: Duty
  /** Who does the job now. Missing when nobody does. */
  current?: VehiclePerson
  onDone: () => void
  /** The person picked "Add a new …". */
  onAddNew: () => void
}

/** "Change the driver of Van 4": opens inside the people box. */
export function ChangePersonForm({ vehicle, duty, current, onDone, onAddNew }: Props) {
  const toast = useToast()
  const change = useChangeAssignment(vehicle.id)
  const staff = useStaff(duty)
  const [serverError, setServerError] = useState<string | null>(null)
  const jobWord = dutyLabels[duty].toLowerCase()

  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      staffId: '',
      fromDate: todayIso(),
      reason: 'ON_LEAVE',
      length: current ? 'TEMP' : 'FOREVER',
      toDate: '',
    },
  })
  const watched = useWatch({ control })
  const picked = staff.data?.find((p) => String(p.id) === watched.staffId)
  const others = (staff.data ?? []).filter((p) => p.id !== current?.staffId)

  const tempLabel =
    watched.toDate && current
      ? `Only till ${formatDayMonth(watched.toDate)}, then ${current.name} is back`
      : current
        ? `Only till a date, then ${current.name} is back`
        : 'Only till a date'

  async function save(values: FormValues) {
    setServerError(null)
    const temporary = values.length === 'TEMP'
    try {
      await change.mutateAsync({
        duty,
        staffId: Number(values.staffId),
        fromDate: values.fromDate,
        ...(temporary ? { toDate: values.toDate } : {}),
        temporary,
        reason: values.reason as AssignmentReason,
      })
      toast.show(`${dutyLabels[duty]} changed`)
      onDone()
    } catch (error) {
      if (!(error instanceof ApiError)) {
        setServerError('Something went wrong. Try again.')
        return
      }
      const names = knownFields.filter((name) => error.fields[name])
      for (const name of names) setError(name, { message: error.fields[name] })
      if (names.length === 0) setServerError(error.message)
    }
  }

  return (
    <InlineForm
      title={
        current ? `Change the ${jobWord} of ${vehicle.name}` : `Add a ${jobWord} to ${vehicle.name}`
      }
      submitLabel="Save change"
      saving={change.isPending}
      error={serverError}
      onSubmit={() => void handleSubmit(save)()}
      onCancel={onDone}
    >
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(200px,100%),1fr))] gap-x-5 gap-y-4">
        <Field label={`New ${jobWord}`} error={errors.staffId?.message}>
          <Select
            {...register('staffId', {
              onChange: (event: { target: { value: string } }) => {
                if (event.target.value === ADD_NEW) {
                  setValue('staffId', '')
                  onAddNew()
                }
              },
            })}
          >
            <option value="">{staff.isPending ? 'Loading…' : `Pick a ${jobWord}`}</option>
            {others.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {p.vehicle ? `now on ${p.vehicle}` : 'free now'}
              </option>
            ))}
            <option value={ADD_NEW}>Add a new {jobWord}</option>
          </Select>
        </Field>
        <Field label="From date" error={errors.fromDate?.message}>
          <DateInput {...register('fromDate')} />
        </Field>
        <Field label="Reason" error={errors.reason?.message}>
          <Select {...register('reason')}>
            {(Object.keys(reasonLabels) as AssignmentReason[]).map((reason) => (
              <option key={reason} value={reason}>
                {reasonLabels[reason]}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      {current && (
        <Controller
          control={control}
          name="length"
          render={({ field }) => (
            <ChoiceGroup
              legend="For how long"
              value={field.value}
              onChange={field.onChange}
              choices={[
                { value: 'TEMP', label: tempLabel },
                { value: 'FOREVER', label: 'From now on' },
              ]}
            />
          )}
        />
      )}
      {watched.length === 'TEMP' && current && (
        <div className="max-w-[240px]">
          <Field label="Last day" error={errors.toDate?.message}>
            <DateInput {...register('toDate')} />
          </Field>
        </div>
      )}

      {picked && (
        <p className="text-[13.5px] text-ink-soft">
          {picked.vehicle
            ? `${picked.name} is now on ${picked.vehicle}. The change is refused if ${picked.name} is busy on these days.`
            : `${picked.name} is free, so no other vehicle is left without a ${jobWord}.`}
        </p>
      )}
    </InlineForm>
  )
}
