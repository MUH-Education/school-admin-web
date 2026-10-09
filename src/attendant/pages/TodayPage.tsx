import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { useAuth } from '@/auth/useAuth'
import { LanguageButton } from '@/i18n/LanguageButton'
import { AttendantShell } from '../components/AttendantShell'
import { CallOffice } from '../components/CallOffice'
import { dayLabel, hhmm12, routeLabel, vehicleLabel } from '../labels'
import { useTripView } from '../TripContext'
import { jobsOf, type JobState, type Jobs } from '../viewState'

type JobKey = 'pickup' | 'school' | 'evening' | 'drop'

const jobPath: Record<JobKey, string> = {
  pickup: '/trip/pickup',
  school: '/trip/school',
  evening: '/trip/evening',
  drop: '/trip/drop',
}

/** The words under a job's name: not done, running with a count, or done. */
function jobStatus(
  key: JobKey,
  job: Jobs[JobKey],
  times: { start: string; end: string },
  t: TFunction,
) {
  const counts = { done: job.done, total: job.total }
  const state: JobState = job.state
  switch (key) {
    case 'pickup':
      return state === 'PENDING'
        ? t('today.pending')
        : t(state === 'DONE' ? 'today.pickupDone' : 'today.pickupRunning', counts)
    case 'school':
      if (state === 'PENDING') return t('today.schoolPending', { time: hhmm12(times.start) })
      return state === 'DONE'
        ? t('today.schoolDone', { done: job.done })
        : t('today.schoolRunning', counts)
    case 'evening':
      if (state === 'PENDING') return t('today.eveningPending', { time: hhmm12(times.end) })
      return t(state === 'DONE' ? 'today.eveningDone' : 'today.eveningRunning', counts)
    case 'drop':
      return state === 'PENDING'
        ? t('today.pending')
        : t(state === 'DONE' ? 'today.dropDone' : 'today.dropRunning', counts)
  }
}

/** Today (M2): the four jobs of the day. The one to do now has the blue border. */
export function TodayPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { view, manifest, today } = useTripView()
  const jobs = jobsOf(view)
  const times = { start: manifest?.schoolStarts ?? '', end: manifest?.schoolEnds ?? '' }
  const route = manifest
    ? t('label.routeVehicle', {
        route: routeLabel(manifest.routeName, t),
        vehicle: vehicleLabel(manifest.vehicle, t),
      })
    : ''
  const keys: JobKey[] = ['pickup', 'school', 'evening', 'drop']

  return (
    <AttendantShell
      stripLarge
      mainClassName="gap-3 bg-paper px-4 pt-4"
      header={
        <header className="relative flex flex-none flex-col gap-0.5 bg-ink px-5 pt-[18px] pb-5 text-white">
          <div className="text-[15px] text-dust-light">{dayLabel(today, t)}</div>
          <h1 className="pr-24 text-[26px] leading-tight font-bold">
            {t('today.hello', { name: user?.name ?? '' })}
          </h1>
          <div className="text-[17px] text-side-text">
            {t('today.meta', { route, n: view.counts.total })}
          </div>
          <LanguageButton className="absolute top-3 right-4" />
        </header>
      }
      bottom={
        <footer className="flex-none px-4 pt-3.5 pb-[18px]">
          <CallOffice />
        </footer>
      }
    >
      <h2 className="mx-1 text-[17px] font-semibold text-ink-soft">{t('today.jobs')}</h2>
      {keys.map((key, index) => {
        const job = jobs[key]
        const current = jobs.current === key
        const finished = job.state === 'DONE'
        return (
          <Link
            key={key}
            to={jobPath[key]}
            aria-current={current ? 'step' : undefined}
            className={`flex min-h-[112px] items-center gap-3.5 px-4 py-3.5 text-ink no-underline ${
              current ? 'border-2 border-canal bg-canal-soft' : 'border border-rule bg-panel'
            }`}
          >
            <span
              aria-hidden="true"
              className={`flex size-11 flex-none items-center justify-center text-[22px] font-bold ${
                current
                  ? 'bg-canal text-white'
                  : finished
                    ? 'border-2 border-good text-good'
                    : 'border-2 border-rule-strong text-ink'
              }`}
            >
              {finished ? '✓' : index + 1}
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-[22px] leading-[1.2] font-bold">{t(`today.${key}`)}</span>
              <span className={`text-base ${current ? '' : 'text-ink-soft'}`}>
                {jobStatus(key, job, times, t)}
              </span>
            </span>
            <span
              aria-hidden="true"
              className={`flex-none text-[17px] ${current ? 'font-bold text-canal' : 'text-ink-soft'}`}
            >
              {current ? t('today.open') : '›'}
            </span>
          </Link>
        )
      })}
    </AttendantShell>
  )
}
