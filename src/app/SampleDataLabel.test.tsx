import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { SampleDataLabel } from './SampleDataLabel'

function show(path = '/users') {
  render(
    <MemoryRouter initialEntries={[path]}>
      <SampleDataLabel />
    </MemoryRouter>,
  )
}

describe('SampleDataLabel', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('shows in mock mode', () => {
    vi.stubEnv('VITE_API_MODE', 'mock')
    show()
    expect(screen.getByText('Sample data')).toBeInTheDocument()
  })

  it('is hidden in real mode', () => {
    vi.stubEnv('VITE_API_MODE', 'real')
    show()
    expect(screen.queryByText('Sample data')).not.toBeInTheDocument()
  })

  it('is hidden on the phone pages, where it would cover the bottom button', () => {
    vi.stubEnv('VITE_API_MODE', 'mock')
    show('/trip/pickup')
    expect(screen.queryByText('Sample data')).not.toBeInTheDocument()
  })
})
