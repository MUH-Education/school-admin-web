import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { z } from 'zod'
import { ApiError } from '@/api/errors'
import { Button } from '@/ui/Button'
import { DateInput } from '@/ui/DateInput'
import { Field } from '@/ui/Field'
import { MoneyInput } from '@/ui/MoneyInput'
import { Panel } from '@/ui/Panel'
import { Select } from '@/ui/Select'
import { TextInput } from '@/ui/TextInput'
import { useToast } from '@/ui/useToast'
import { useCreateVehicle, useSaveDocuments, useUpdateVehicle } from '../api'
import { ownedByLabels, paperLabels, paperOrder, vehicleTypeLabels } from '../labels'
import type { OwnedBy, PaperKind, VehicleDetail, VehicleType } from '../types'
import { PapersCell } from './PapersCell'

const schema = z.object({
  name: z.string().trim().min(1, 'Enter the name used in school.'),
  registrationNo: z.string().trim().min(1, 'Enter the registration number.'),
  vehicleType: z.enum(['SMALL_VAN', 'MID_BUS', 'BIG_BUS']),
  seats: z
    .string()
    .trim()
    .regex(/^[1-9]\d*$/, 'Seats must be 1 or more.'),
  monthlyCost: z.number('Enter the cost per month.').nonnegative('Enter the cost per month.'),
  ownedBy: z.enum(['SCHOOL', 'CONTRACTOR']),
  FITNESS: z.string().min(1, 'Enter a date.'),
  INSURANCE: z.string().min(1, 'Enter a date.'),
  PERMIT: z.string().min(1, 'Enter a date.'),
  POLLUTION: z.string().min(1, 'Enter a date.'),
})
type FormValues = z.infer<typeof schema>
const knownFields = [
  'name',
  'registrationNo',
  'vehicleType',
  'seats',
  'monthlyCost',
  'ownedBy',
  'FITNESS',
  'INSURANCE',
  'PERMIT',
  'POLLUTION',
] as const

function paperWord(status: 'VALID' | 'ENDING' | 'ENDED') {
  if (status === 'VALID') return { level: 'ok' as const, text: 'Valid' }
  return status === 'ENDING'
    ? { level: 'soon' as const, text: 'Ending soon' }
    : { level: 'ended' as const, text: 'Ended' }
}

interface Props {
  /** Missing: the form adds a new vehicle. */
  vehicle?: VehicleDetail
  /** Extra buttons at the end of the button row, for example "Remove this vehicle". */
  extraAction?: React.ReactNode
}

/** Vehicle details and the four paper dates. One Save button for both. */
export function VehicleForm({ vehicle, extraAction }: Props) {
  const toast = useToast()
  const navigate = useNavigate()
  const create = useCreateVehicle()
  const update = useUpdateVehicle(vehicle?.id ?? 0)
  const saveDocuments = useSaveDocuments()
  const [serverError, setServerError] = useState<string | null>(null)

  const paperValue = (kind: PaperKind) =>
    vehicle?.documents.find((d) => d.kind === kind)?.validTill ?? ''

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: vehicle?.name ?? '',
      registrationNo: vehicle?.registrationNo ?? '',
      vehicleType: vehicle?.vehicleType ?? 'SMALL_VAN',
      seats: vehicle ? String(vehicle.seats) : '',
      // The cost starts empty on a new vehicle. The schema asks for a number.
      monthlyCost: vehicle?.monthlyCost as number,
      ownedBy: vehicle?.ownedBy ?? 'SCHOOL',
      FITNESS: paperValue('FITNESS'),
      INSURANCE: paperValue('INSURANCE'),
      PERMIT: paperValue('PERMIT'),
      POLLUTION: paperValue('POLLUTION'),
    },
  })
  const saving = create.isPending || update.isPending || saveDocuments.isPending

  async function save(values: FormValues) {
    setServerError(null)
    const body = {
      name: values.name.trim(),
      registrationNo: values.registrationNo.trim(),
      vehicleType: values.vehicleType as VehicleType,
      seats: Number(values.seats),
      monthlyCost: values.monthlyCost,
      ownedBy: values.ownedBy as OwnedBy,
    }
    const documents = {
      FITNESS: values.FITNESS,
      INSURANCE: values.INSURANCE,
      PERMIT: values.PERMIT,
      POLLUTION: values.POLLUTION,
    }
    try {
      const saved = vehicle ? await update.mutateAsync(body) : await create.mutateAsync(body)
      await saveDocuments.mutateAsync({ id: saved.id, body: documents })
      if (vehicle) {
        toast.show('Vehicle saved')
      } else {
        toast.show('Vehicle added')
        void navigate(`/vehicles/${saved.id}`)
      }
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
    <form noValidate onSubmit={handleSubmit(save)} className="flex flex-col gap-6">
      <Panel aria-label="Vehicle details" className="flex flex-col gap-[18px] px-6 pt-[22px] pb-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-[17px] font-semibold">Vehicle details</h2>
          <p className="text-[13.5px] text-ink-soft">The same form is used to add a new vehicle.</p>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(200px,100%),1fr))] gap-x-5 gap-y-[18px]">
          <Field label="Name used in school *" error={errors.name?.message}>
            <TextInput {...register('name')} />
          </Field>
          <Field label="Registration number *" error={errors.registrationNo?.message}>
            <TextInput {...register('registrationNo')} className="font-mono" />
          </Field>
          <Field label="Type *" error={errors.vehicleType?.message}>
            <Select {...register('vehicleType')}>
              {(Object.keys(vehicleTypeLabels) as VehicleType[]).map((type) => (
                <option key={type} value={type}>
                  {vehicleTypeLabels[type]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Seats *" error={errors.seats?.message}>
            <TextInput inputMode="numeric" {...register('seats')} className="font-mono" />
          </Field>
          <Field label="Cost per month, all-in (₹) *" error={errors.monthlyCost?.message}>
            <Controller
              control={control}
              name="monthlyCost"
              render={({ field }) => (
                <MoneyInput
                  ref={field.ref}
                  onBlur={field.onBlur}
                  value={Number.isFinite(field.value) ? field.value : null}
                  onValueChange={(value) => field.onChange(value ?? Number.NaN)}
                  className="font-mono"
                />
              )}
            />
          </Field>
          <Field label="Owned by" error={errors.ownedBy?.message}>
            <Select {...register('ownedBy')}>
              {(Object.keys(ownedByLabels) as OwnedBy[]).map((owner) => (
                <option key={owner} value={owner}>
                  {ownedByLabels[owner]}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Panel>

      <Panel aria-label="Papers" className="flex flex-col gap-4 px-6 pt-[22px] pb-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-[17px] font-semibold">Papers</h2>
          <p className="text-[13.5px] text-ink-soft">
            The office gets a warning 30 days before a paper ends.
          </p>
        </div>
        <div className="flex flex-col">
          {paperOrder.map((kind) => {
            const saved = vehicle?.documents.find((d) => d.kind === kind)
            const word = saved ? paperWord(saved.status) : null
            const inputId = `paper-${kind}`
            const error = errors[kind]?.message
            return (
              <div key={kind} className="border-t border-rule py-2.5">
                <div className="grid grid-cols-[minmax(130px,1.2fr)_minmax(150px,1fr)_minmax(96px,auto)] items-center gap-x-4">
                  <label htmlFor={inputId} className="text-[15px] font-semibold">
                    {paperLabels[kind]}
                  </label>
                  <DateInput
                    id={inputId}
                    aria-invalid={error ? true : undefined}
                    {...register(kind)}
                    className={`min-h-11 ${error ? 'border-bad' : ''}`}
                  />
                  <div>{word && <PapersCell level={word.level}>{word.text}</PapersCell>}</div>
                </div>
                {error && (
                  <p role="alert" className="mt-1.5 text-[13px] font-semibold text-bad">
                    {error}
                  </p>
                )}
              </div>
            )
          })}
        </div>
        <p className="text-[13px] text-ink-soft">The date is the last day the paper is valid.</p>
      </Panel>

      {serverError && (
        <p role="alert" className="border border-bad bg-bad-soft p-3 font-semibold text-bad">
          {serverError}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <Button type="submit" saving={saving} className="min-h-12 px-6 text-[15px]">
          Save vehicle
        </Button>
        {extraAction}
      </div>
    </form>
  )
}
