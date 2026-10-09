import { useTranslation } from 'react-i18next'
import { OutlineButton } from './Footer'

/** The office number is set in the build (VITE_OFFICE_PHONE), so the button works with no network. */
const OFFICE_PHONE: string = import.meta.env.VITE_OFFICE_PHONE ?? ''

/** "ऑफ़िस को फ़ोन करें": opens the dialler. Without a number set, nothing is shown. */
export function CallOffice({ tone = 'ink' }: { tone?: 'ink' | 'bad' }) {
  const { t } = useTranslation()
  if (!OFFICE_PHONE) return null
  return (
    <OutlineButton tone={tone} href={`tel:${OFFICE_PHONE}`}>
      {t('common.callOffice')}
    </OutlineButton>
  )
}
