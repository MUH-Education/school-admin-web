import { useTranslation } from 'react-i18next'
import { AttendantShell } from '../components/AttendantShell'
import { ChildRow } from '../components/ChildRow'
import { EmptyNote } from '../components/EmptyNote'
import { FooterAction, NextLine } from '../components/Footer'
import { PhoneHeader } from '../components/PhoneHeader'
import { DoneStopLine, StopHeader } from '../components/StopLines'
import { classLabel, clock12, routeLabel, vehicleLabel } from '../labels'
import { useTripView } from '../TripContext'
import { useOpenStop } from '../useOpenStop'
import { pressInput, useSaveTaps } from '../usePress'
import { dropStops, firstTapTime, type ChildView } from '../viewState'

const notDropped = (child: ChildView) => child.answers.REACHED_HOME?.outcome !== 'DONE'

/** Home drop (M7): the stops in evening order (the morning order reversed), one button per child. */
export function DropPage() {
  const { t } = useTranslation()
  const { view, manifest } = useTripView()
  const save = useSaveTaps()
  const stops = dropStops(view)
  const { index, current, next, open } = useOpenStop(stops, (s) => s.children.some(notDropped))

  const subtitle = manifest
    ? t('label.routeVehicle', {
        route: routeLabel(manifest.routeName, t),
        vehicle: vehicleLabel(manifest.vehicle, t),
      })
    : ''
  const header = (
    <PhoneHeader
      title={t('drop.title')}
      subtitle={subtitle}
      counter={{
        value: `${view.counts.drop.dropped} / ${view.counts.drop.onBus}`,
        label: t('drop.counter'),
      }}
    />
  )

  if (!current) {
    return (
      <AttendantShell header={header}>
        <EmptyNote>{t('drop.nobody')}</EmptyNote>
      </AttendantShell>
    )
  }

  const doneLines = stops.slice(0, index).map((stop, i) => {
    const dropped = stop.children.filter((c) => !notDropped(c))
    const left = stop.children.length - dropped.length
    const first = firstTapTime(stop.children.map((c) => c.answers.REACHED_HOME))
    const right =
      first === null || left > 0
        ? t('stop.droppedLeft', { count: dropped.length, left })
        : t('stop.droppedCount', { count: dropped.length, time: clock12(first) })
    return (
      <DoneStopLine
        key={stop.id}
        left={t('stop.doneLine', { n: i + 1, name: stop.name })}
        right={right}
        onOpen={() => open(stop)}
      />
    )
  })

  const droppedHere = current.children.filter((c) => !notDropped(c)).length
  const leftHere = current.children.length - droppedHere
  const summary =
    leftHere > 0
      ? t('stop.dropSummary', { done: droppedHere, left: leftHere })
      : t('stop.dropSummaryAll', { done: droppedHere })

  const ahead = stops
    .slice(index + 1, index + 3)
    .map((s) => t('stop.nextItem', { name: s.name, n: s.children.length }))
    .join(' · ')

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
          {ahead && <NextLine>{t('stop.nextList', { list: ahead })}</NextLine>}
          <div className="flex-none bg-paper px-4 pt-2 pb-4">
            {next ? (
              <FooterAction onClick={() => open(next)}>
                {t('drop.nextStop', { name: next.name })}
              </FooterAction>
            ) : (
              <FooterAction to="/trip">{t('drop.finished')}</FooterAction>
            )}
          </div>
        </>
      }
    >
      {current.children.map((child) => {
        const answer = child.answers.REACHED_HOME
        const cls = classLabel(child.className, t)
        const dropped = answer?.outcome === 'DONE'
        const sub = dropped
          ? t(answer.pending ? 'child.droppedPending' : 'child.droppedAt', {
              class: cls,
              time: clock12(answer.at),
            })
          : cls
        return (
          <ChildRow
            key={child.studentId}
            tall
            name={child.name}
            sub={sub}
            pending={answer?.pending}
            tone={dropped ? 'good' : null}
            buttons={[
              {
                label: t(dropped ? 'drop.gotOff' : 'drop.off'),
                pressed: dropped,
                tone: 'good',
                width: 124,
                onPress: () => save([pressInput(child, 'REACHED_HOME', 'DONE')]),
              },
            ]}
          />
        )
      })}
      {leftHere > 0 && (
        <div className="px-4 pt-3.5">
          <button
            type="button"
            onClick={() =>
              save(
                current.children.filter(notDropped).map((c) => ({
                  studentId: c.studentId,
                  eventType: 'REACHED_HOME',
                  outcome: 'DONE',
                })),
              )
            }
            style={{ minHeight: 56 }}
            className="w-full cursor-pointer border-2 border-canal bg-canal-soft text-[18px] font-bold text-ink"
          >
            {t('drop.all')}
          </button>
        </div>
      )}
      <p className="p-4 text-[16px]">{t('drop.note')}</p>
    </AttendantShell>
  )
}
