import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useDefaultLanguage } from '@/i18n'
import { useTrip } from '../TripContext'
import { ProblemsDialog } from './ProblemsDialog'
import { SendingStrip } from './SendingStrip'

interface AttendantShellProps {
  /** The dark bar on top: `PhoneHeader`, or the greeting of the Today page. */
  header: ReactNode
  /** Fixed lines between the strip and the list, for example the stop lines. */
  top?: ReactNode
  /** Fixed lines under the list: the "next" line and the buttons. */
  bottom?: ReactNode
  /** Classes for the scrolling area. White by default. */
  mainClassName?: string
  /** The Today page has a larger strip. */
  stripLarge?: boolean
  children: ReactNode
}

/**
 * The frame of every phone page: header, sending strip, fixed lines, a list that scrolls, and a
 * bottom area that stays on the screen. Always the Hindi font (Mukta also draws the numbers).
 */
export function AttendantShell({
  header,
  top,
  bottom,
  mainClassName = 'bg-panel',
  stripLarge = false,
  children,
}: AttendantShellProps) {
  const { i18n, t } = useTranslation()
  useDefaultLanguage('hi')
  const { sync, stale } = useTrip()
  const [showProblems, setShowProblems] = useState(false)

  return (
    <div
      lang={i18n.language}
      className="mx-auto flex h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-paper font-hindi text-base leading-[1.35] text-ink"
    >
      {header}
      <SendingStrip
        waiting={sync.waiting}
        problems={sync.problems}
        online={sync.online}
        large={stripLarge}
        onSeeProblems={() => setShowProblems(true)}
      />
      {stale && (
        <div role="alert" className="flex-none border-b-2 border-dust bg-dust-soft px-4 py-3">
          <div className="flex items-center gap-2.5 text-base font-bold">
            <span aria-hidden="true" className="size-3 flex-none bg-dust" />
            {t('day.staleBanner')}
          </div>
        </div>
      )}
      {top}
      <main className={`flex min-h-0 flex-1 flex-col overflow-y-auto ${mainClassName}`}>
        {children}
      </main>
      {bottom}
      <ProblemsDialog open={showProblems} onClose={() => setShowProblems(false)} />
    </div>
  )
}
