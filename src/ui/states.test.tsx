import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ApiError } from '@/api/errors'
import { EmptyState } from './EmptyState'
import { ErrorState } from './ErrorState'
import { LoadingBlock } from './LoadingBlock'

describe('the three non-data states', () => {
  it('LoadingBlock is a status', () => {
    render(<LoadingBlock />)
    expect(screen.getByRole('status')).toHaveTextContent('Loading…')
  })

  it('ErrorState has a Retry button', async () => {
    const onRetry = vi.fn()
    render(<ErrorState error={ApiError.network()} onRetry={onRetry} />)
    expect(screen.getByRole('alert')).toHaveTextContent('No connection')
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('ErrorState hides details of unknown errors', () => {
    render(<ErrorState error={new Error('stack trace')} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong. Try again.')
  })

  it('EmptyState shows its text', () => {
    render(<EmptyState title="No vehicles" hint="Add the first one" />)
    expect(screen.getByText('No vehicles')).toBeInTheDocument()
    expect(screen.getByText('Add the first one')).toBeInTheDocument()
  })
})
