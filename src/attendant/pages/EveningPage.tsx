import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AttendantShell } from '../components/AttendantShell'
import { CallOffice } from '../components/CallOffice'
import { ChildRow } from '../components/ChildRow'
import { EmptyNote } from '../components/EmptyNote'
import { FooterAction } from '../components/Footer'
import { PhoneHeader } from '../components/PhoneHeader'
import { classLabel, clock12, routeLabel, vehicleLabel } from '../labels'
import { useTripView } from '../TripContext'
import { pressInput, useSaveTaps } from '../usePress'
import { eveningChildren, type ChildView } from '../viewState'

/** Evening boarding (M6): children who came in the morning. Those with no answer are on top. */
export function EveningPage() {
  const { t } = useTranslation()
  const { view, manifest } = useTripView()
  const save = useSaveTaps()
  const [showAnswered, setShowAnswered] = useState(false)

  const candidates = eveningChildren(view)
  const missing = candidates.filter((c) => !c.answers.BOARDED_EVENING)
  const answered = candidates.filter((c) => c.answers.BOARDED_EVENING)
  const { boarded, notTravelling } = view.counts.evening

  const subtitle = manifest
    ? t('label.routeVehicle', {
        route: routeLabel(manifest.routeName, t),
        vehicle: vehicleLabel(manifest.vehicle, t),
      })
    : ''

  function row(child: ChildView) {
    const answer = child.answers.BOARDED_EVENING
    const cls = classLabel(child.className, t)
    const values = { class: cls, stop: child.stopName, time: answer ? clock12(answer.at) : '' }
    const sub =
      answer?.outcome === 'DONE'
        ? t(answer.pending ? 'child.boardedPending' : 'child.boardedAt', values)
        : answer?.outcome === 'NOT_TRAVELLING'
          ? t(answer.pending ? 'child.notTravellingPending' : 'child.notTravelling', values)
          : t('child.inStop', values)
    return (
      <ChildRow
        key={child.studentId}
        tall
        name={child.name}
        sub={sub}
        pending={answer?.pending}
        tone={
          answer?.outcome === 'DONE' ? 'good' : answer?.outcome === 'NOT_TRAVELLING' ? 'bad' : null
        }
        buttons={[
          {
            label: t(answer?.outcome === 'DONE' ? 'evening.boarded' : 'evening.board'),
            pressed: answer?.outcome === 'DONE',
            tone: 'good',
            width: 96,
            onPress: () => save([pressInput(child, 'BOARDED_EVENING', 'DONE')]),
          },
          {
            label: t('evening.notTravelling'),
            pressed: answer?.outcome === 'NOT_TRAVELLING',
            tone: 'bad',
            width: 100,
            onPress: () => save([pressInput(child, 'BOARDED_EVENING', 'NOT_TRAVELLING')]),
          },
        ]}
      />
    )
  }

  return (
    <AttendantShell
      header={
        <PhoneHeader
          title={t('evening.title')}
          subtitle={subtitle}
          counter={{ value: `${boarded} / ${candidates.length}`, label: t('evening.counter') }}
        />
      }
      top={
        missing.length > 0 ? (
          <div
            role="alert"
            className="flex flex-none flex-col gap-0.5 border-b-2 border-bad bg-bad-soft px-4 py-3.5"
          >
            <div className="flex items-center gap-2.5 text-xl font-bold text-bad">
              <span aria-hidden="true" className="size-3 flex-none bg-bad" />
              {t('evening.missingTitle', { n: missing.length })}
            </div>
            <div>{t('evening.missingHint')}</div>
          </div>
        ) : undefined
      }
      bottom={
        <div className="flex flex-none flex-col gap-2.5 bg-paper px-4 pt-2.5 pb-4">
          <CallOffice tone="bad" />
          {missing.length === 0 ? (
            <FooterAction to="/trip/drop">{t('evening.go')}</FooterAction>
          ) : (
            <FooterAction disabled>{t('evening.gated', { n: missing.length })}</FooterAction>
          )}
        </div>
      }
    >
      {candidates.length === 0 && <EmptyNote>{t('evening.nobody')}</EmptyNote>}
      {missing.map(row)}
      {answered.length > 0 && (
        <>
          <div className="flex min-h-14 items-center justify-between gap-3 border-b border-rule bg-good-soft px-4 py-2">
            <span className="text-lg font-semibold">
              {notTravelling > 0
                ? t('evening.answeredNot', { n: boarded, m: notTravelling })
                : t('evening.answered', { n: boarded })}
            </span>
            <button
              type="button"
              aria-expanded={showAnswered}
              onClick={() => setShowAnswered((value) => !value)}
              style={{ minHeight: 44 }}
              className="flex-none cursor-pointer border border-rule-strong bg-panel px-3 text-[15.5px]"
            >
              {t(showAnswered ? 'evening.hideNames' : 'evening.seeNames')}
            </button>
          </div>
          {showAnswered && answered.map(row)}
        </>
      )}
      <p className="p-4 text-base">{t('evening.note')}</p>
    </AttendantShell>
  )
}
