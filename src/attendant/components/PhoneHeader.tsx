import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'

interface PhoneHeaderProps {
  title: string
  /** For example "रूट 4 · वैन 4" */
  subtitle: string
  /** The big number on the right, for example "11 / 19", and the small words under it. */
  counter?: { value: string; label: string }
  /** Where the back button goes. */
  backTo?: string
}

/** The dark bar on top of the pickup, school, evening and drop pages. */
export function PhoneHeader({ title, subtitle, counter, backTo = '/trip' }: PhoneHeaderProps) {
  const { t } = useTranslation()
  return (
    <header className="flex min-h-[68px] flex-none items-center gap-3 bg-ink px-4 py-3 text-white">
      <Link
        to={backTo}
        aria-label={t('common.back')}
        className="flex size-11 flex-none items-center justify-center border border-side-label text-[28px] leading-none text-white no-underline"
      >
        <span aria-hidden="true">‹</span>
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <h1 className="text-[22px] leading-[1.2] font-bold">{title}</h1>
        <span className="text-[14.5px] text-side-text">{subtitle}</span>
      </div>
      {counter && (
        <div className="flex flex-none flex-col items-end">
          <span className="text-2xl leading-[1.1] font-bold" aria-label={counter.label}>
            {counter.value}
          </span>
          <span className="text-[13.5px] text-side-text">{counter.label}</span>
        </div>
      )}
    </header>
  )
}
