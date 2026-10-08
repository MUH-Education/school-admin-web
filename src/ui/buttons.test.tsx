import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { Button } from './Button'
import { LinkButton } from './LinkButton'

describe('Button', () => {
  it('is a button that can be clicked by keyboard', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Save</Button>)
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Save' })).toHaveFocus()
    await userEvent.keyboard('{Enter}')
    expect(onClick).toHaveBeenCalledOnce()
  })

  it.each(['primary', 'secondary', 'plain', 'danger', 'dark'] as const)('renders %s', (variant) => {
    render(<Button variant={variant}>Go</Button>)
    expect(screen.getByRole('button', { name: 'Go' })).toBeEnabled()
  })

  it('shows Saving… and is off while saving', () => {
    render(<Button saving>Save</Button>)
    const button = screen.getByRole('button', { name: 'Saving…' })
    expect(button).toBeDisabled()
  })
})

describe('LinkButton', () => {
  it('is a link with the right address', () => {
    render(
      <MemoryRouter>
        <LinkButton to="/students">Students</LinkButton>
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: 'Students' })).toHaveAttribute('href', '/students')
  })
})
