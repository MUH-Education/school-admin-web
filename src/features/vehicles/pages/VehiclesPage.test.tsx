import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { renderApp, saveLogin, sampleUserIds } from '@/test/utils'
import { worstPaper } from '../papers'

async function openVehicles(userId: number = sampleUserIds.owner) {
  saveLogin(userId)
  renderApp('/vehicles')
  await screen.findByRole('table', { name: 'Vehicles' })
}

function rowOf(table: HTMLElement, text: string): HTMLElement {
  const row = within(table).getByText(text).closest('tr')
  if (!row) throw new Error(`no row for ${text}`)
  return row
}

describe('papers', () => {
  it('papersCellShowsWorstProblem', () => {
    const doc = (
      kind: 'FITNESS' | 'INSURANCE' | 'PERMIT' | 'POLLUTION',
      status: 'VALID' | 'ENDING' | 'ENDED',
      daysLeft: number,
      validTill: string,
    ) => ({ kind, status, daysLeft, validTill })
    expect(
      worstPaper([
        doc('FITNESS', 'VALID', 200, '2027-03-31'),
        doc('INSURANCE', 'ENDING', 21, '2026-10-28'),
        doc('PERMIT', 'VALID', 400, '2028-01-20'),
        doc('POLLUTION', 'VALID', 100, '2027-02-09'),
      ]),
    ).toEqual({ level: 'soon', text: 'Insurance ends 28 Oct' })
    // An ended paper beats an ending one.
    expect(
      worstPaper([
        doc('FITNESS', 'ENDED', -7, '2026-09-30'),
        doc('INSURANCE', 'ENDING', 21, '2026-10-28'),
      ]),
    ).toEqual({ level: 'ended', text: 'Fitness ended 30 Sep' })
    expect(worstPaper([doc('FITNESS', 'VALID', 200, '2027-03-31')])).toEqual({
      level: 'ok',
      text: 'All valid',
    })
  })
})

describe('Vehicles and staff page', () => {
  it('shows the worst paper problem of each vehicle', async () => {
    await openVehicles()
    const table = screen.getByRole('table', { name: 'Vehicles' })
    expect(within(rowOf(table, 'Van 6')).getByText('Insurance ends 28 Oct')).toBeInTheDocument()
    expect(within(rowOf(table, 'Bus 9')).getByText('Fitness ended 30 Sep')).toBeInTheDocument()
    expect(within(rowOf(table, 'Van 1')).getByText('All valid')).toBeInTheDocument()
    expect(within(rowOf(table, 'Van 4')).getByText('Jagdish')).toBeInTheDocument()
  })

  it('lists ended papers first in the attention box', async () => {
    await openVehicles()
    const box = await screen.findByLabelText('Papers that need attention')
    expect(within(box).getByRole('heading')).toHaveTextContent('3 papers need attention')
    const items = within(box).getAllByRole('listitem')
    expect(items[0]).toHaveTextContent(
      'Bus 9: fitness certificate ended on 30 September 2026. It should not carry children until this is renewed.',
    )
    expect(items[1]).toHaveTextContent('Van 6: insurance ends on 28 October 2026, in 21 days.')
    expect(items[2]).toHaveTextContent(
      'Driver Krishan: driving licence ends on 2 November 2026, in 26 days.',
    )
  })

  it('attentionBoxIsHiddenWhenEmpty', async () => {
    server.use(http.get('/api/v1/vehicles/attention', () => HttpResponse.json([])))
    await openVehicles()
    await waitFor(() =>
      expect(
        screen.getByRole('table', { name: 'Drivers, attendants and helpers' }),
      ).toBeInTheDocument(),
    )
    expect(screen.queryByLabelText('Papers that need attention')).not.toBeInTheDocument()
  })

  it('shows the people with where they work', async () => {
    await openVehicles()
    const table = await screen.findByRole('table', { name: 'Drivers, attendants and helpers' })
    expect(
      within(rowOf(table, 'Surender')).getByText('Free, not on any vehicle'),
    ).toBeInTheDocument()
    expect(within(rowOf(table, 'Jagdish')).getByText('Van 4 · Route 4')).toBeInTheDocument()
    expect(within(rowOf(table, 'Krishan')).getByText('2 Nov 2026, in 26 days')).toBeInTheDocument()
    expect(within(rowOf(table, 'Balwan')).getByText('Yes')).toBeInTheDocument()
    expect(screen.getByText('Showing all 19 people')).toBeInTheDocument()
  })

  it('shows an error with Retry, then the data', async () => {
    let fail = true
    server.use(
      http.get('/api/v1/vehicles', () =>
        fail
          ? HttpResponse.json({ error: 'X', message: 'Boom' }, { status: 500 })
          : HttpResponse.json([]),
      ),
    )
    saveLogin(sampleUserIds.owner)
    renderApp('/vehicles')
    const retry = await screen.findByRole('button', { name: 'Retry' })
    fail = false
    await userEvent.click(retry)
    expect(await screen.findByText('No vehicles yet')).toBeInTheDocument()
  })
})

describe('Add and edit a person', () => {
  it('adds a driver with a licence and shows them in the table', async () => {
    await openVehicles()
    await userEvent.click(screen.getByRole('button', { name: 'Add a person' }))
    const dialog = screen.getByRole('dialog', { name: 'Add a person' })
    await userEvent.type(within(dialog).getByLabelText('Name'), 'Naresh')
    await userEvent.type(within(dialog).getByLabelText('Mobile number'), '98765 12345')
    await userEvent.type(within(dialog).getByLabelText('Licence number'), 'HR23 2020 0000999')
    await userEvent.type(within(dialog).getByLabelText('Licence valid till'), '2031-05-04')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add person' }))
    expect(await screen.findByText('Person added')).toBeInTheDocument()
    const table = await screen.findByRole('table', { name: 'Drivers, attendants and helpers' })
    const row = await within(table).findByText('Naresh')
    expect(within(row.closest('tr') as HTMLElement).getByText('4 May 2031')).toBeInTheDocument()
  })

  it('asks for the licence only for a driver', async () => {
    await openVehicles()
    await userEvent.click(screen.getByRole('button', { name: 'Add a person' }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByLabelText('Licence number')).toBeInTheDocument()
    await userEvent.selectOptions(within(dialog).getByLabelText('Work'), 'Attendant')
    expect(within(dialog).queryByLabelText('Licence number')).not.toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add person' }))
    expect(await within(dialog).findByText('Enter the name.')).toBeInTheDocument()
  })

  it('shows the server message when a person still on a vehicle is turned off', async () => {
    await openVehicles()
    const table = await screen.findByRole('table', { name: 'Drivers, attendants and helpers' })
    await userEvent.click(within(table).getByRole('button', { name: 'Edit Jagdish' }))
    const dialog = screen.getByRole('dialog', { name: 'Edit person' })
    expect(within(dialog).getByLabelText('Name')).toHaveValue('Jagdish')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Turn off this person' }))
    await userEvent.click(screen.getByRole('button', { name: 'Turn off' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Jagdish is still on Van 4. Change the person there first.',
    )
  })
})
