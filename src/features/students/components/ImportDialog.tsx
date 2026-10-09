import { useState } from 'react'
import { ApiError } from '@/api/errors'
import { Button } from '@/ui/Button'
import { Dialog } from '@/ui/Dialog'
import { Field } from '@/ui/Field'
import { FileInput } from '@/ui/FileInput'
import { useImportStudents } from '../api'
import { importColumns, type ImportResult } from '../types'

interface Props {
  open: boolean
  onClose: () => void
}

/** Choose a CSV, "Check" shows the problem lines, "Import" saves the good lines. */
export function ImportDialog({ open, onClose }: Props) {
  return (
    <Dialog open={open} title="Import students from a sheet" onClose={onClose}>
      {/* Remounted on each opening, so an old file and an old result never come back. */}
      <ImportBody onClose={onClose} />
    </Dialog>
  )
}

function ImportBody({ onClose }: { onClose: () => void }) {
  const run = useImportStudents()
  const [file, setFile] = useState<File | null>(null)
  const [checked, setChecked] = useState<ImportResult | null>(null)
  const [saved, setSaved] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function send(dryRun: boolean) {
    if (!file) {
      setError('Choose a CSV file first.')
      return
    }
    setError(null)
    try {
      const result = await run.mutateAsync({ file, dryRun })
      if (dryRun) setChecked(result)
      else setSaved(result)
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Something went wrong. Try again.')
    }
  }

  if (saved) {
    return (
      <div className="flex flex-col gap-4">
        <p role="status" className="text-[15px] font-semibold">
          {saved.okLines} {saved.okLines === 1 ? 'student' : 'students'} added, {saved.skippedLines}{' '}
          {saved.skippedLines === 1 ? 'line' : 'lines'} skipped
        </p>
        {saved.problems.length > 0 && <ProblemList result={saved} />}
        <div className="flex justify-end">
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13.5px] text-ink-soft">
        A CSV file for old students. The first line is the header, in this order:
      </p>
      <p className="border border-rule bg-paper p-3 font-mono text-[12.5px] break-words">
        {importColumns.join(',')}
      </p>
      <Field label="CSV file">
        <FileInput
          accept=".csv,text/csv"
          onChange={(event) => {
            setFile(event.target.files?.[0] ?? null)
            // A different file needs a new check.
            setChecked(null)
            setError(null)
          }}
        />
      </Field>

      {checked && (
        <div className="flex flex-col gap-3">
          <p role="status" className="text-[15px] font-semibold">
            {checked.okLines} {checked.okLines === 1 ? 'line is' : 'lines are'} good.{' '}
            {checked.skippedLines === 0
              ? 'No line has a problem.'
              : `${checked.skippedLines} ${checked.skippedLines === 1 ? 'line has' : 'lines have'} a problem and will be skipped.`}
          </p>
          {checked.problems.length > 0 && <ProblemList result={checked} />}
        </div>
      )}

      {error && (
        <p role="alert" className="border border-bad bg-bad-soft p-3 font-semibold text-bad">
          {error}
        </p>
      )}

      <div className="flex flex-wrap justify-end gap-3">
        <Button variant="plain" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="secondary"
          saving={run.isPending && !checked}
          onClick={() => void send(true)}
        >
          Check
        </Button>
        <Button
          disabled={!checked || checked.okLines === 0}
          saving={run.isPending && Boolean(checked)}
          onClick={() => void send(false)}
        >
          Import
        </Button>
      </div>
    </div>
  )
}

function ProblemList({ result }: { result: ImportResult }) {
  return (
    <ul aria-label="Lines with a problem" className="max-h-52 overflow-y-auto border border-rule">
      {result.problems.map((problem) => (
        <li
          key={problem.line}
          className="border-t border-rule px-3 py-2 text-[13.5px] first:border-t-0"
        >
          <span className="font-mono">Line {problem.line}</span>: {problem.message}
        </li>
      ))}
    </ul>
  )
}
