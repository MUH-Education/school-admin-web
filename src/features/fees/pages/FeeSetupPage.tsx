import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { ApiError } from '@/api/errors'
import { classNames } from '@/features/students/types'
import { Button } from '@/ui/Button'
import { EmptyState } from '@/ui/EmptyState'
import { ErrorState } from '@/ui/ErrorState'
import { Field } from '@/ui/Field'
import { LoadingBlock } from '@/ui/LoadingBlock'
import { MoneyInput } from '@/ui/MoneyInput'
import { PageHeader } from '@/ui/PageHeader'
import { Panel } from '@/ui/Panel'
import { Select } from '@/ui/Select'
import { useToast } from '@/ui/useToast'
import { useClassFees, useSaveClassFees, useSessions } from '../api'
import type { ClassFee } from '../types'

const MAX_FEE = 10_000_000

const schema = z.object({
  /** One amount for each class, in the order of `classNames`. Null: not set yet. */
  amounts: z.array(
    z
      .number()
      .int('Enter a whole amount.')
      .min(0, 'Enter a whole amount.')
      .max(MAX_FEE, 'This amount is too big.')
      .nullable(),
  ),
})
type Values = z.infer<typeof schema>

function toValues(fees: ClassFee[]): Values {
  return {
    amounts: classNames.map((name) => fees.find((f) => f.className === name)?.amount ?? null),
  }
}

/** Fee setup: the school fee of each class for one school year. Owner only (SETTINGS_EDIT). */
export function FeeSetupPage() {
  const sessions = useSessions()
  const [chosen, setChosen] = useState<number | null>(null)
  const sessionId =
    chosen ?? sessions.data?.find((s) => s.current)?.id ?? sessions.data?.[0]?.id ?? null

  return (
    <>
      <PageHeader
        label="Settings · School fee by class"
        title="Fee setup"
        description="Set the school fee for each class, once a year. New admission starts from these amounts. The clerk can still change the fee for one child."
      />
      {sessions.isPending ? (
        <LoadingBlock />
      ) : sessions.isError ? (
        <ErrorState error={sessions.error} onRetry={() => void sessions.refetch()} />
      ) : sessions.data.length === 0 || sessionId === null ? (
        <EmptyState
          title="There is no school year yet"
          hint="A school year must exist before fees can be set."
        />
      ) : (
        <>
          <div className="max-w-[320px]">
            <Field label="School year">
              <Select value={sessionId} onChange={(event) => setChosen(Number(event.target.value))}>
                {sessions.data.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                    {s.current ? ' (now)' : ''}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <ClassFeesTable key={sessionId} sessionId={sessionId} />
        </>
      )}
    </>
  )
}

function ClassFeesTable({ sessionId }: { sessionId: number }) {
  const toast = useToast()
  const fees = useClassFees(sessionId)
  const save = useSaveClassFees(sessionId)
  const [serverError, setServerError] = useState<string | null>(null)
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { amounts: classNames.map(() => null) },
  })
  const {
    control,
    reset,
    setError,
    formState: { errors },
  } = form

  // The saved amounts fill the boxes once they arrive, and again after a save.
  useEffect(() => {
    if (fees.data) reset(toValues(fees.data))
  }, [fees.data, reset])

  async function submit(values: Values) {
    setServerError(null)
    const body: ClassFee[] = classNames.map((className, i) => ({
      className,
      amount: values.amounts[i] ?? null,
    }))
    try {
      await save.mutateAsync(body)
      toast.show('Fees saved')
    } catch (error) {
      if (!(error instanceof ApiError)) {
        setServerError('Something went wrong. Try again.')
        return
      }
      // The server names a class: "Class 5": "Enter a whole amount."
      let shown = false
      classNames.forEach((className, i) => {
        const message = error.fields[className]
        if (message) {
          setError(`amounts.${i}`, { message })
          shown = true
        }
      })
      if (!shown) setServerError(error.message)
    }
  }

  if (fees.isPending) return <LoadingBlock />
  if (fees.isError) return <ErrorState error={fees.error} onRetry={() => void fees.refetch()} />

  const notSet = form.watch('amounts').filter((a) => a === null).length
  return (
    <Panel aria-label="School fee by class" className="max-w-[640px] px-6 pt-5 pb-6">
      <form
        noValidate
        aria-label="Fee setup"
        onSubmit={(event) => void form.handleSubmit(submit)(event)}
        className="flex flex-col gap-5"
      >
        <div className="flex flex-col gap-1">
          <h2 className="text-[17px] font-semibold">School fee for the year, by class</h2>
          <p className="text-[13.5px] text-ink-soft">
            An empty box means the fee is not set yet. Then New admission starts empty for that
            class.
          </p>
        </div>
        <div role="table" aria-label="School fee by class" className="flex flex-col">
          <div
            role="row"
            className="grid grid-cols-[minmax(0,1fr)_220px] gap-x-4 pb-2 font-mono text-[11px] tracking-[0.08em] text-ink-soft uppercase"
          >
            <span role="columnheader">Class</span>
            <span role="columnheader">School fee (₹)</span>
          </div>
          {classNames.map((className, i) => (
            <div
              key={className}
              role="row"
              className="grid grid-cols-[minmax(0,1fr)_220px] items-start gap-x-4 border-t border-rule py-2"
            >
              <span role="cell" className="pt-3 font-semibold">
                {className}
              </span>
              <div role="cell">
                <Field
                  label={`School fee for ${className}`}
                  error={errors.amounts?.[i]?.message}
                  compact
                >
                  <Controller
                    control={control}
                    name={`amounts.${i}`}
                    render={({ field }) => (
                      <MoneyInput
                        className="font-mono"
                        placeholder="Not set yet"
                        value={field.value}
                        onValueChange={field.onChange}
                        onBlur={field.onBlur}
                      />
                    )}
                  />
                </Field>
              </div>
            </div>
          ))}
        </div>
        {notSet > 0 && (
          <p className="text-[13.5px] text-ink-soft">
            {notSet} {notSet === 1 ? 'class has' : 'classes have'} no fee yet.
          </p>
        )}
        {serverError && (
          <p role="alert" className="border border-bad bg-bad-soft p-3 font-semibold text-bad">
            {serverError}
          </p>
        )}
        <div>
          <Button type="submit" saving={save.isPending}>
            Save
          </Button>
        </div>
      </form>
    </Panel>
  )
}
