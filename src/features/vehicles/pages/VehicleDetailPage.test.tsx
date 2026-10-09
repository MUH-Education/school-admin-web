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
    expect(screen.getByText(/runs/)).toHaveTextContent('Small van · HR 23 XX 1104 · runs Route 4')
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

async function openChangeDriverForm() {
  await openVan4()
  const box = screen.getByLabelText('People on this vehicle')
  expect(within(box).getByText('Jagdish')).toBeInTheDocument()
  await userEvent.click(within(box).getByRole('button', { name: 'Change driver' }))
  const form = within(box).getByRole('form', { name: 'Change the driver of Van 4' })
  return { box, form }
}

async function fillChange(form: HTMLElement, who: string, from: string, till: string) {
  await userEvent.selectOptions(within(form).getByLabelText('New driver'), who)
  const fromInput = within(form).getByLabelText('From date')
  await userEvent.clear(fromInput)
  await userEvent.type(fromInput, from)
  const tillInput = within(form).getByLabelText('Last day')
  await userEvent.clear(tillInput)
  await userEvent.type(tillInput, till)
}

describe('One vehicle: people box', () => {
  it('shows who is free and who is on another vehicle', async () => {
    const { form } = await openChangeDriverForm()
    const select = within(form).getByLabelText('New driver')
    expect(within(select).getByRole('option', { name: 'Surender · free now' })).toBeInTheDocument()
    expect(
      within(select).getByRole('option', { name: 'Rajpal · now on Van 1' }),
    ).toBeInTheDocument()
    expect(within(select).queryByRole('option', { name: /Jagdish/ })).not.toBeInTheDocument()
    expect(within(select).getByRole('option', { name: 'Add a new driver' })).toBeInTheDocument()
  })

  it('changeDriverFormShowsStaffBusyMessage', async () => {
    const { form } = await openChangeDriverForm()
    await fillChange(form, 'Rajpal · now on Van 1', '2026-10-12', '2026-10-16')
    await userEvent.click(within(form).getByRole('button', { name: 'Save change' }))
    expect(await within(form).findByRole('alert')).toHaveTextContent(
      'Rajpal drives Van 1 on these days.',
    )
  })

  it('temporaryChangeShowsReturnDate', async () => {
    const { box, form } = await openChangeDriverForm()
    await fillChange(form, 'Surender · free now', '2026-10-12', '2026-10-16')
    expect(
      within(form).getByRole('radio', { name: 'Only till 16 Oct, then Jagdish is back' }),
    ).toBeChecked()
    await userEvent.click(within(form).getByRole('button', { name: 'Save change' }))
    expect(await screen.findByText('Driver changed')).toBeInTheDocument()
    const driver = await within(box).findByText('Surender')
    expect(driver).toBeInTheDocument()
    expect(within(box).getByText(/till 16 Oct, then Jagdish is back/)).toBeInTheDocument()
    expect(within(box).queryByRole('form')).not.toBeInTheDocument()
    // The old name stays in the history.
    const history = screen.getByLabelText('Who worked on this vehicle')
    expect(await within(history).findByText('12 Oct 2026 to 16 Oct 2026')).toBeInTheDocument()
    expect(within(history).getAllByText('Jagdish').length).toBeGreaterThan(0)
  })

  it('changes the driver from now on without asking for a last day', async () => {
    const { box, form } = await openChangeDriverForm()
    await userEvent.selectOptions(within(form).getByLabelText('New driver'), 'Surender · free now')
    await userEvent.click(within(form).getByRole('radio', { name: 'From now on' }))
    expect(within(form).queryByLabelText('Last day')).not.toBeInTheDocument()
    await userEvent.click(within(form).getByRole('button', { name: 'Save change' }))
    expect(await within(box).findByText('Surender')).toBeInTheDocument()
    expect(within(box).queryByText(/then .* is back/)).not.toBeInTheDocument()
  })

  it('asks for a last day when the change is only for some days', async () => {
    const { form } = await openChangeDriverForm()
    await userEvent.selectOptions(within(form).getByLabelText('New driver'), 'Surender · free now')
    await userEvent.click(within(form).getByRole('button', { name: 'Save change' }))
    expect(await within(form).findByText('Enter the last day.')).toBeInTheDocument()
  })

  it('shows a helper row with Add a person when nobody is there', async () => {
    await openVan4()
    const box = screen.getByLabelText('People on this vehicle')
    expect(within(box).getByText('Nobody yet')).toBeInTheDocument()
    expect(within(box).getByRole('button', { name: 'Add a person' })).toBeInTheDocument()
  })
})
