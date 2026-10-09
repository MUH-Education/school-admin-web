import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { ApiError } from '@/api/errors'
import { vehicleTypeLabels } from '@/features/vehicles/labels'
import type { Vehicle } from '@/features/vehicles/types'
import { formatInr, formatLoad } from '@/lib/format'
import { Button } from '@/ui/Button'
import { Field } from '@/ui/Field'
import { ReadOnlyField } from '@/ui/ReadOnlyField'
import { Select } from '@/ui/Select'
import { Tile, TileRow } from '@/ui/Tile'
import { TextInput } from '@/ui/TextInput'
import { useToast } from '@/ui/useToast'
import { useSaveStops, useUpdateRoute } from '../api'
import type { LoadBoardRow, Route } from '../types'
import { routeSchema, toFormValues, toStopBodies, type RouteFormValues } from './routeForm'
import { StopsEditor } from './StopsEditor'

interface Props {
  route: Route
  /** All vehicles, for the Vehicle choice. Loaded before the panel opens, so the choice shows the right one. */
  vehicles: Vehicle[]
  /** The same route in the load board: the six numbers come from here. */
  numbers: LoadBoardRow | undefined
  canEdit: boolean
  /** Extra buttons next to Save, for example "Delete this route". */
  extraAction?: React.ReactNode
}

export function RoutePanel({ route, vehicles, numbers, canEdit, extraAction }: Props) {
  const toast = useToast()
  const updateRoute = useUpdateRoute(route.id)
  const saveStops = useSaveStops(route.id)
  const [saved, setSaved] = useState(route)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<RouteFormValues>({
    resolver: zodResolver(routeSchema),
    defaultValues: toFormValues(route),
  })
  const saving = updateRoute.isPending || saveStops.isPending

  async function save(values: RouteFormValues) {
    setServerError(null)
    const before = toFormValues(saved)
    let latest = saved
    try {
      if (values.name.trim() !== before.name || values.vehicleId !== before.vehicleId) {
        latest = await updateRoute.mutateAsync({
          name: values.name.trim(),
          vehicleId: values.vehicleId === '' ? null : Number(values.vehicleId),
        })
        // The route is saved. If the stops fail below, this part stays saved.
        setSaved(latest)
      }
      const stops = toStopBodies(values)
      const stopsChanged = JSON.stringify(stops) !== JSON.stringify(toStopBodies(before))
      if (stopsChanged) latest = await saveStops.mutateAsync(stops)
      setSaved(latest)
      reset(toFormValues(latest))
      toast.show('Route saved')
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

  const vehicle = vehicles.find((v) => v.id === route.vehicleId)

  return (
    <section
      aria-label={`${route.name} details`}
      className="flex min-w-0 flex-[1.3_1_460px] flex-col gap-2.5"
    >
      <h2 className="text-[15px] font-semibold">{route.name}</h2>
      <form
        noValidate
        onSubmit={handleSubmit(save)}
        className="flex flex-col gap-[22px] border border-rule bg-panel px-6 pt-[22px] pb-6"
      >
        {canEdit ? (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(200px,100%),1fr))] gap-x-5 gap-y-4">
            <Field label="Route name" error={errors.name?.message}>
              <TextInput className="min-h-11" {...register('name')} />
            </Field>
            <Field label="Vehicle" error={errors.vehicleId?.message}>
              <Select className="min-h-11" {...register('vehicleId')}>
                <option value="">No vehicle</option>
                {vehicles.map((v) => (
                  <option
                    key={v.id}
                    value={v.id}
                    disabled={v.routeId !== null && v.routeId !== route.id}
                  >
                    {v.name} · {vehicleTypeLabels[v.vehicleType]}
                    {v.routeId !== null && v.routeId !== route.id ? ` · runs ${v.route}` : ''}
                  </option>
                ))}
              </Select>
            </Field>
            <ReadOnlyField label="Seats" mono>
              {route.seats}
            </ReadOnlyField>
            <ReadOnlyField label="Cost per month, all-in" mono>
              {formatInr(route.monthlyCost)}
            </ReadOnlyField>
          </div>
        ) : (
          <dl className="grid grid-cols-[repeat(auto-fit,minmax(min(200px,100%),1fr))] gap-x-5 gap-y-4">
            <ReadOnlyField label="Route name">{route.name}</ReadOnlyField>
            <ReadOnlyField label="Vehicle">
              {route.vehicle
                ? `${route.vehicle}${vehicle ? ` · ${vehicleTypeLabels[vehicle.vehicleType]}` : ''}`
                : 'No vehicle'}
            </ReadOnlyField>
            <ReadOnlyField label="Seats" mono>
              {route.seats}
            </ReadOnlyField>
            <ReadOnlyField label="Cost per month, all-in" mono>
              {formatInr(route.monthlyCost)}
            </ReadOnlyField>
          </dl>
        )}

        <StopsEditor control={control} register={register} errors={errors} canEdit={canEdit} />

        {numbers && (
          <TileRow label={`${route.name} numbers`} minTile={150}>
            <Tile size="small" label="Children" value={numbers.children} />
            <Tile
              size="small"
              label="Load"
              value={formatLoad(numbers.load)}
              tone={numbers.load > 1 ? 'bad' : 'ink'}
            />
            <Tile size="small" label="Yearly cost" value={formatInr(numbers.yearlyCost)} />
            <Tile size="small" label="Fee got" value={formatInr(numbers.feeGot)} />
            <Tile
              size="small"
              label="Cost per child"
              value={formatInr(Math.round(numbers.costPerChild))}
            />
            <Tile
              size="small"
              label={numbers.surplus < 0 ? 'Route loss' : 'Route surplus'}
              value={formatInr(numbers.surplus)}
              tone={numbers.surplus < 0 ? 'bad' : 'ink'}
            />
          </TileRow>
        )}

        {serverError && (
          <p role="alert" className="border border-bad bg-bad-soft p-3 font-semibold text-bad">
            {serverError}
          </p>
        )}

        {canEdit && (
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
            <Button type="submit" saving={saving}>
              Save changes
            </Button>
            {extraAction}
          </div>
        )}
      </form>
    </section>
  )
}
