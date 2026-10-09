import { useState } from 'react'
import { useNavigate } from 'react-router'
import { ApiError } from '@/api/errors'
import { Button } from '@/ui/Button'
import { ConfirmDialog } from '@/ui/ConfirmDialog'
import { useToast } from '@/ui/useToast'
import { useDeleteVehicle } from '../api'

/** "Remove this vehicle" with a question first. The server says no if a route uses it. */
export function RemoveVehicle({ id, name }: { id: number; name: string }) {
  const toast = useToast()
  const navigate = useNavigate()
  const remove = useDeleteVehicle(id)
  const [asking, setAsking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function confirm() {
    setError(null)
    try {
      await remove.mutateAsync()
      toast.show('Vehicle removed')
      void navigate('/vehicles')
    } catch (failure) {
      setAsking(false)
      setError(failure instanceof ApiError ? failure.message : 'Something went wrong. Try again.')
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Button variant="danger" onClick={() => setAsking(true)} className="min-h-12 text-[15px]">
        Remove this vehicle
      </Button>
      {error && (
        <p role="alert" className="max-w-[360px] text-right text-[13.5px] font-semibold text-bad">
          {error}
        </p>
      )}
      <ConfirmDialog
        open={asking}
        title={`Remove ${name}?`}
        message="It will no longer be on the list. Old records keep its name."
        confirmLabel="Remove"
        danger
        saving={remove.isPending}
        onConfirm={() => void confirm()}
        onCancel={() => setAsking(false)}
      />
    </div>
  )
}
