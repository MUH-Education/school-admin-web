import { useTranslation } from 'react-i18next'
import { AttendantShell } from '../components/AttendantShell'
import { ChildRow, type AnswerButton } from '../components/ChildRow'
import { FooterAction, NextLine } from '../components/Footer'
import { PhoneHeader } from '../components/PhoneHeader'
import { DoneStopLine, StopHeader } from '../components/StopLines'
import { EmptyNote } from '../components/EmptyNote'
import { classLabel, clock12, routeLabel, vehicleLabel } from '../labels'
import { useTripView } from '../TripContext'
import { useOpenStop } from '../useOpenStop'
import { pressInput, useSaveTaps } from '../usePress'
import { firstTapTime, type ChildView } from '../viewState'

const isWaiting = (child: ChildView) => !child.answers.BOARDED_MORNING

/** Morning pickup (M3): the open stop has big buttons; stops before it are one grey line each. */
export function PickupPage() {
  const { t } = useTranslation()
  const { view, manifest } = useTripView()
  const save = useSaveTaps()

  const stops = view.stops
  const {
    index,
    current,
    next: nextStop,
    open,
  } = useOpenStop(stops, (s) => s.children.some(isWaiting))

  const subtitle = manifest
    ? t('label.routeVehicle', {
        route: routeLabel(manifest.routeName, t),
        vehicle: vehicleLabel(manifest.vehicle, t),
      })
    : ''

  const header = (
    <PhoneHeader
      title={t('pickup.title')}
      subtitle={subtitle}
      counter={{
        value: `${view.counts.pickup.boarded} / ${view.counts.total}`,
        label: t('pickup.counter'),
      }}
    />
  )

  if (!current) {
    return (
      <AttendantShell header={header}>
        <EmptyNote>{t('pickup.empty')}</EmptyNote>
      </AttendantShell>
    )
  }

  const doneLines = stops.slice(0, index).map((stop, i) => {
    const answers = stop.children.map((c) => c.answers.BOARDED_MORNING)
    const boarded = stop.children.filter((c) => c.answers.BOARDED_MORNING?.outcome === 'DONE')
    const waiting = stop.children.filter(isWaiting).length
    const first = firstTapTime(answers)
    const right =
      first === null
        ? t('stop.doneNoTaps')
        : waiting > 0
          ? t('stop.doneLeft', { count: boarded.length, left: waiting })
          : t('stop.doneCount', { count: boarded.length, time: clock12(first) })
    return (
      <DoneStopLine
        key={stop.id}
        left={t('stop.doneLine', { n: i + 1, name: stop.name })}
        right={right}
        onOpen={() => open(stop)}
      />
    )
  })

  const boardedHere = current.children.filter((c) => c.answers.BOARDED_MORNING?.outcome === 'DONE')
  const absentHere = current.children.filter((c) => c.answers.BOARDED_MORNING?.outcome === 'ABSENT')
  const waitingHere = current.children.length - boardedHere.length - absentHere.length
  const summary = t(waitingHere > 0 ? 'stop.pickupSummaryLeft' : 'stop.pickupSummary', {
    in: boardedHere.length,
    out: absentHere.length,
    left: waitingHere,
  })

  // "Next": the next two things on the road. After the last stop that is the school.
  const ahead = stops
    .slice(index + 1, index + 3)
    .map((s) => t('stop.nextItem', { name: s.name, n: s.children.length }))
  if (ahead.length < 2) ahead.push(t(ahead.length === 0 ? 'stop.school' : 'stop.thenSchool'))
  const aheadList = ahead.join(' · ')

  return (
    <AttendantShell
      header={header}
      scrollKey={current.id}
      top={
        <>
          {doneLines}
          <StopHeader
            title={t('stop.headLine', { n: index + 1, name: current.name })}
            summary={summary}
          />
        </>
      }
      bottom={
        <>
          <NextLine>{t('stop.nextList', { list: aheadList })}</NextLine>
          <div className="flex-none bg-paper px-4 pt-2 pb-4">
            {nextStop ? (
              <FooterAction onClick={() => open(nextStop)}>
                {t('pickup.nextStop', { name: nextStop.name })}
              </FooterAction>
            ) : (
              <FooterAction to="/trip/school">{t('pickup.toSchool')}</FooterAction>
            )}
          </div>
        </>
      }
    >
      {current.children.map((child) => {
        const answer = child.answers.BOARDED_MORNING
        const cls = classLabel(child.className, t)
        const time = answer ? clock12(answer.at) : ''
        const sub =
          answer?.outcome === 'DONE'
            ? t(answer.pending ? 'child.pendingTime' : 'child.withTime', { class: cls, time })
            : answer?.outcome === 'ABSENT'
              ? t(answer.pending ? 'child.absentPending' : 'child.absent', { class: cls })
              : cls
        const buttons: AnswerButton[] = [
          {
            label: t(answer?.outcome === 'DONE' ? 'pickup.boarded' : 'pickup.board'),
            pressed: answer?.outcome === 'DONE',
            tone: 'good',
            width: 98,
            onPress: () => save([pressInput(child, 'BOARDED_MORNING', 'DONE')]),
          },
          {
            label: t('pickup.absent'),
            pressed: answer?.outcome === 'ABSENT',
            tone: 'bad',
            width: 82,
            onPress: () => save([pressInput(child, 'BOARDED_MORNING', 'ABSENT')]),
          },
        ]
        return (
          <ChildRow
            key={child.studentId}
            name={child.name}
            sub={sub}
            pending={answer?.pending}
            tone={answer?.outcome === 'DONE' ? 'good' : answer?.outcome === 'ABSENT' ? 'bad' : null}
            buttons={buttons}
          />
        )
      })}
    </AttendantShell>
  )
}
