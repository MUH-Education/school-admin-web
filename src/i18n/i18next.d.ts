import 'i18next'
import type en from './en.json'

// Gives t('key') a spell check: a wrong key is a type error.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation'
    resources: { translation: typeof en }
    returnNull: false
  }
}
