import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { routes } from './router'

function renderAt(path: string) {
  render(<RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />)
}

describe('router', () => {
  it('shows the home page at /', () => {
    renderAt('/')
    expect(screen.getByRole('heading', { name: 'School admin' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Primary button' })).toBeInTheDocument()
  })

  it('shows Page not found for an unknown address', () => {
    renderAt('/no-such-page')
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
  })
})
