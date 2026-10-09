import i18n from 'i18next'
import { useLayoutEffect } from 'react'
import { initReactI18next } from 'react-i18next'
import en from './en.json'
import hi from './hi.json'

export type Language = 'hi' | 'en'

const LANGUAGE_KEY = 'lang'

export function savedLanguage(): Language | null {
  try {
    const value = localStorage.getItem(LANGUAGE_KEY)
    return value === 'hi' || value === 'en' ? value : null
  } catch {
    return null
  }
}

/** The person's own choice is saved on the phone. The attendant app starts in Hindi, the rest in English. */
export function setLanguage(language: Language): void {
  try {
    localStorage.setItem(LANGUAGE_KEY, language)
  } catch {
    // Storage blocked: the choice lasts until the page closes.
  }
  void i18n.changeLanguage(language)
}

/** Without a saved choice, a page asks for its own default (Hindi on /trip, English on the rest). */
export function useDefaultLanguage(language: Language): void {
  useLayoutEffect(() => {
    if (savedLanguage() === null && i18n.language !== language) {
      void i18n.changeLanguage(language)
    }
  }, [language])
}

export function otherLanguage(language: string): Language {
  return language === 'hi' ? 'en' : 'hi'
}

function startLanguage(): Language {
  const path = typeof location === 'undefined' ? '' : location.pathname
  return path === '/trip' || path.startsWith('/trip/') ? 'hi' : 'en'
}

void i18n.use(initReactI18next).init({
  resources: { hi: { translation: hi }, en: { translation: en } },
  lng: savedLanguage() ?? startLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  initAsync: false,
})

export { i18n }
