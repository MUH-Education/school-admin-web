import { http, HttpResponse } from 'msw'
import { server } from './server'

it('answers a mocked GET /api/v1/ping', async () => {
  server.use(http.get('/api/v1/ping', () => HttpResponse.json({ pong: true })))
  const response = await fetch('http://localhost:3000/api/v1/ping')
  expect(await response.json()).toEqual({ pong: true })
})
