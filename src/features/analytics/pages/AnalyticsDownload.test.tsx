import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { renderApp, saveLogin, sampleUserIds } from '@/test/utils'

let blobs: Blob[]
let saved: { name: string; href: string }[]

beforeEach(() => {
  blobs = []
  saved = []
  // jsdom has no object addresses and does not save files, so both are watched.
  URL.createObjectURL = (blob: Blob | MediaSource) => {
    blobs.push(blob as Blob)
    return `blob:analytics-${blobs.length}`
  }
  URL.revokeObjectURL = () => {}
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    saved.push({ name: this.download, href: this.href })
  })
})

async function openAnalytics(path = '/analytics') {
  saveLogin(sampleUserIds.owner)
  const view = renderApp(path)
  await screen.findByRole('table', { name: 'Students and families' })
  return view
}

async function bytesOf(blob: Blob): Promise<Uint8Array> {
  return new Uint8Array(await new Response(blob).arrayBuffer())
}

describe('Analytics download', () => {
  it('downloadSendsTheTokenInTheHeaderNotInTheUrl', async () => {
    const calls: { url: string; auth: string | null }[] = []
    server.events.on('request:start', ({ request }) => {
      if (request.url.includes('students.csv')) {
        calls.push({ url: request.url, auth: request.headers.get('Authorization') })
      }
    })
    await openAnalytics('/analytics?village=Jakhal&sort=name&dir=asc')
    await userEvent.click(screen.getByRole('button', { name: 'Download as Excel' }))
    await waitFor(() => expect(saved).toHaveLength(1))
    server.events.removeAllListeners()

    expect(calls).toHaveLength(1)
    // The token travels in the header. The address only has the filters and the order.
    expect(calls[0]?.auth).toBe('Bearer mock-token-1')
    expect(calls[0]?.url).not.toMatch(/token/i)
    expect(new URL(calls[0]?.url ?? '').search).toBe('?village=Jakhal&sort=name&dir=asc')
    // The file goes to the laptop under the name of the day of the mock clock.
    expect(saved[0]?.name).toBe('students-2026-10-07.csv')
    expect(saved[0]?.href).toMatch(/^blob:/)
  })

  it('saves a file with a byte order mark, the filtered students, readable in Excel', async () => {
    await openAnalytics('/analytics?village=Jakhal')
    await userEvent.click(screen.getByRole('button', { name: 'Download as Excel' }))
    await waitFor(() => expect(blobs).toHaveLength(1))
    const bytes = await bytesOf(blobs[0] as Blob)
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf])
    const text = new TextDecoder('utf-8', { ignoreBOM: true }).decode(bytes)
    const lines = text.slice(1).trimEnd().split('\r\n')
    expect(lines[0]).toContain("Father's occupation")
    expect(lines.length).toBeGreaterThan(1)
    expect(lines.slice(1).every((l) => l.includes('Jakhal'))).toBe(true)
  })

  it('says "Preparing…" while the file is made, and the button is off', async () => {
    server.use(
      http.get('/api/v1/analytics/students.csv', async () => {
        await delay(300)
        return new HttpResponse('﻿a\r\n', {
          headers: { 'Content-Disposition': 'attachment; filename="students-2026-10-07.csv"' },
        })
      }),
    )
    await openAnalytics()
    await userEvent.click(screen.getByRole('button', { name: 'Download as Excel' }))
    const busy = await screen.findByRole('button', { name: 'Preparing…' })
    expect(busy).toBeDisabled()
    await waitFor(() => expect(saved).toHaveLength(1))
    expect(await screen.findByRole('button', { name: 'Download as Excel' })).toBeEnabled()
  })

  it('names the file students-<today> when the server suggests no name', async () => {
    server.use(http.get('/api/v1/analytics/students.csv', () => new HttpResponse('a\r\n')))
    await openAnalytics()
    await userEvent.click(screen.getByRole('button', { name: 'Download as Excel' }))
    await waitFor(() => expect(saved).toHaveLength(1))
    expect(saved[0]?.name).toMatch(/^students-\d{4}-\d{2}-\d{2}\.csv$/)
  })

  it('tells the person when the file could not be made, and saves nothing', async () => {
    server.use(
      http.get('/api/v1/analytics/students.csv', () =>
        HttpResponse.json({ error: 'X', message: 'x' }, { status: 500 }),
      ),
    )
    await openAnalytics()
    await userEvent.click(screen.getByRole('button', { name: 'Download as Excel' }))
    expect(await screen.findByText('The file could not be made. Try again.')).toBeInTheDocument()
    expect(saved).toHaveLength(0)
    expect(screen.getByRole('button', { name: 'Download as Excel' })).toBeEnabled()
  })
})
