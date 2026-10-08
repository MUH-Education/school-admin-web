import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { getToken } from '@/api/client'
import { server } from '@/mocks/server'
import { renderApp, saveLogin, sampleUserIds } from '@/test/utils'

describe('session', () => {
  it('a 401 on any call sends the user to /login and back after login', async () => {
    saveLogin(sampleUserIds.owner)
    const { router } = renderApp('/users')
    await screen.findByRole('heading', { name: 'Users and roles' })

    await userEvent.click(await screen.findByRole('button', { name: 'Edit Neelam' }))

    // Any 401 logs out.
    server.use(
      http.put('/api/v1/users/:id', () =>
        HttpResponse.json({ error: 'UNAUTHENTICATED', message: 'Log in again' }, { status: 401 }),
      ),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
    expect(getToken()).toBeNull()
    expect(router.state.location.state).toEqual({ from: '/users' })

    await userEvent.type(await screen.findByLabelText('Mobile number'), '9812340001')
    await userEvent.click(screen.getByRole('button', { name: 'Send code' }))
    await userEvent.type(await screen.findByLabelText('6-digit code'), '000000')
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/users'))
  })

  it('log out deletes the token and goes to /login without remembering the page', async () => {
    saveLogin(sampleUserIds.owner)
    const { router } = renderApp('/users')
    await userEvent.click(await screen.findByRole('button', { name: 'Log out' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
    expect(getToken()).toBeNull()
    expect(router.state.location.state).toBeNull()
  })

  it('a saved token that no longer works shows the login page', async () => {
    saveLogin(999)
    const { router } = renderApp('/users')
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
    expect(getToken()).toBeNull()
  })
})
