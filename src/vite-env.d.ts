/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_MODE?: 'mock' | 'real'
  readonly VITE_API_BASE?: string
  /** The office phone number the attendant's "Call the office" button dials. */
  readonly VITE_OFFICE_PHONE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
