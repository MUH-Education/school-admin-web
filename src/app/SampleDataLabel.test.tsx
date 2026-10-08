import { render, screen } from '@testing-library/react'
import { SampleDataLabel } from './SampleDataLabel'

describe('SampleDataLabel', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('shows in mock mode', () => {
    vi.stubEnv('VITE_API_MODE', 'mock')
    render(<SampleDataLabel />)
    expect(screen.getByText('Sample data')).toBeInTheDocument()
  })

  it('is hidden in real mode', () => {
    vi.stubEnv('VITE_API_MODE', 'real')
    render(<SampleDataLabel />)
    expect(screen.queryByText('Sample data')).not.toBeInTheDocument()
  })
})
