import { useState } from 'react'
import { ApiError } from '@/api/errors'
import { Button } from '@/ui/Button'
import { ConfirmDialog } from '@/ui/ConfirmDialog'
import { useToast } from '@/ui/useToast'
import { useDeleteRoute } from '../api'

interface Props {
  id: number
  name: string
  onDeleted: () => void
}

/** "Delete this route" with a question first. The server says no while children are on it. */
export function DeleteRoute({ id, name, onDeleted }: Props) {
  const toast = useToast()
  const remove = useDeleteRoute(id)
  const [asking, setAsking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function confirm() {
    setError(null)
    try {
      await remove.mutateAsync()
      toast.show('Route deleted')
      onDeleted()
    } catch (failure) {
      setAsking(false)
      setError(failure instanceof ApiError ? failure.message : 'Something went wrong. Try again.')
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Button variant="danger" onClick={() => setAsking(true)}>
        Delete this route
      </Button>
      {error && (
        <p role="alert" className="max-w-[360px] text-right text-[13.5px] font-semibold text-bad">
          {error}
        </p>
      )}
      <ConfirmDialog
        open={asking}
        title={`Delete ${name}?`}
        message="It will no longer be on the list. Old records keep its name."
        confirmLabel="Delete"
        danger
        saving={remove.isPending}
        onConfirm={() => void confirm()}
        onCancel={() => setAsking(false)}
      />
    </div>
  )
}
