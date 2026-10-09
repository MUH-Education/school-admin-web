import { useTranslation } from 'react-i18next'

interface SendingStripProps {
  /** Taps on the phone that the server has not confirmed. */
  waiting: number
  /** Taps the server refused. */
  problems: number
  online: boolean
  /** The Today page has a larger strip. */
  large?: boolean
  onSeeProblems: () => void
}

/**
 * The four states of docs/07-attendant-offline.md. Always words plus a square, never colour alone.
 * Nothing waiting: green. Waiting and online: amber, sending. Waiting and offline: the big amber
 * banner. Taps the office refused: a red line under it.
 */
export function SendingStrip({
  waiting,
  problems,
  online,
  large = false,
  onSeeProblems,
}: SendingStripProps) {
  const { t } = useTranslation()
  return (
    <div className="flex-none">
      {waiting > 0 && !online ? (
        <div
          role="status"
          className="flex flex-col gap-0.5 border-b-2 border-dust bg-dust-soft px-4 pt-3 pb-3.5"
        >
          <div className="flex items-center gap-2.5 text-[18px] font-bold">
            <span aria-hidden="true" className="size-3 flex-none bg-dust" />
            {t('strip.offlineTitle')}
          </div>
          <div>{t('strip.offlineBody', { n: waiting })}</div>
        </div>
      ) : (
        <div
          role="status"
          className={`flex items-center gap-2.5 border-b border-rule bg-panel ${
            large ? 'px-5 py-2.5 text-[15.5px]' : 'px-4 py-[7px] text-[14.5px]'
          }`}
        >
          <span
            aria-hidden="true"
            className={`size-2.5 flex-none ${waiting > 0 ? 'bg-dust' : 'bg-good'}`}
          />
          {waiting > 0 ? t('strip.sending', { n: waiting }) : t('strip.allSent')}
        </div>
      )}
      {problems > 0 && (
        <div className="flex items-center justify-between gap-3 border-b-2 border-bad bg-bad-soft px-4 py-2">
          <span className="flex items-center gap-2.5 text-[15px] font-bold text-bad">
            <span aria-hidden="true" className="size-2.5 flex-none bg-bad" />
            {t('strip.problems', { n: problems })}
          </span>
          <button
            type="button"
            onClick={onSeeProblems}
            style={{ minHeight: 44 }}
            className="flex-none cursor-pointer border border-bad bg-panel px-3 text-[15.5px] font-semibold text-bad"
          >
            {t('strip.seeProblems')}
          </button>
        </div>
      )}
    </div>
  )
}
