import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { ApiError } from '@/api/errors'
import { roleLabels } from '@/auth/roles'
import type { RoleCode } from '@/auth/types'
import { normalizePhone } from '@/lib/phone'
import { Button } from '@/ui/Button'
import { ConfirmDialog } from '@/ui/ConfirmDialog'
import { Dialog } from '@/ui/Dialog'
import { Field } from '@/ui/Field'
import { PhoneInput } from '@/ui/PhoneInput'
import { Select } from '@/ui/Select'
import { TextInput } from '@/ui/TextInput'
import { useToast } from '@/ui/useToast'
import { useAttendants, useCreateUser, useUpdateUser } from '../api'
import type { Role, User } from '../types'

function makeSchema(adding: boolean) {
  return z
    .object({
      phone: z
        .string()
        .refine((value) => normalizePhone(value) !== null, 'Enter a 10-digit mobile number.'),
      name: z.string(),
      role: z.string().min(1, 'Pick a role.'),
      staffId: z.string(),
      active: z.boolean(),
    })
    .refine((v) => !adding || v.role !== 'ATTENDANT' || v.staffId !== '', {
      path: ['staffId'],
      message: 'Pick the attendant.',
    })
}
type FormValues = z.infer<ReturnType<typeof makeSchema>>

interface Props {
  open: boolean
  /** Missing: the dialog adds a user. Given: it edits this user. */
  user?: User
  roles: Role[]
  onClose: () => void
}

export function UserFormDialog({ open, user, roles, onClose }: Props) {
  return (
    <Dialog open={open} title={user ? 'Edit user' : 'Add user'} onClose={onClose}>
      <UserForm user={user} roles={roles} onClose={onClose} />
    </Dialog>
  )
}

const knownFields = ['phone', 'name', 'role', 'staffId'] as const

function UserForm({ user, roles, onClose }: Omit<Props, 'open'>) {
  const toast = useToast()
  const create = useCreateUser()
  const update = useUpdateUser()
  const [serverError, setServerError] = useState<string | null>(null)
  const [confirmOff, setConfirmOff] = useState<FormValues | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(makeSchema(!user)),
    defaultValues: {
      phone: user?.phone ?? '',
      name: user?.name ?? '',
      role: user?.role ?? '',
      staffId: '',
      active: user?.active ?? true,
    },
  })

  const role = watch('role')
  const asksForAttendant = !user && role === 'ATTENDANT'
  const attendants = useAttendants(asksForAttendant)
  const saving = create.isPending || update.isPending

  async function save(values: FormValues) {
    setServerError(null)
    setConfirmOff(null)
    try {
      if (user) {
        await update.mutateAsync({
          id: user.id,
          body: {
            phone: values.phone,
            name: values.name,
            role: values.role as RoleCode,
            active: values.active,
          },
        })
        toast.show('User saved')
      } else {
        await create.mutateAsync({
          phone: values.phone,
          role: values.role as RoleCode,
          ...(values.name.trim() ? { name: values.name.trim() } : {}),
          ...(values.role === 'ATTENDANT' ? { staffId: Number(values.staffId) } : {}),
        })
        toast.show('User added')
      }
      onClose()
    } catch (error) {
      if (!(error instanceof ApiError)) {
        setServerError('Something went wrong. Try again.')
        return
      }
      const fieldNames = knownFields.filter((name) => error.fields[name])
      for (const name of fieldNames) setError(name, { message: error.fields[name] })
      if (fieldNames.length === 0) setServerError(error.message)
    }
  }

  function submit(values: FormValues) {
    if (user?.active && !values.active) setConfirmOff(values)
    else void save(values)
  }

  return (
    <>
      <form noValidate onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
        <Field label="Mobile number" error={errors.phone?.message}>
          <PhoneInput {...register('phone')} />
        </Field>
        <Field label="Role" error={errors.role?.message}>
          <Select {...register('role')}>
            <option value="">Pick a role</option>
            {roles.map((r) => (
              <option key={r.role} value={r.role}>
                {roleLabels[r.role]}
              </option>
            ))}
          </Select>
        </Field>
        {asksForAttendant && (
          <Field label="Which attendant?" error={errors.staffId?.message}>
            <Select {...register('staffId')} disabled={attendants.isPending}>
              <option value="">{attendants.isPending ? 'Loading…' : 'Pick the attendant'}</option>
              {attendants.data?.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                  {a.route ? ` · ${a.route}` : ''}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field label="Name (optional)" error={errors.name?.message}>
          <TextInput {...register('name')} />
        </Field>
        {user && (
          <label className="flex items-center gap-2 text-[15px] font-semibold">
            <input type="checkbox" className="size-5" {...register('active')} />
            Login is on
          </label>
        )}

        {serverError && (
          <p role="alert" className="border border-bad bg-bad-soft p-3 font-semibold text-bad">
            {serverError}
          </p>
        )}

        <div className="mt-2 flex flex-wrap justify-end gap-3">
          <Button variant="plain" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" saving={saving}>
            {user ? 'Save' : 'Add user'}
          </Button>
        </div>
      </form>

      <ConfirmDialog
        open={confirmOff !== null}
        title={`Turn off ${user?.name ?? 'this person'}'s login?`}
        message="They will not be able to log in until you turn it on again. Their old records stay."
        confirmLabel="Turn off"
        danger
        saving={saving}
        onConfirm={() => confirmOff && void save(confirmOff)}
        onCancel={() => setConfirmOff(null)}
      />
    </>
  )
}
