import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { ApiError } from '@/api/errors'
import { useVehicles } from '@/features/vehicles/api'
import { vehicleTypeLabels } from '@/features/vehicles/labels'
import { Button } from '@/ui/Button'
import { Dialog } from '@/ui/Dialog'
import { Field } from '@/ui/Field'
import { Select } from '@/ui/Select'
import { TextInput } from '@/ui/TextInput'
import { useToast } from '@/ui/useToast'
import { useCreateRoute } from '../api'

const schema = z.object({
  name: z.string().trim().min(1, 'Enter the route name.'),
  vehicleId: z.string(),
})
type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onClose: () => void
  /** Called with the new route's id, so the page can select it. */
  onCreated: (routeId: number) => void
}

export function AddRouteDialog({ open, onClose, onCreated }: Props) {
  return (
    <Dialog open={open} title="Add route" onClose={onClose}>
      <AddRouteForm onClose={onClose} onCreated={onCreated} />
    </Dialog>
  )
}

function AddRouteForm({ onClose, onCreated }: Omit<Props, 'open'>) {
  const toast = useToast()
  const create = useCreateRoute()
  const vehicles = useVehicles()
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', vehicleId: '' },
  })

  async function save(values: FormValues) {
    setServerError(null)
    try {
      const route = await create.mutateAsync({
        name: values.name.trim(),
        vehicleId: values.vehicleId === '' ? null : Number(values.vehicleId),
      })
      toast.show('Route added')
      onClose()
      onCreated(route.id)
    } catch (error) {
      if (!(error instanceof ApiError)) {
        setServerError('Something went wrong. Try again.')
        return
      }
      if (error.fields.name) setError('name', { message: error.fields.name })
      else if (error.fields.vehicleId) setError('vehicleId', { message: error.fields.vehicleId })
      else setServerError(error.message)
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit(save)} className="flex flex-col gap-4">
      <Field label="Route name" error={errors.name?.message}>
        <TextInput {...register('name')} />
      </Field>
      <Field
        label="Vehicle"
        hint="You can pick the vehicle later. Add the stops after the route is saved."
        error={errors.vehicleId?.message}
      >
        <Select {...register('vehicleId')} disabled={vehicles.isPending}>
          <option value="">{vehicles.isPending ? 'Loading…' : 'No vehicle yet'}</option>
          {vehicles.data?.map((v) => (
            <option key={v.id} value={v.id} disabled={v.routeId !== null}>
              {v.name} · {vehicleTypeLabels[v.vehicleType]}
              {v.routeId !== null ? ` · runs ${v.route}` : ''}
            </option>
          ))}
        </Select>
      </Field>
      {serverError && (
        <p role="alert" className="border border-bad bg-bad-soft p-3 font-semibold text-bad">
          {serverError}
        </p>
      )}
      <div className="mt-2 flex flex-wrap justify-end gap-3">
        <Button variant="plain" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" saving={create.isPending}>
          Add route
        </Button>
      </div>
    </form>
  )
}
