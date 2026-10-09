import { screen, within } from '@testing-library/react'
import { renderApp, saveLogin, sampleUserIds } from '@/test/utils'

describe('Vehicles are read-only for view roles', () => {
  it('officeAdminSeesNoChangeButtons on the list', async () => {
    saveLogin(sampleUserIds.officeAdmin)
    renderApp('/vehicles')
    const people = await screen.findByRole('table', { name: 'Drivers, attendants and helpers' })
    await screen.findByRole('table', { name: 'Vehicles' })
    expect(screen.queryByRole('button', { name: 'Add a person' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Add a vehicle' })).not.toBeInTheDocument()
    expect(within(people).queryByRole('button', { name: /Edit/ })).not.toBeInTheDocument()
    // Looking is allowed: the Open links stay.
    expect(screen.getByRole('link', { name: 'Open Van 4' })).toBeInTheDocument()
  })

  it('officeAdminSeesNoChangeButtons on one vehicle, with plain text instead of inputs', async () => {
    saveLogin(sampleUserIds.officeAdmin)
    renderApp('/vehicles/4')
    await screen.findByRole('heading', { level: 1, name: 'Van 4' })
    const people = await screen.findByLabelText('People on this vehicle')
    expect(within(people).getByText('Jagdish')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save vehicle' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Remove this vehicle' })).not.toBeInTheDocument()
    expect(within(people).queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    const details = screen.getByLabelText('Vehicle details')
    expect(within(details).getByText('HR 23 XX 1104')).toBeInTheDocument()
    expect(within(details).getByText('₹30,300')).toBeInTheDocument()
    expect(within(screen.getByLabelText('Papers')).getByText('31 Mar 2027')).toBeInTheDocument()
  })

  it('an office admin who types /vehicles/new gets the cannot-open page', async () => {
    saveLogin(sampleUserIds.officeAdmin)
    renderApp('/vehicles/new')
    expect(
      await screen.findByRole('heading', { name: 'You cannot open this page' }),
    ).toBeInTheDocument()
  })

  it('the transport in-charge can change things', async () => {
    saveLogin(sampleUserIds.transport)
    renderApp('/vehicles')
    expect(await screen.findByRole('button', { name: 'Add a person' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Add a vehicle' })).toBeInTheDocument()
  })
})
