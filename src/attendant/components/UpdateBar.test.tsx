import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { openPhone } from '@/test/phone'

// This file brings its own service worker stand-in, so a test can say "a new version is waiting".
const worker = vi.hoisted(() => ({ needRefresh: false, update: vi.fn(async () => {}) }))
vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [worker.needRefresh, () => {}],
    offlineReady: [false, () => {}],
    updateServiceWorker: worker.update,
  }),
}))

beforeEach(() => {
  worker.needRefresh = false
  worker.update.mockClear()
})

describe('the "new version" bar', () => {
  it('is not there when there is no new version', async () => {
    await openPhone('/trip')
    await screen.findByText('आज के चार काम')
    expect(screen.queryByText('नया वर्ज़न आ गया · अभी लें')).not.toBeInTheDocument()
  })

  it('shows the bar, does nothing by itself, and installs only when the attendant presses it', async () => {
    worker.needRefresh = true
    await openPhone('/trip')
    await screen.findByText('आज के चार काम')
    const bar = await screen.findByRole('button', { name: 'नया वर्ज़न आ गया · अभी लें' })
    expect(worker.update).not.toHaveBeenCalled()
    await userEvent.click(bar)
    expect(worker.update).toHaveBeenCalledWith(true)
  })

  it('is on every phone page', async () => {
    worker.needRefresh = true
    await openPhone('/trip/pickup')
    expect(await screen.findByRole('button', { name: /नया वर्ज़न/ })).toBeInTheDocument()
  })
})
