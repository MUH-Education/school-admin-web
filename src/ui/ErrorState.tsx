import { ApiError } from '@/api/errors'
import { Button } from './Button'
import { Panel } from './Panel'

interface ErrorStateProps {
  error?: unknown
  onRetry?: () => void
}

function messageOf(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'NETWORK') return error.message
    if (error.status === 403) return 'You cannot do this.'
  }
  return 'Something went wrong. Try again.'
}

export function ErrorState({ error, onRetry }: ErrorStateProps) {
  return (
    <Panel tone="bad" role="alert" className="flex flex-col items-start gap-3">
      <p className="font-semibold">{messageOf(error)}</p>
      {onRetry && (
        <Button variant="plain" onClick={onRetry}>
          Retry
        </Button>
      )}
    </Panel>
  )
}
