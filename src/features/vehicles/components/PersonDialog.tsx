import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { ApiError } from '@/api/errors'
import { normalizePhone } from '@/lib/phone'
import { Button } from '@/ui/Button'
import { ConfirmDialog } from '@/ui/ConfirmDialog'
import { DateInput } from '@/ui/DateInput'
import { Dialog } from '@/ui/Dialog'
import { Field } from '@/ui/Field'
import { PhoneInput } from '@/ui/PhoneInput'
import { Select } from '@/ui/Select'
import { TextInput } from '@/ui/TextInput'
import { useToast } from '@/ui/useToast'
import { useCreateStaff, useDeleteStaff, useUpdateStaff } from '../api'
import { dutyLabels } from '../labels'
import type { Duty, Staff, StaffBody } from '../types'

const schema = z
  .object({
    name: z.string().trim().min(1, 'Enter the name.'),
    type: z.enum(['DRIVER', 'ATTENDANT', 'HELPER']),
    phone: z
      .string()
      .refine((value) => normalizePhone(value) !== null, 'Enter a 10-digit mobile number.'),
    licenceNo: z.string(),
    licenceValidTill: z.string(),
  })
  .superRefine((v, ctx) => {
    if (v.type !== 'DRIVER') return
    if (!v.licenceNo.trim()) {
      ctx.addIssue({ code: 'custom', path: ['licenceNo'], message: 'Enter the licence number.' })
    }
    if (!v.licenceValidTill) {
      ctx.addIssue({
        code: 'custom',
        path: ['licenceValidTill'],
        message: 'Enter the date the licence ends.',
      })
    }
  })
type FormValues = z.infer<typeof schema>

const knownFields = ['name', 'type', 'phone', 'licenceNo', 'licenceValidTill'] as const

interface Props {
  open: boolean
  /** Missing: the dialog adds a person. Given: it edits this person. */
  person?: Staff
  /** The work chosen first when adding. */
  defaultType?: Duty
  onClose: () => void
}

export function PersonDialog({ open, person, defaultType, onClose }: Props) {
  return (
    <Dialog open={open} title={person ? 'Edit person' : 'Add a person'} onClose={onClose}>
      <PersonForm person={person} defaultType={defaultType} onClose={onClose} />
    </Dialog>
  )
}

function PersonForm({ person, defaultType, onClose }: Omit<Props, 'open'>) {
  const toast = useToast()
  const create = useCreateStaff()
  const update = useUpdateStaff()
  const remove = useDeleteStaff()
  const [serverError, setServerError] = useState<string | null>(null)
  const [confirmOff, setConfirmOff] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: person?.name ?? '',
      type: person?.type ?? defaultType ?? 'DRIVER',
      phone: person?.phone ?? '',
      licenceNo: person?.licenceNo ?? '',
      licenceValidTill: person?.licenceValidTill ?? '',
    },
  })
  const type: Duty = useWatch({ control, name: 'type' })
  const saving = create.isPending || update.isPending

  function showError(error: unknown) {
    if (!(error instanceof ApiError)) {
      setServerError('Something went wrong. Try again.')
      return
    }
    const names = knownFields.filter((name) => error.fields[name])
    for (const name of names) setError(name, { message: error.fields[name] })
    if (names.length === 0) setServerError(error.message)
  }

  async function save(values: FormValues) {
    setServerError(null)
    const body: StaffBody = {
      name: values.name.trim(),
      type: values.type,
      phone: values.phone,
      ...(values.type === 'DRIVER'
        ? { licenceNo: values.licenceNo.trim(), licenceValidTill: values.licenceValidTill }
        : {}),
    }
    try {
      if (person) await update.mutateAsync({ id: person.id, body })
      else await create.mutateAsync(body)
      toast.show(person ? 'Person saved' : 'Person added')
      onClose()
    } catch (error) {
      showError(error)
    }
  }

  async function turnOff() {
    if (!person) return
    setServerError(null)
    try {
      await remove.mutateAsync(person.id)
      toast.show('Person turned off')
      onClose()
    } catch (error) {
      setConfirmOff(false)
      showError(error)
    }
  }

  return (
    <>
      <form noValidate onSubmit={handleSubmit(save)} className="flex flex-col gap-4">
        <Field label="Name" error={errors.name?.message}>
          <TextInput {...register('name')} />
        </Field>
        <Field label="Work" error={errors.type?.message}>
          <Select {...register('type')}>
            {(Object.keys(dutyLabels) as Duty[]).map((duty) => (
              <option key={duty} value={duty}>
                {dutyLabels[duty]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Mobile number" error={errors.phone?.message}>
          <PhoneInput {...register('phone')} />
        </Field>
        {type === 'DRIVER' && (
          <>
            <Field label="Licence number" error={errors.licenceNo?.message}>
              <TextInput {...register('licenceNo')} />
            </Field>
            <Field
              label="Licence valid till"
              hint="The last day the licence is valid."
              error={errors.licenceValidTill?.message}
            >
              <DateInput {...register('licenceValidTill')} />
            </Field>
          </>
        )}

        {serverError && (
          <p role="alert" className="border border-bad bg-bad-soft p-3 font-semibold text-bad">
            {serverError}
          </p>
        )}

        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          {person ? (
            <Button variant="danger" onClick={() => setConfirmOff(true)}>
              Turn off this person
            </Button>
          ) : (
            <span />
          )}
          <div className="flex flex-wrap gap-3">
            <Button variant="plain" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" saving={saving}>
              {person ? 'Save' : 'Add person'}
            </Button>
          </div>
        </div>
      </form>

      <ConfirmDialog
        open={confirmOff}
        title={`Turn off ${person?.name ?? 'this person'}?`}
        message="They will no longer be on the list. Old records keep their name."
        confirmLabel="Turn off"
        danger
        saving={remove.isPending}
        onConfirm={() => void turnOff()}
        onCancel={() => setConfirmOff(false)}
      />
    </>
  )
}
