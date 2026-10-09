import {
  useFieldArray,
  type Control,
  type FieldErrors,
  type UseFormRegister,
} from 'react-hook-form'
import { formatClock } from '@/lib/format'
import { Button } from '@/ui/Button'
import { TextInput } from '@/ui/TextInput'
import type { RouteFormValues } from './routeForm'

interface Props {
  control: Control<RouteFormValues>
  register: UseFormRegister<RouteFormValues>
  errors: FieldErrors<RouteFormValues>
  canEdit: boolean
}

const smallButton =
  'size-11 cursor-pointer border border-rule bg-panel font-semibold text-ink-soft disabled:cursor-not-allowed disabled:opacity-40'

/** Stops in order. Add at the end, move up or down, remove. The child count is read-only. */
export function StopsEditor({ control, register, errors, canEdit }: Props) {
  const { fields, append, remove, move } = useFieldArray({
    control,
    name: 'stops',
    keyName: 'fieldKey',
  })

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex flex-col gap-0.5">
          <h3 className="text-sm font-semibold">Stops, in order</h3>
          <div className="text-[12.5px] text-ink-soft">
            The child count comes from the student list. You do not type it.
          </div>
        </div>
        {canEdit && (
          <Button
            variant="secondary"
            onClick={() => append({ name: '', morningTime: '', children: 0 })}
          >
            Add stop
          </Button>
        )}
      </div>

      {fields.length === 0 ? (
        <p className="border border-rule p-4 text-ink-soft">
          No stops yet.{canEdit ? ' Press Add stop.' : ''}
        </p>
      ) : (
        <ol className="border border-rule" aria-label="Stops">
          {fields.map((field, index) => {
            const isNew = field.id === undefined
            const nameError = errors.stops?.[index]?.name?.message
            const timeError = errors.stops?.[index]?.morningTime?.message
            return (
              <li
                key={field.fieldKey}
                className={`py-2 pr-3 pl-3.5 ${index > 0 ? 'border-t border-rule' : ''}`}
              >
                <div className="grid grid-cols-[28px_minmax(120px,1fr)_auto] items-center gap-x-3.5 gap-y-2 sm:grid-cols-[28px_minmax(120px,1fr)_84px_92px_auto]">
                  <div className="font-mono text-[13px] text-ink-soft">{index + 1}</div>
                  {isNew && canEdit ? (
                    <TextInput
                      aria-label={`Name of stop ${index + 1}`}
                      aria-invalid={nameError ? true : undefined}
                      className="min-h-11"
                      {...register(`stops.${index}.name`)}
                    />
                  ) : (
                    <div className="text-[14.5px] font-semibold">{field.name}</div>
                  )}
                  {isNew && canEdit ? (
                    <TextInput
                      type="time"
                      aria-label={`Morning time of stop ${index + 1}`}
                      aria-invalid={timeError ? true : undefined}
                      className="min-h-11 font-mono"
                      {...register(`stops.${index}.morningTime`)}
                    />
                  ) : (
                    <div className="font-mono text-[13px] text-ink-soft">
                      {formatClock(field.morningTime)}
                    </div>
                  )}
                  <div className="text-[13.5px]">
                    {field.children} {field.children === 1 ? 'child' : 'children'}
                  </div>
                  {canEdit && (
                    <div className="flex gap-1">
                      <button
                        type="button"
                        className={smallButton}
                        aria-label={`Move ${field.name || `stop ${index + 1}`} up`}
                        disabled={index === 0}
                        onClick={() => move(index, index - 1)}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className={smallButton}
                        aria-label={`Move ${field.name || `stop ${index + 1}`} down`}
                        disabled={index === fields.length - 1}
                        onClick={() => move(index, index + 1)}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className={`${smallButton} text-lg`}
                        aria-label={`Remove ${field.name || `stop ${index + 1}`}`}
                        onClick={() => remove(index)}
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
                {(nameError || timeError) && (
                  <p role="alert" className="mt-1.5 text-[13px] font-semibold text-bad">
                    {nameError ?? timeError}
                  </p>
                )}
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
