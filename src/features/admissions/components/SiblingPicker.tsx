import { useId, useState } from 'react'
import { useStudentSearch } from '@/features/students/api'
import { useDebounced } from '@/lib/useDebounced'
import { Button } from '@/ui/Button'
import { TextInput } from '@/ui/TextInput'

interface Props {
  /** The brother or sister who was picked, or null. */
  picked: { id: number; name: string } | null
  onPick: (student: { id: number; name: string }) => void
  onClear: () => void
  error?: string
}

/** Search by name or admission number; picking one copies the parents. */
export function SiblingPicker({ picked, onPick, onClear, error }: Props) {
  const inputId = useId()
  const helpId = `${inputId}-help`
  const [text, setText] = useState('')
  const search = useStudentSearch(useDebounced(text, 300))
  const waiting = text.trim().length >= 2 && (search.isFetching || search.isPending)

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={inputId} className="text-[15px] font-semibold">
        Brother or sister already in this school
      </label>

      {picked ? (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border border-canal bg-canal-soft px-4 py-3">
          <p role="status" className="text-[15px]">
            Parents will be copied from <strong>{picked.name}</strong>
          </p>
          <Button variant="plain" onClick={onClear}>
            Choose another
          </Button>
        </div>
      ) : (
        <>
          <TextInput
            id={inputId}
            type="search"
            autoComplete="off"
            aria-describedby={helpId}
            aria-invalid={error ? true : undefined}
            placeholder="Type a name or an admission number"
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
          {text.trim().length >= 2 && (
            <div className="border border-rule">
              {waiting && !search.data ? (
                <p className="px-4 py-3 text-sm text-ink-soft">Searching…</p>
              ) : search.isError ? (
                <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <span className="font-semibold text-bad">Could not search. Try again.</span>
                  <Button variant="plain" onClick={() => void search.refetch()}>
                    Retry
                  </Button>
                </div>
              ) : search.data && search.data.items.length === 0 ? (
                <p className="px-4 py-3 text-sm text-ink-soft">No student found.</p>
              ) : (
                <ul aria-label="Matching students">
                  {search.data?.items.slice(0, 6).map((student, index) => (
                    <li key={student.id} className={index > 0 ? 'border-t border-rule' : ''}>
                      <button
                        type="button"
                        onClick={() => onPick({ id: student.id, name: student.name })}
                        className="flex min-h-11 w-full cursor-pointer flex-wrap items-center gap-x-3 px-4 py-2 text-left hover:bg-canal-soft"
                      >
                        <span className="text-[15px] font-semibold">{student.name}</span>
                        <span className="font-mono text-xs text-ink-soft">
                          {student.admissionNo}
                        </span>
                        <span className="text-[13px] text-ink-soft">{student.village}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}

      <p id={helpId} className="text-[13.5px] text-ink-soft">
        If you pick one, both children are joined to the same family. You do not type the parents
        again.
      </p>
      {error && (
        <p role="alert" className="text-[13px] font-semibold text-bad">
          {error}
        </p>
      )}
    </div>
  )
}
