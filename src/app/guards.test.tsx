import { screen } from '@testing-library/react'
import { renderApp, saveLogin, sampleUserIds } from '@/test/utils'

describe('guards and landing', () => {
  it.each([
    ['owner', sampleUserIds.owner, '/bus-status'],
    ['officeAdmin', sampleUserIds.officeAdmin, '/bus-status'],
    ['transport', sampleUserIds.transport, '/bus-status'],
    ['admissions', sampleUserIds.admissions, '/routes'],
    ['attendant', sampleUserIds.attendant, '/trip'],
  ])('lands %s on %s', async (_name, userId, expected) => {
    saveLogin(userId)
    const { router } = renderApp('/')
    await screen.findByRole('heading', { level: 1 })
    expect(router.state.location.pathname).toBe(expected)
  })

  it('sends a person without a token to /login and remembers the address', async () => {
    const { router } = renderApp('/students?page=2')
    await screen.findByRole('heading', { name: 'School admin' })
    expect(router.state.location.pathname).toBe('/login')
    expect(router.state.location.state).toEqual({ from: '/students?page=2' })
  })

  it('shows the cannot-open page for a typed URL without permission', async () => {
    saveLogin(sampleUserIds.admissions)
    renderApp('/vehicles')
    expect(
      await screen.findByRole('heading', { name: 'You cannot open this page' }),
    ).toBeInTheDocument()
  })

  it('an attendant typing /students gets the cannot-open page', async () => {
    saveLogin(sampleUserIds.attendant)
    renderApp('/students')
    expect(
      await screen.findByRole('heading', { name: 'You cannot open this page' }),
    ).toBeInTheDocument()
  })

  it('shows Page not found for an unknown address', async () => {
    saveLogin(sampleUserIds.owner)
    renderApp('/no-such-page')
    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
  })

  it('a reload with a saved token does not show the login page', async () => {
    saveLogin(sampleUserIds.owner)
    renderApp('/users')
    expect(await screen.findByRole('heading', { name: 'Users and roles' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Mobile number')).not.toBeInTheDocument()
  })

  it('shows placeholder pages with the phase number', async () => {
    saveLogin(sampleUserIds.owner)
    renderApp('/analytics')
    expect(await screen.findByText('Coming in phase 9.')).toBeInTheDocument()
  })
})
