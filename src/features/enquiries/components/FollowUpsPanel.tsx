import { useState } from 'react'
import { ApiError } from '@/api/errors'
import { formatDayMonth } from '@/lib/format'
import { DateInput } from '@/ui/DateInput'
import { Field } from '@/ui/Field'
import { HistoryList, type HistoryItem } from '@/ui/HistoryList'
import { InlineForm } from '@/ui/InlineForm'
import { Panel } from '@/ui/Panel'
import { TextArea } from '@/ui/TextArea'
import { useToast } from '@/ui/useToast'
import { useAddFollowUp } from '../api'
import type { Enquiry } from '../types'

/** The calls and visits, newest first, and the small form that adds one. */
export function FollowUpsPanel({ enquiry, canEdit }: { enquiry: Enquiry; canEdit: boolean }) {
  const toast = useToast()
  const add = useAddFollowUp(enquiry.id)
  const [note, setNote] = useState('')
  const [nextDate, setNextDate] = useState('')
  const [noteError, setNoteError] = useState<string | undefined>()
  const [error, setError] = useState<string | null>(null)

  const items: HistoryItem[] = enquiry.followUps.map((f) => ({
    key: f.id,
    label: formatDayMonth(f.at),
    title: f.note,
    when: (
      <>
        {f.by}
        {f.nextDate && <> · next {formatDayMonth(f.nextDate)}</>}
      </>
    ),
  }))

  async function submit() {
    setError(null)
    setNoteError(undefined)
    if (!note.trim()) {
      setNoteError('Write what was said.')
      return
    }
    try {
      await add.mutateAsync({ note: note.trim(), ...(nextDate ? { nextDate } : {}) })
      toast.show('Note added')
      setNote('')
      setNextDate('')
    } catch (e) {
      if (e instanceof ApiError && e.fields.note) setNoteError(e.fields.note)
      else setError(e instanceof ApiError ? e.message : 'Something went wrong. Try again.')
    }
  }

  return (
    <Panel aria-label="Follow-ups" className="flex flex-col gap-4">
      <h2 className="text-[15.5px] font-semibold">Follow-ups</h2>
      {items.length === 0 ? (
        <p className="text-sm text-ink-soft">No call or visit has been noted yet.</p>
      ) : (
        <HistoryList items={items} />
      )}
      {canEdit && (
        <InlineForm
          title="Add a call or visit note"
          submitLabel="Add note"
          saving={add.isPending}
          error={error}
          onSubmit={() => void submit()}
          onCancel={() => {
            setNote('')
            setNextDate('')
            setNoteError(undefined)
          }}
        >
          <Field compact label="Note *" error={noteError}>
            <TextArea rows={3} value={note} onChange={(event) => setNote(event.target.value)} />
          </Field>
          <Field compact label="Next date (optional)">
            <DateInput value={nextDate} onChange={(event) => setNextDate(event.target.value)} />
          </Field>
        </InlineForm>
      )}
    </Panel>
  )
}
