import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http } from 'msw'
import { server } from '@/mocks/server'
import { renderApp, saveLogin, sampleUserIds } from '@/test/utils'

async function openRoute4(userId: number = sampleUserIds.owner) {
  saveLogin(userId)
  const view = renderApp('/routes?route=4')
  const panel = await screen.findByRole('region', { name: 'Route 4 details' })
  await within(panel).findByRole('list', { name: 'Stops' })
  return { ...view, panel }
}

function stopNames(panel: HTMLElement): string[] {
  const items = within(within(panel).getByRole('list', { name: 'Stops' })).getAllByRole('listitem')
  return items.map((li) => li.querySelector('.font-semibold')?.textContent ?? '')
}

describe('Selected route panel', () => {
  it('shows the stops with children counts and the six numbers', async () => {
    const { panel } = await openRoute4()
    expect(stopNames(panel)).toEqual(['Sadhanwas', 'Jakhal', 'Kanheri', 'Tohana town'])
    const first = within(panel).getAllByRole('listitem')[0] as HTMLElement
    expect(first).toHaveTextContent('1')
    expect(first).toHaveTextContent('7:25')
    expect(first).toHaveTextContent('5 children')
    const numbers = within(panel).getByLabelText('Route 4 numbers')
    expect(numbers).toHaveTextContent('Children19')
    expect(numbers).toHaveTextContent('Load1.36×')
    expect(numbers).toHaveTextContent('Yearly cost₹3,33,300')
    expect(numbers).toHaveTextContent('Fee got₹1,58,840')
    expect(numbers).toHaveTextContent('Cost per child₹17,542')
    expect(within(numbers).getByText('−₹1,74,460')).toHaveClass('text-bad')
    expect(within(panel).getByLabelText('Route name')).toHaveValue('Route 4')
    expect(within(panel).getByLabelText('Vehicle')).toHaveDisplayValue('Van 4 · Small van')
  })

  it('does not let a person type the child count', async () => {
    const { panel } = await openRoute4()
    expect(within(panel).queryByLabelText(/children/i)).not.toBeInTheDocument()
    expect(within(panel).getAllByRole('textbox')).toHaveLength(1) // only the route name
  })

  it('stopsAreSentInTheOrderShown', async () => {
    let sent: unknown = null
    server.use(
      http.put('/api/v1/routes/4/stops', async ({ request }) => {
        sent = await request.clone().json()
        return undefined // go on to the normal mock answer
      }),
    )
    const { panel } = await openRoute4()
    await userEvent.click(within(panel).getByRole('button', { name: 'Move Jakhal up' }))
    expect(stopNames(panel)).toEqual(['Jakhal', 'Sadhanwas', 'Kanheri', 'Tohana town'])
    await userEvent.click(within(panel).getByRole('button', { name: 'Add stop' }))
    await userEvent.type(within(panel).getByLabelText('Name of stop 5'), 'Dhani')
    await userEvent.type(within(panel).getByLabelText('Morning time of stop 5'), '08:10')
    await userEvent.click(within(panel).getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByText('Route saved')).toBeInTheDocument()
    expect(sent).toEqual([
      { id: expect.any(Number), name: 'Jakhal', morningTime: '07:40' },
      { id: expect.any(Number), name: 'Sadhanwas', morningTime: '07:25' },
      { id: expect.any(Number), name: 'Kanheri', morningTime: '07:55' },
      { id: expect.any(Number), name: 'Tohana town', morningTime: '08:02' },
      { name: 'Dhani', morningTime: '08:10' },
    ])
    // The new stop is in the list with 0 children, and the order stays.
    expect(await within(panel).findByText('0 children')).toBeInTheDocument()
    expect(stopNames(panel)).toEqual(['Jakhal', 'Sadhanwas', 'Kanheri', 'Tohana town', 'Dhani'])
  })

  it('asks for a name and a time on a new stop', async () => {
    const { panel } = await openRoute4()
    await userEvent.click(within(panel).getByRole('button', { name: 'Add stop' }))
    await userEvent.click(within(panel).getByRole('button', { name: 'Save changes' }))
    expect(await within(panel).findByText('Every stop needs a name.')).toBeInTheDocument()
    expect(screen.queryByText('Route saved')).not.toBeInTheDocument()
  })

  it('stopWithChildrenCannotBeRemovedShowsServerMessage', async () => {
    const { panel } = await openRoute4()
    await userEvent.click(within(panel).getByRole('button', { name: 'Remove Kanheri' }))
    expect(stopNames(panel)).toEqual(['Sadhanwas', 'Jakhal', 'Tohana town'])
    await userEvent.click(within(panel).getByRole('button', { name: 'Save changes' }))
    expect(await within(panel).findByRole('alert')).toHaveTextContent(
      'Kanheri has 4 children. Move them to another stop first.',
    )
    // The person's edit stays on screen, so nothing is lost.
    expect(stopNames(panel)).toEqual(['Sadhanwas', 'Jakhal', 'Tohana town'])
  })

  it('keeps the first and last stop buttons from moving out of the list', async () => {
    const { panel } = await openRoute4()
    expect(within(panel).getByRole('button', { name: 'Move Sadhanwas up' })).toBeDisabled()
    expect(within(panel).getByRole('button', { name: 'Move Tohana town down' })).toBeDisabled()
  })

  it('changes the vehicle only to one that has no route', async () => {
    const { panel } = await openRoute4()
    const select = within(panel).getByLabelText('Vehicle')
    expect(
      within(select).getByRole('option', { name: /Van 5 · Small van · runs Route 5/ }),
    ).toBeDisabled()
    expect(within(select).getByRole('option', { name: 'No vehicle' })).toBeEnabled()
  })

  it('shows the route as text without ROUTES_EDIT', async () => {
    saveLogin(sampleUserIds.officeAdmin)
    renderApp('/routes?route=4')
    const panel = await screen.findByRole('region', { name: 'Route 4 details' })
    await within(panel).findByRole('list', { name: 'Stops' })
    expect(within(panel).queryByRole('textbox')).not.toBeInTheDocument()
    expect(within(panel).queryByRole('button')).not.toBeInTheDocument()
    expect(within(panel).getByText('Van 4 · Small van')).toBeInTheDocument()
  })
})
