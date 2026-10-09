import { Outlet } from 'react-router'
import { useTranslation } from 'react-i18next'
import { LanguageButton } from '@/i18n/LanguageButton'
import { AttendantShell } from '../components/AttendantShell'
import { CallOffice } from '../components/CallOffice'
import { useToday, useTripDay } from '../day'
import { TripContext } from '../TripContext'
import { useSync } from '../useSync'

/** The bar for the states before the list is there: opening, error, no route. */
function SimpleHeader() {
  const { t } = useTranslation()
  return (
    <header className="flex min-h-[68px] flex-none items-center justify-between gap-3 bg-ink px-4 py-3 text-white">
      <h1 className="text-[22px] font-bold">{t('app.name')}</h1>
      <LanguageButton />
    </header>
  )
}

/**
 * Wraps every phone page. It makes sure today's list is on the phone, starts the sync loop, and
 * gives the pages the state of both. The list is read from IndexedDB, so with the list saved the
 * pages open with no network.
 */
export function TripLayout() {
  const { t } = useTranslation()
  const today = useToday()
  const sync = useSync()
  const day = useTripDay(today)

  const value = {
    sync,
    stale: day.status === 'ready' && day.stale,
    today,
    retryDay: day.retry,
  }

  return (
    <TripContext value={value}>
      {day.status === 'ready' ? (
        <Outlet />
      ) : (
        <AttendantShell header={<SimpleHeader />} mainClassName="bg-paper">
          {day.status === 'loading' && (
            <p role="status" className="p-6 text-lg text-ink-soft">
              {t('day.loading')}
            </p>
          )}
          {day.status === 'error' && (
            <div role="alert" className="flex flex-col items-stretch gap-4 p-4">
              <div className="flex flex-col gap-1 border border-bad bg-bad-soft p-4">
                <p className="text-xl font-bold text-bad">{t('day.failedTitle')}</p>
                <p>{t('day.failedHint')}</p>
              </div>
              <button
                type="button"
                onClick={day.retry}
                style={{ minHeight: 56 }}
                className="cursor-pointer border-2 border-ink bg-panel text-[19px] font-bold"
              >
                {t('common.retry')}
              </button>
              <CallOffice />
            </div>
          )}
          {day.status === 'noRoute' && (
            <div className="flex flex-col items-stretch gap-4 p-4">
              <p className="border border-rule bg-panel p-4 text-xl font-bold">
                {t('day.noRoute')}
              </p>
              <CallOffice />
            </div>
          )}
        </AttendantShell>
      )}
    </TripContext>
  )
}
