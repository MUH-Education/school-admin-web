import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { ConfirmDialog } from './ConfirmDialog'
import { Dialog } from './Dialog'
import { ToastProvider } from './ToastProvider'
import { useToast } from './useToast'

function Demo({ onClose = () => {} }: { onClose?: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)}>Open</button>
      <Dialog
        open={open}
        title="Add user"
        onClose={() => {
          setOpen(false)
          onClose()
        }}
      >
        <input aria-label="First" />
        <button>Last</button>
      </Dialog>
    </>
  )
}

describe('Dialog', () => {
  it('is a modal dialog with a title and focus inside', async () => {
    render(<Demo />)
    await userEvent.click(screen.getByRole('button', { name: 'Open' }))
    expect(screen.getByRole('dialog', { name: 'Add user' })).toBeInTheDocument()
    expect(screen.getByLabelText('First')).toHaveFocus()
  })

  it('keeps Tab inside the dialog', async () => {
    render(<Demo />)
    await userEvent.click(screen.getByRole('button', { name: 'Open' }))
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Last' })).toHaveFocus()
    await userEvent.tab()
    expect(screen.getByLabelText('First')).toHaveFocus()
    await userEvent.tab({ shift: true })
    expect(screen.getByRole('button', { name: 'Last' })).toHaveFocus()
  })

  it('closes on Escape and gives focus back', async () => {
    const onClose = vi.fn()
    render(<Demo onClose={onClose} />)
    const opener = screen.getByRole('button', { name: 'Open' })
    await userEvent.click(opener)
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(onClose).toHaveBeenCalledOnce()
    expect(opener).toHaveFocus()
  })
})

describe('ConfirmDialog', () => {
  it('asks, and confirms or cancels', async () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    render(
      <ConfirmDialog
        open
        title="Turn off Kuldeep's login?"
        confirmLabel="Turn off"
        danger
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    )
    expect(screen.getByRole('dialog', { name: "Turn off Kuldeep's login?" })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Turn off' }))
    expect(onConfirm).toHaveBeenCalledOnce()
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledOnce()
  })
})

describe('Toast', () => {
  function Shower() {
    const toast = useToast()
    return <button onClick={() => toast.show('Vehicle saved')}>Save</button>
  }

  it('shows a short message and then removes it', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    render(
      <ToastProvider>
        <Shower />
      </ToastProvider>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(screen.getByRole('status')).toHaveTextContent('Vehicle saved')
    act(() => {
      vi.advanceTimersByTime(4100)
    })
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
    vi.useRealTimers()
  })
})
