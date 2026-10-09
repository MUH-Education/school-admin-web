import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { ApiError } from '@/api/errors'
import { normalizePhone } from '@/lib/phone'
import { Button } from '@/ui/Button'
import { Checkbox } from '@/ui/Checkbox'
import { ConfirmDialog } from '@/ui/ConfirmDialog'
import { Field } from '@/ui/Field'
import { InlineForm } from '@/ui/InlineForm'
import { Panel } from '@/ui/Panel'
import { PhoneInput } from '@/ui/PhoneInput'
import { Select } from '@/ui/Select'
import { TextInput } from '@/ui/TextInput'
import { useToast } from '@/ui/useToast'
import { useAddGuardian, useRemoveGuardian, useUpdateGuardian } from '../api'
import { relationLabels, relations, type Guardian, type Relation, type Student } from '../types'
import type { Editing } from '../pages/StudentPage'

interface Props {
  student: Student
  canEdit: boolean
  editing: Editing
  setEditing: (next: Editing) => void
}

/** Parents and other people with a phone number. A child can have many numbers. */
export function PhonesBox({ student, canEdit, editing, setEditing }: Props) {
  const only = student.guardians.length <= 1
  return (
    <Panel
      aria-label="Parents and phone numbers"
      className="flex flex-col gap-4 px-6 pt-[22px] pb-6"
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-[17px] font-semibold">Parents and phone numbers</h2>
        <p className="text-[13.5px] text-ink-soft">
          A child can have many numbers: father, mother, grandfather, uncle.
        </p>
      </div>

      <ul aria-label="Phone numbers" className="border border-rule">
        {student.guardians.map((guardian, index) => {
          const open = editing?.box === 'phone' && editing.id === guardian.id
          return (
            <li key={guardian.id} className={index > 0 ? 'border-t border-rule' : ''}>
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 px-4 py-3">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-[15px] font-semibold">
                    {guardian.name}{' '}
                    <span className="font-normal text-ink-soft">
                      · {relationLabels[guardian.relation]}
                    </span>
                  </span>
                  <span className="font-mono text-[13px]">
                    {guardian.phone}{' '}
                    <span className="font-sans text-ink-soft">
                      · {guardian.receivesSms ? 'gets bus SMS' : 'no bus SMS'}
                    </span>
                  </span>
                </div>
                {canEdit && !open && (
                  <Button
                    variant="secondary"
                    aria-label={`Edit ${guardian.name}`}
                    onClick={() => setEditing({ box: 'phone', id: guardian.id })}
                    className="border-rule"
                  >
                    Edit
                  </Button>
                )}
              </div>
              {open && (
                <EditPhoneForm
                  student={student}
                  guardian={guardian}
                  canRemove={!only}
                  onDone={() => setEditing(null)}
                />
              )}
            </li>
          )
        })}
      </ul>

      {canEdit &&
        (editing?.box === 'phone-add' ? (
          <AddPhoneForm student={student} onDone={() => setEditing(null)} />
        ) : (
          <div>
            <Button variant="secondary" onClick={() => setEditing({ box: 'phone-add' })}>
              Add a phone number
            </Button>
          </div>
        ))}
    </Panel>
  )
}

const addSchema = z.object({
  name: z.string().trim().min(1, 'Enter the name.'),
  relation: z.string().refine((v) => v !== '', 'Pick the relation.'),
  phone: z.string().refine((v) => normalizePhone(v) !== null, 'Enter a 10-digit mobile number.'),
  receivesSms: z.boolean(),
})
type AddValues = z.infer<typeof addSchema>
const addFields = ['name', 'relation', 'phone', 'receivesSms'] as const

function AddPhoneForm({ student, onDone }: { student: Student; onDone: () => void }) {
  const toast = useToast()
  const add = useAddGuardian(student.id)
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<AddValues>({
    resolver: zodResolver(addSchema),
    defaultValues: { name: '', relation: '', phone: '', receivesSms: true },
  })

  async function save(values: AddValues) {
    setServerError(null)
    try {
      await add.mutateAsync({
        name: values.name.trim(),
        relation: values.relation as Relation,
        phone: values.phone.trim(),
        receivesSms: values.receivesSms,
      })
      toast.show('Phone number added')
      onDone()
    } catch (error) {
      if (!(error instanceof ApiError)) {
        setServerError('Something went wrong. Try again.')
        return
      }
      const names = addFields.filter((name) => error.fields[name])
      for (const name of names) setError(name, { message: error.fields[name] })
      // PHONE_ALREADY_LINKED and the rest: the server's own words.
      if (names.length === 0) setServerError(error.message)
    }
  }

  return (
    <InlineForm
      framed
      title="Add a phone number"
      submitLabel="Save number"
      saving={add.isPending}
      error={serverError}
      onSubmit={() => void handleSubmit(save)()}
      onCancel={onDone}
    >
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(200px,100%),1fr))] gap-x-5 gap-y-4">
        <Field label="Name" error={errors.name?.message}>
          <TextInput {...register('name')} />
        </Field>
        <Field label="Relation to the child" error={errors.relation?.message}>
          <Select {...register('relation')}>
            <option value="">Pick the relation</option>
            {relations.map((relation) => (
              <option key={relation} value={relation}>
                {relationLabels[relation]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Phone number" error={errors.phone?.message}>
          <PhoneInput className="font-mono" {...register('phone')} />
        </Field>
      </div>
      <Checkbox label="Send bus SMS to this number too" {...register('receivesSms')} />
      <p className="text-[13.5px] text-ink-soft">
        If this number is already saved for a brother or sister, both children are joined to it. You
        do not type it twice.
      </p>
    </InlineForm>
  )
}

const editSchema = z.object({
  name: z.string().trim().min(1, 'Enter the name.'),
  relation: z.string().refine((v) => v !== '', 'Pick the relation.'),
  receivesSms: z.boolean(),
})
type EditValues = z.infer<typeof editSchema>
const editFields = ['name', 'relation', 'receivesSms'] as const

interface EditProps {
  student: Student
  guardian: Guardian
  /** False for the last number: it has no remove button. */
  canRemove: boolean
  onDone: () => void
}

function EditPhoneForm({ student, guardian, canRemove, onDone }: EditProps) {
  const toast = useToast()
  const update = useUpdateGuardian(student.id)
  const remove = useRemoveGuardian(student.id)
  const [serverError, setServerError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      name: guardian.name,
      relation: guardian.relation,
      receivesSms: guardian.receivesSms,
    },
  })

  function fail(error: unknown) {
    if (!(error instanceof ApiError)) {
      setServerError('Something went wrong. Try again.')
      return
    }
    const names = editFields.filter((name) => error.fields[name])
    for (const name of names) setError(name, { message: error.fields[name] })
    if (names.length === 0) setServerError(error.message)
  }

  async function save(values: EditValues) {
    setServerError(null)
    try {
      await update.mutateAsync({
        id: guardian.id,
        body: {
          name: values.name.trim(),
          relation: values.relation as Relation,
          receivesSms: values.receivesSms,
        },
      })
      toast.show('Phone number saved')
      onDone()
    } catch (error) {
      fail(error)
    }
  }

  async function takeOff() {
    setServerError(null)
    try {
      await remove.mutateAsync(guardian.id)
      toast.show('Phone number removed')
      onDone()
    } catch (error) {
      // LAST_GUARDIAN: the server's message is shown as it is.
      setConfirming(false)
      fail(error)
    }
  }

  return (
    <>
      <InlineForm
        title={`Edit ${guardian.name}`}
        submitLabel="Save"
        saving={update.isPending}
        error={serverError}
        onSubmit={() => void handleSubmit(save)()}
        onCancel={onDone}
        extraActions={
          canRemove && (
            <Button variant="danger" className="min-h-12" onClick={() => setConfirming(true)}>
              Remove this number
            </Button>
          )
        }
      >
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(200px,100%),1fr))] gap-x-5 gap-y-4">
          <Field label="Name" error={errors.name?.message}>
            <TextInput {...register('name')} />
          </Field>
          <Field label="Relation to the child" error={errors.relation?.message}>
            <Select {...register('relation')}>
              {relations.map((relation) => (
                <option key={relation} value={relation}>
                  {relationLabels[relation]}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <p className="text-[13.5px] text-ink-soft">
          Phone number <span className="font-mono text-ink">{guardian.phone}</span>. A number cannot
          be changed here. Add the new number, then remove this one.
        </p>
        <Checkbox label="Send bus SMS to this number" {...register('receivesSms')} />
      </InlineForm>
      <ConfirmDialog
        open={confirming}
        title={`Remove the number of ${guardian.name}?`}
        message="This number stops getting messages about this child."
        confirmLabel="Remove number"
        danger
        saving={remove.isPending}
        onConfirm={() => void takeOff()}
        onCancel={() => setConfirming(false)}
      />
    </>
  )
}
