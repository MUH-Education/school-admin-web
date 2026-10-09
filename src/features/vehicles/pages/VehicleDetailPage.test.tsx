import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { api } from '@/api/client'
import { renderApp, saveLogin, sampleUserIds } from '@/test/utils'
import type { Vehicle } from '../types'

async function openVan4() {
  saveLogin(sampleUserIds.owner)
  renderApp('/vehicles/4')
  await screen.findByRole('heading', { level: 1, name: 'Van 4' })
}

describe('One vehicle: details and papers', () => {
  it('shows the details and papers of Van 4 as in the design', async () => {
    await openVan4()
    expect(screen.getByText(/runs/)).toHaveTextContent(
      'Small van · HR 23 XX 1104 · runs Route 4',
    )
    expect(screen.getByRole('link', { name: 'Route 4' })).toHaveAttribute('href', '/routes?route=4')
    expect(screen.getByText('All papers valid')).toBeInTheDocument()
    expect(screen.getByLabelText('Name used in school *')).toHaveValue('Van 4')
    expect(screen.getByLabelText('Seats *')).toHaveValue('14')
    expect(screen.getByLabelText('Cost per month, all-in (₹) *')).toHaveValue('30,300')
    expect(screen.getByLabelText('Fitness certificate')).toHaveValue('2027-03-31')
    expect(screen.getByLabelText('Insurance')).toHaveValue('2027-06-15')
    expect(screen.getByLabelText('Permit')).toHaveValue('2028-01-20')
    expect(screen.getByLabelText('Pollution certificate')).toHaveValue('2027-02-09')
  })

  it('saves new details and a new paper date', async () => {
    await openVan4()
    const seats = screen.getByLabelText('Seats *')
    await userEvent.clear(seats)
    await userEvent.type(seats, '16')
    const insurance = screen.getByLabelText('Insurance')
    await userEvent.clear(insurance)
    await userEvent.type(insurance, '2026-10-20')
    await userEvent.click(screen.getByRole('button', { name: 'Save vehicle' }))
    expect(await screen.findByText('Vehicle saved')).toBeInTheDocument()
    const list = await api<Vehicle[]>('GET', '/vehicles')
    const van4 = list.find((v) => v.name === 'Van 4')
    expect(van4?.seats).toBe(16)
    expect(van4?.documents.find((d) => d.kind === 'INSURANCE')?.validTill).toBe('2026-10-20')
    expect(await screen.findByText('Insurance ends 20 Oct')).toBeInTheDocument()
  })

  it('shows the server message under the field', async () => {
    await openVan4()
    const seats = screen.getByLabelText('Seats *')
    await userEvent.clear(seats)
    await userEvent.type(seats, '0')
    await userEvent.click(screen.getByRole('button', { name: 'Save vehicle' }))
    expect(await screen.findByText('Seats must be 1 or more.')).toBeInTheDocument()
  })

  it('says so when the vehicle does not exist', async () => {
    saveLogin(sampleUserIds.owner)
    renderApp('/vehicles/999')
    expect(await screen.findByText('This vehicle does not exist')).toBeInTheDocument()
    expect(
      within(document.body).getByRole('link', { name: 'Back to vehicles' }),
    ).toBeInTheDocument()
  })
})
