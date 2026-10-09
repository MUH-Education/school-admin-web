import { Controller, type UseFormReturn, useWatch } from 'react-hook-form'
import { Link } from 'react-router'
import { useLoadBoard, useRoutes } from '@/features/routes/api'
import { formatClock } from '@/lib/format'
import { ChoiceGroup } from '@/ui/ChoiceGroup'
import { EmptyState } from '@/ui/EmptyState'
import { ErrorState } from '@/ui/ErrorState'
import { Field } from '@/ui/Field'
import { FormGrid, FormSection } from '@/ui/FormSection'
import { LoadingBlock } from '@/ui/LoadingBlock'
import { RouteFullBox } from '@/ui/RouteFullBox'
import { Select } from '@/ui/Select'
import type { AdmissionValues } from '../form'

/** Part 3: does the child use the school bus? */
export function TransportSection({ form }: { form: UseFormReturn<AdmissionValues> }) {
  const {
    register,
    control,
    setValue,
    formState: { errors },
  } = form
  const usesBus = useWatch({ control, name: 'usesBus' }) === 'YES'
  const routeId = useWatch({ control, name: 'routeId' })
  const routes = useRoutes()
  const board = useLoadBoard()

  const row = board.data?.find((r) => String(r.routeId) === routeId)
  const route = routes.data?.find((r) => String(r.id) === routeId)

  return (
    <FormSection
      title="3. Transport"
      description="If the child uses the bus, choose the route and the stop."
    >
      <div className="flex flex-col gap-2">
        <Controller
          control={control}
          name="usesBus"
          render={({ field }) => (
            <ChoiceGroup
              legend="Uses the school bus *"
              value={field.value as 'YES' | 'NO' | ''}
              onChange={field.onChange}
              choices={[
                { value: 'YES', label: 'Yes' },
                { value: 'NO', label: 'No, comes on own' },
              ]}
            />
          )}
        />
        {errors.usesBus?.message && (
          <p role="alert" className="text-[13px] font-semibold text-bad">
            {errors.usesBus.message}
          </p>
        )}
      </div>

      {usesBus &&
        (routes.isPending ? (
          <LoadingBlock label="Loading routes…" />
        ) : routes.isError ? (
          <ErrorState error={routes.error} onRetry={() => void routes.refetch()} />
        ) : routes.data.length === 0 ? (
          <EmptyState
            title="There is no route yet"
            hint="Add a route on the Routes and load page, or choose No."
          />
        ) : (
          <>
            <FormGrid>
              <Field label="Route" error={errors.routeId?.message}>
                <Select
                  {...register('routeId', {
                    // A stop of the old route is not a stop of the new one.
                    onChange: () => setValue('stopId', ''),
                  })}
                >
                  <option value="">Pick a route</option>
                  {routes.data.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Stop" error={errors.stopId?.message}>
                <Select {...register('stopId')}>
                  <option value="">{route ? 'Pick a stop' : 'Pick a route first'}</option>
                  {(route?.stops ?? []).map((stop) => (
                    <option key={stop.id} value={stop.id}>
                      {stop.name} · {formatClock(stop.morningTime)}
                    </option>
                  ))}
                </Select>
              </Field>
            </FormGrid>
            {row && row.children >= row.seats && (
              <RouteFullBox
                routeName={row.name}
                onBoard={row.children}
                seats={row.seats}
                who="This child"
                action={
                  <Link to="/routes" className="font-semibold text-canal underline">
                    See Routes and load
                  </Link>
                }
              />
            )}
          </>
        ))}
    </FormSection>
  )
}
