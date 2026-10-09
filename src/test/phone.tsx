import { vi } from 'vitest'
import { refreshLocalState } from '@/attendant/localState'
import { saveManifest } from '@/attendant/tapStore'
import type { Manifest } from '@/attendant/types'
import { i18n } from '@/i18n'
import { at, makeManifest, setOnline } from './attendant'
import { renderApp, saveLogin } from './utils'

/** Freezes only the date, at 7:48 on the fixed day of the mock. Timers stay real. */
export function freezeClock(time = '07:48:00') {
  vi.useFakeTimers({ toFake: ['Date'], now: at(time) })
}

/**
 * Opens a phone page as Balwan, with Hindi, today's list already saved on the phone (so no network
 * is needed) and the clock at 7:48. Pass `manifest: null` to start with an empty phone.
 * `language: null` means no saved choice.
 */
export async function openPhone(
  path: string,
  options: { manifest?: Manifest | null; language?: 'hi' | 'en' | null; online?: boolean } = {},
) {
  freezeClock()
  setOnline(options.online ?? true)
  // `null`: the person never chose a language (the app shows English until a page asks otherwise).
  const language = options.language === undefined ? 'hi' : options.language
  await i18n.changeLanguage(language ?? 'en')
  if (language) localStorage.setItem('lang', language)
  saveLogin(5)
  if (options.manifest !== null) {
    await saveManifest(options.manifest ?? makeManifest())
    await refreshLocalState()
  }
  return renderApp(path)
}
