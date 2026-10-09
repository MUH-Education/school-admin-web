import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { eveningManifest } from '@/test/attendant'
import { openPhone } from '@/test/phone'
import en from '@/i18n/en.json'
import hi from '@/i18n/hi.json'
import type { Manifest } from '../types'

// The five phone pages, each in a state that shows many of its words.
const pages: { name: string; path: string; manifest?: Manifest; ready: string }[] = [
  { name: 'Today', path: '/trip', ready: 'h2' },
  { name: 'Morning pickup', path: '/trip/pickup', ready: 'h2' },
  { name: 'Reached school', path: '/trip/school', ready: 'h2' },
  { name: 'Evening boarding', path: '/trip/evening', ready: 'h2' },
  { name: 'Home drop', path: '/trip/drop', manifest: eveningManifest(), ready: 'h2' },
]

function leaves(value: unknown, path: string[] = []): { key: string; text: string }[] {
  if (typeof value === 'string') return [{ key: path.join('.'), text: value }]
  return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) =>
    leaves(v, [...path, k]),
  )
}

const DEVANAGARI = /[ऀ-ॿ]/

/**
 * The words on the page: all text, plus the names of buttons and groups (aria-labels). The language
 * button is left out: it shows the other language's own name on purpose ("हिंदी" in English).
 */
function pageWords(): string {
  const body = document.body.cloneNode(true) as HTMLElement
  body.querySelectorAll('button[lang]').forEach((button) => button.remove())
  const labels = [...body.querySelectorAll('[aria-label]')].map((e) => e.getAttribute('aria-label'))
  return `${body.textContent} ${labels.join(' ')}`
}

describe('everyVisibleTextComesFromTheLanguageFile', () => {
  for (const page of pages) {
    it(`${page.name}: in English no Hindi letter is on the screen`, async () => {
      await openPhone(page.path, { language: 'en', manifest: page.manifest })
      await screen.findByRole('heading', { level: page.name === 'Today' ? 1 : 1 })
      await waitFor(() => expect(document.querySelectorAll('h1,h2').length).toBeGreaterThan(0))
      expect(pageWords().match(DEVANAGARI)).toBeNull()
    })

    it(`${page.name}: in Hindi no English sentence of en.json is on the screen`, async () => {
      await openPhone(page.path, { language: 'hi', manifest: page.manifest })
      await screen.findByRole('heading', { level: 1 })
      await waitFor(() => expect(document.querySelectorAll('h1,h2').length).toBeGreaterThan(0))
      const words = pageWords()
      const hiByKey = new Map(leaves(hi).map((l) => [l.key, l.text]))
      for (const { key, text } of leaves(en)) {
        // Only whole sentences without blanks to fill in; same-in-both words (SMS, MUH Jain Global School) are fine.
        if (text.includes('{{') || text.length < 6 || hiByKey.get(key) === text) continue
        expect(words, `English text of "${key}" is on the Hindi page`).not.toContain(text)
      }
    })
  }

  it('the language button switches the whole Today page and the choice is kept', async () => {
    await openPhone('/trip', { language: 'hi' })
    expect(await screen.findByRole('heading', { name: 'नमस्ते, Balwan' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'भाषा बदलें: English' }))
    expect(await screen.findByRole('heading', { name: 'Hello, Balwan' })).toBeInTheDocument()
    expect(screen.getByText('Wednesday, 7 October')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Morning pickup/ })).toHaveTextContent(
      'Running · 3 / 7 boarded',
    )
    expect(screen.getByRole('link', { name: 'Call the office' })).toBeInTheDocument()
    expect(localStorage.getItem('lang')).toBe('en')
    expect(pageWords().match(DEVANAGARI)).toBeNull()
  })

  it('the pickup page switches too', async () => {
    await openPhone('/trip/pickup', { language: 'en' })
    expect(await screen.findByRole('heading', { name: 'Stop 2 · Jakhal' })).toBeInTheDocument()
    expect(screen.getByText('1 boarded · 1 absent · 1 left')).toBeInTheDocument()
    expect(screen.getByText('Next: Kanheri (2 children) · then school')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Aryan' })).toHaveTextContent(
      'Class 3 B · boarded at 7:42',
    )
  })

  it('a phone page opens in Hindi when the person never chose a language', async () => {
    await openPhone('/trip', { language: null })
    expect(await screen.findByRole('heading', { name: 'नमस्ते, Balwan' })).toBeInTheDocument()
    expect(localStorage.getItem('lang')).toBeNull()
  })

  it('the login page stays English when the person never chose a language', async () => {
    const { renderApp } = await import('@/test/utils')
    renderApp('/login')
    expect(await screen.findByLabelText('Mobile number')).toBeInTheDocument()
  })
})

describe('allAnswerButtonsAreAtLeast52pxHigh', () => {
  for (const page of pages) {
    it(`${page.name}: every answer button is 52px or higher, every footer button 56px`, async () => {
      await openPhone(page.path, { manifest: page.manifest })
      await screen.findByRole('heading', { level: 1 })
      await waitFor(() => expect(document.querySelectorAll('h1,h2').length).toBeGreaterThan(0))
      for (const button of document.querySelectorAll<HTMLElement>('[data-answer-button]')) {
        expect(parseInt(button.style.minHeight), button.textContent ?? '').toBeGreaterThanOrEqual(
          52,
        )
      }
      // The big buttons: the footer action, the call button and the school button.
      for (const element of document.querySelectorAll<HTMLElement>(
        'footer a, footer button, main > button',
      )) {
        const height = parseInt(element.style.minHeight || '0')
        expect(height, element.textContent ?? '').toBeGreaterThanOrEqual(52)
      }
    })
  }
})
