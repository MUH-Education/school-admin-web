import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { ApiError } from '@/api/errors'
import { useLoadBoard, useRoutes, useSettings } from '@/features/routes/api'
import { formatClock, formatInr, formatLongDate, formatLongDayMonth, todayIso } from '@/lib/format'
import { Button } from '@/ui/Button'
import { ChoiceGroup } from '@/ui/ChoiceGroup'
import { DateInput } from '@/ui/DateInput'
import { ErrorState } from '@/ui/ErrorState'
import { Field } from '@/ui/Field'
import { LoadingBlock } from '@/ui/LoadingBlock'
import { MoneyInput } from '@/ui/MoneyInput'
import { Panel } from '@/ui/Panel'
import { RouteFullBox } from '@/ui/RouteFullBox'
import { Select } from '@/ui/Select'
import { useToast } from '@/ui/useToast'
import { useChangeTransport } from '../api'
import type { RouteFullWarning, Student, TransportNow } from '../types'

const heading = <h2 className="text-[17px] font-semibold">Transport</h2>

function where(t: TransportNow): string {
  return t.usesBus ? `${t.route}, ${t.stop}` : 'does not use the bus'
}

interface Props {
  student: Student
  canEdit: boolean
  editing: boolean
  onEdit: () => void
  onClose: () => void
}

/** Where the child rides now. "Change" opens the form in the same box. */
export function TransportBox({ student, canEdit, editing, onEdit, onClose }: Props) {
  // The warning of the last save stays on the screen after the form closes. The change was saved.
  const [warning, setWarning] = useState<RouteFullWarning | null>(null)
  const now = student.transport
  const next = student.upcomingTransport
  const since =
    !now.usesBus && now.since === student.admissionDate
      ? `since admission on ${formatLongDate(now.since)}`
      : `since ${formatLongDate(now.since)}`

  return (
    <Panel
      aria-label="Transport"
      className={`flex flex-col gap-[18px] px-6 pt-[22px] pb-6 ${editing ? 'border-2! border-canal!' : ''}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 flex-col gap-1">
          {heading}
          <p className="text-[14.5px]">
            <strong>Now:</strong> {where(now)}, {since}.
          </p>
          {now.usesBus && now.busFee !== null && (
            <p className="text-[13.5px]">
              Bus fee: <span className="font-mono">{formatInr(now.busFee)}</span>.
            </p>
          )}
          {next && (
            <p className="text-[14.5px]">
              <strong>From {formatLongDate(next.since)}:</strong> {where(next)}.
            </p>
          )}
          <p className="text-[13.5px] text-ink-soft">
            Use this same box to start the bus, change the route or stop, or stop the bus.
          </p>
        </div>
        {canEdit && !editing && (
          <Button variant="secondary" onClick={onEdit}>
            Change
          </Button>
        )}
      </div>

      {warning && !editing && (
        <div role="status" className="border border-bad px-4 py-3 text-sm">
          <strong className="text-bad">The change was saved.</strong> {warning.message}
        </div>
      )}

      {editing && canEdit && (
        <TransportForm
          student={student}
          onSaved={(saved) => {
            setWarning(saved)
            onClose()
          }}
          onCancel={onClose}
        />
      )}
    </Panel>
  )
}

const schema = z
  .object({
    usesBus: z.enum(['YES', 'NO']),
    routeId: z.string(),
    stopId: z.string(),
    fromDate: z.string().min(1, 'Enter the date.'),
    busFee: z.number().nullable(),
  })
  .superRefine((v, ctx) => {
    if (v.usesBus !== 'YES') return
    if (!v.routeId) ctx.addIssue({ code: 'custom', path: ['routeId'], message: 'Pick a route.' })
    if (!v.stopId) ctx.addIssue({ code: 'custom', path: ['stopId'], message: 'Pick a stop.' })
    if (v.busFee === null)
      ctx.addIssue({ code: 'custom', path: ['busFee'], message: 'Enter the bus fee.' })
  })
type FormValues = z.infer<typeof schema>
const knownFields = ['routeId', 'stopId', 'fromDate', 'busFee'] as const

interface FormProps {
  student: Student
  onSaved: (warning: RouteFullWarning | null) => void
  onCancel: () => void
}

/** Waits for the three lists it needs, so the first values are right. */
function TransportForm(props: FormProps) {
  const routes = useRoutes()
  const board = useLoadBoard()
  const settings = useSettings()
  const failed = [routes, board, settings].find((q) => q.isError)
  if (failed) return <ErrorState error={failed.error} onRetry={() => void failed.refetch()} />
  if (!routes.data || !board.data || !settings.data) return <LoadingBlock />
  return (
    <TransportFormBody
      {...props}
      routes={routes.data}
      board={board.data}
      fullYearFee={settings.data.busFeePerChild}
    />
  )
}

function TransportFormBody({
  student,
  onSaved,
  onCancel,
  routes,
  board,
  fullYearFee,
}: FormProps & {
  routes: NonNullable<ReturnType<typeof useRoutes>['data']>
  board: NonNullable<ReturnType<typeof useLoadBoard>['data']>
  fullYearFee: number
}) {
  const toast = useToast()
  const change = useChangeTransport(student.id)
  const [serverError, setServerError] = useState<string | null>(null)
  // The latest booked state is the one to start from.
  const latest = student.upcomingTransport ?? student.transport
  const firstName = student.name.split(' ')[0] ?? student.name

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
      usesBus: 'YES',
      routeId: latest.usesBus && latest.routeId ? String(latest.routeId) : '',
      stopId: latest.usesBus && latest.stopId ? String(latest.stopId) : '',
      fromDate: todayIso(),
      busFee: latest.usesBus && latest.busFee !== null ? latest.busFee : fullYearFee,
    },
  })
  const watched = useWatch({ control })
  const usesBus = watched.usesBus === 'YES'
  const route = routes.find((r) => String(r.id) === watched.routeId)
  const row = board.find((r) => String(r.routeId) === watched.routeId)
  // A child who is already on this route does not take one more seat.
  const alreadyThere = [student.transport, student.upcomingTransport].some(
    (t) => t?.usesBus && String(t.routeId) === watched.routeId,
  )
  const full = usesBus && row && !alreadyThere && row.children >= row.seats
  const fee = watched.busFee ?? 0
  const when = watched.fromDate ? formatLongDayMonth(watched.fromDate) : 'the chosen date'

  async function save(values: FormValues) {
    setServerError(null)
    try {
      const answer = await change.mutateAsync(
        values.usesBus === 'YES'
          ? {
              usesBus: true,
              routeId: Number(values.routeId),
              stopId: Number(values.stopId),
              fromDate: values.fromDate,
              busFee: values.busFee ?? 0,
            }
          : { usesBus: false, fromDate: values.fromDate },
      )
      toast.show('Bus change saved')
      onSaved(answer.warning ?? null)
    } catch (error) {
      if (!(error instanceof ApiError)) {
        setServerError('Something went wrong. Try again.')
        return
      }
      const names = knownFields.filter((name) => error.fields[name])
      for (const name of names) setError(name, { message: error.fields[name] })
      // STOP_NOT_ON_ROUTE and the rest: the server's own words.
      if (names.length === 0) setServerError(error.message)
    }
  }

  const things = usesBus
    ? [
        `From ${when}, ${firstName} is on the ${route?.name ?? 'route'} attendant's list.`,
        'The parents start getting the bus SMS.',
        ...(fee > 0 ? [`${formatInr(fee)} is added to the fees still to pay.`] : []),
      ]
    : [
        `From ${when}, ${firstName} is taken off the attendant's list.`,
        'The parents stop getting the bus SMS.',
      ]

  return (
    <form
      noValidate
      aria-label="Change the bus"
      onSubmit={(event) => void handleSubmit(save)(event)}
      className="flex flex-col gap-[18px]"
    >
      <Controller
        control={control}
        name="usesBus"
        render={({ field }) => (
          <ChoiceGroup
            legend="Change to"
            value={field.value}
            onChange={field.onChange}
            choices={[
              { value: 'YES', label: 'Uses the bus' },
              { value: 'NO', label: 'No bus' },
            ]}
          />
        )}
      />

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(200px,100%),1fr))] gap-x-5 gap-y-4">
        {usesBus && (
          <>
            <Field compact label="Route" error={errors.routeId?.message}>
              <Select
                {...register('routeId', {
                  // A stop of the old route is not a stop of the new one.
                  onChange: () => setValue('stopId', ''),
                })}
              >
                <option value="">Pick a route</option>
                {routes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field compact label="Stop" error={errors.stopId?.message}>
              <Select {...register('stopId')}>
                <option value="">{route ? 'Pick a stop' : 'Pick a route first'}</option>
                {(route?.stops ?? []).map((stop) => (
                  <option key={stop.id} value={stop.id}>
                    {stop.name} · {formatClock(stop.morningTime)}
                  </option>
                ))}
              </Select>
            </Field>
          </>
        )}
        <Field
          compact
          label={usesBus ? 'Start from' : 'From which date'}
          error={errors.fromDate?.message}
        >
          <DateInput {...register('fromDate')} />
        </Field>
        {usesBus && (
          <Field
            label="Bus fee for the rest of this year (₹)"
            hint={`The full year is ${formatInr(fullYearFee)}. You decide the amount for the months left.`}
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
      </div>

      {full && row && (
        <RouteFullBox
          routeName={row.name}
          onBoard={row.children}
          seats={row.seats}
          who={firstName}
        />
      )}

      <div className="flex flex-col gap-1.5 bg-paper px-4 py-3.5">
        <p className="text-sm font-semibold">
          When you save, {things.length === 3 ? 'three' : 'two'} things happen
        </p>
        <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm">
          {things.map((text) => (
            <li key={text}>{text}</li>
          ))}
        </ol>
      </div>

      {serverError && (
        <p role="alert" className="border border-bad bg-bad-soft p-3 font-semibold text-bad">
          {serverError}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2.5">
        <Button type="submit" saving={change.isPending} className="min-h-12 px-[22px]">
          Save change
        </Button>
        <Button variant="plain" onClick={onCancel} className="min-h-12">
          Cancel
        </Button>
      </div>
    </form>
  )
}
