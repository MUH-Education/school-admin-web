import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { api, setToken } from './client'
import { ApiError } from './errors'

afterEach(() => setToken(null))

describe('api client', () => {
  it('adds the token header', async () => {
    setToken('abc123')
    let auth: string | null = null
    server.use(
      http.get('/api/v1/who', ({ request }) => {
        auth = request.headers.get('Authorization')
        return HttpResponse.json({ ok: true })
      }),
    )
    await api('GET', '/who')
    expect(auth).toBe('Bearer abc123')
  })

  it('turns an error body into ApiError', async () => {
    server.use(
      http.post('/api/v1/vehicles', () =>
        HttpResponse.json(
          { error: 'VALIDATION', message: 'Check the form', fields: { seats: 'Must be above 0' } },
          { status: 400 },
        ),
      ),
    )
    const error = await api('POST', '/vehicles', { seats: 0 }).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({
      status: 400,
      code: 'VALIDATION',
      message: 'Check the form',
      fields: { seats: 'Must be above 0' },
    })
  })

  it('gives code NETWORK when there is no network', async () => {
    server.use(http.get('/api/v1/down', () => HttpResponse.error()))
    await expect(api('GET', '/down')).rejects.toMatchObject({ code: 'NETWORK' })
  })
})
