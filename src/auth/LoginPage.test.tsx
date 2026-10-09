import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { getToken } from '@/api/client'
import { server } from '@/mocks/server'
import { renderApp, saveLogin, sampleUserIds } from '@/test/utils'

async function askForCode(phone: string) {
  await userEvent.type(await screen.findByLabelText('Mobile number'), phone)
  await userEvent.click(screen.getByRole('button', { name: 'Send code' }))
  await screen.findByLabelText('6-digit code')
}

describe('login page', () => {
  it('logs in with a phone and the right code, and lands on the first page', async () => {
    const { router } = renderApp('/login')
    await askForCode('98123 40004')
    expect(screen.getByText(/If this number is registered, a code was sent/)).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('6-digit code'), '000000')
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/enquiries'))
    expect(getToken()).toBe('mock-token-4')
  })

  it('goes to step 2 also for an unknown number', async () => {
    renderApp('/login')
    await askForCode('90000 00000')
    expect(screen.getByLabelText('6-digit code')).toBeInTheDocument()
  })

  it('checks the phone in the browser', async () => {
    renderApp('/login')
    await userEvent.type(await screen.findByLabelText('Mobile number'), '12345')
    await userEvent.click(screen.getByRole('button', { name: 'Send code' }))
    expect(await screen.findByText('Enter a 10-digit mobile number.')).toBeInTheDocument()
  })

  it('shows the OTP_INVALID message and stays on step 2', async () => {
    renderApp('/login')
    await askForCode('98123 40001')
    await userEvent.type(screen.getByLabelText('6-digit code'), '111111')
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }))
    expect(
      await screen.findByText('The code is wrong or too old. Try again or send a new code.'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('6-digit code')).toBeInTheDocument()
  })

  it('shows the OTP_LOCKED message and clears the input', async () => {
    server.use(
      http.post('/api/v1/auth/otp/verify', () =>
        HttpResponse.json({ error: 'OTP_LOCKED', message: 'locked' }, { status: 429 }),
      ),
    )
    renderApp('/login')
    await askForCode('98123 40001')
    await userEvent.type(screen.getByLabelText('6-digit code'), '123456')
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }))
    expect(await screen.findByText('Too many wrong tries. Send a new code.')).toBeInTheDocument()
    expect(screen.getByLabelText('6-digit code')).toHaveValue('')
  })

  it('shows the OTP_TOO_MANY_REQUESTS message with a countdown', async () => {
    server.use(
      http.post('/api/v1/auth/otp/request', () =>
        HttpResponse.json(
          { error: 'OTP_TOO_MANY_REQUESTS', message: 'wait', retryAfterSeconds: 42 },
          { status: 429 },
        ),
      ),
    )
    renderApp('/login')
    await userEvent.type(await screen.findByLabelText('Mobile number'), '9812340001')
    await userEvent.click(screen.getByRole('button', { name: 'Send code' }))
    expect(
      await screen.findByText(/Please wait before asking again\. \(42 s\)/),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send code' })).toBeDisabled()
  })

  it('shows the VALIDATION message from the server', async () => {
    server.use(
      http.post('/api/v1/auth/otp/request', () =>
        HttpResponse.json({ error: 'VALIDATION', message: 'bad' }, { status: 400 }),
      ),
    )
    renderApp('/login')
    await userEvent.type(await screen.findByLabelText('Mobile number'), '9812340001')
    await userEvent.click(screen.getByRole('button', { name: 'Send code' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Enter a 10-digit mobile number.')
  })

  it('keeps the resend link off for 60 seconds', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    renderApp('/login')
    await askForCode('98123 40001')
    const resend = screen.getByRole('button', { name: /Send the code again/ })
    expect(resend).toBeDisabled()
    expect(resend).toHaveTextContent('(60 s)')
    for (let second = 0; second < 59; second++) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000)
      })
    }
    expect(screen.getByRole('button', { name: /Send the code again/ })).toBeDisabled()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })
    expect(screen.getByRole('button', { name: 'Send the code again' })).toBeEnabled()
    vi.useRealTimers()
  })

  it('Change number goes back to step 1', async () => {
    renderApp('/login')
    await askForCode('98123 40001')
    await userEvent.click(screen.getByRole('button', { name: 'Change number' }))
    expect(screen.getByLabelText('Mobile number')).toBeInTheDocument()
  })

  it('a logged-in person who opens /login is sent on', async () => {
    saveLogin(sampleUserIds.admissions)
    const { router } = renderApp('/login')
    await waitFor(() => expect(router.state.location.pathname).toBe('/enquiries'))
  })
})
