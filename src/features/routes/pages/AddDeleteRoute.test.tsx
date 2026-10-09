import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { api } from '@/api/client'
import { renderApp, saveLogin, sampleUserIds } from '@/test/utils'

async function openRoutes(userId: number = sampleUserIds.owner, path = '/routes') {
  saveLogin(userId)
  const view = renderApp(path)
  await screen.findByRole('region', { name: 'All routes' })
  return view
}

describe('Add route and delete route', () => {
  it('adds a route, selects it, and the list has 10 routes', async () => {
    const { router } = await openRoutes()
    await userEvent.click(screen.getByRole('button', { name: 'Add route' }))
    const dialog = screen.getByRole('dialog', { name: 'Add route' })
    await userEvent.type(within(dialog).getByLabelText('Route name'), 'Route 10')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add route' }))
    expect(await screen.findByText('Route added')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'All 10 routes' })).toBeInTheDocument()
    expect(router.state.location.search).toMatch(/^\?route=\d+$/)
    const panel = await screen.findByRole('region', { name: 'Route 10 details' })
    expect(within(panel).getByText('No stops yet. Press Add stop.')).toBeInTheDocument()
  })

  it('asks for a name', async () => {
    await openRoutes()
    await userEvent.click(screen.getByRole('button', { name: 'Add route' }))
    const dialog = screen.getByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add route' }))
    expect(await within(dialog).findByText('Enter the route name.')).toBeInTheDocument()
  })

  it('shows which vehicles already run a route and cannot be picked', async () => {
    await openRoutes()
    await userEvent.click(screen.getByRole('button', { name: 'Add route' }))
    const dialog = screen.getByRole('dialog')
    const option = await within(dialog).findByRole('option', {
      name: /Van 4 · Small van · runs Route 4/,
    })
    expect(option).toBeDisabled()
  })

  it('does not delete a route with children and shows the server message', async () => {
    await openRoutes(sampleUserIds.owner, '/routes?route=4')
    const panel = await screen.findByRole('region', { name: 'Route 4 details' })
    await userEvent.click(await within(panel).findByRole('button', { name: 'Delete this route' }))
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }),
    )
    expect(await within(panel).findByRole('alert')).toHaveTextContent(
      'Route 4 has 19 children. Move them to another route first.',
    )
    expect(screen.getByRole('heading', { name: 'All 9 routes' })).toBeInTheDocument()
  })

  it('deletes a route that has no children and clears the selection', async () => {
    saveLogin(sampleUserIds.owner)
    const created = await api<{ id: number }>('POST', '/routes', {
      name: 'Route 10',
      vehicleId: null,
    })
    const { router } = renderApp(`/routes?route=${created.id}`)
    const panel = await screen.findByRole('region', { name: 'Route 10 details' })
    await userEvent.click(await within(panel).findByRole('button', { name: 'Delete this route' }))
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }),
    )
    expect(await screen.findByText('Route deleted')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'All 9 routes' })).toBeInTheDocument()
    expect(router.state.location.search).toBe('')
    expect(screen.getByText('Pick a route')).toBeInTheDocument()
  })

  it('shows no Add route button to a view role', async () => {
    await openRoutes(sampleUserIds.officeAdmin)
    expect(screen.queryByRole('button', { name: 'Add route' })).not.toBeInTheDocument()
  })
})
