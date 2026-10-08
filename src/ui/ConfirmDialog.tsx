import { Button } from './Button'
import { Dialog } from './Dialog'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message?: string
  confirmLabel: string
  cancelLabel?: string
  danger?: boolean
  saving?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/** "Turn off this vehicle?" with two buttons. */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  danger = false,
  saving = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} title={title} onClose={onCancel}>
      {message && <p className="mb-5 text-ink-soft">{message}</p>}
      <div className="flex flex-wrap justify-end gap-3">
        <Button variant="plain" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button variant={danger ? 'danger' : 'primary'} saving={saving} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  )
}
