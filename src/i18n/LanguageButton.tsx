import { useTranslation } from 'react-i18next'
import { otherLanguage, setLanguage } from './index'

/** Shows the other language's name ("English" in Hindi, "हिंदी" in English). One press switches and is remembered. */
export function LanguageButton({ className = '' }: { className?: string }) {
  const { t, i18n } = useTranslation()
  return (
    <button
      type="button"
      lang={otherLanguage(i18n.language)}
      aria-label={t('lang.switchLabel')}
      onClick={() => setLanguage(otherLanguage(i18n.language))}
      className={`min-h-11 cursor-pointer border border-side-label bg-transparent px-4 text-[15px] text-white ${className}`}
    >
      {t('lang.switchTo')}
    </button>
  )
}
