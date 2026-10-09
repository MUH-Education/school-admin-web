import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { AttendantShell } from '../components/AttendantShell'
import { ChildRow } from '../components/ChildRow'
import { EmptyNote } from '../components/EmptyNote'
import { FooterAction, OutlineButton } from '../components/Footer'
import { QuestionDialog } from '../components/PhoneDialog'
import { PhoneHeader } from '../components/PhoneHeader'
import { classLabel, clock12, routeLabel, vehicleLabel } from '../labels'
import { useTripView } from '../TripContext'
import { pressInput, useSaveTaps } from '../usePress'

/** Reached school (M5): one big button with one confirm, or the children one by one. */
export function SchoolPage() {
  const { t } = useTranslation()
  const { view, manifest } = useTripView()
  const save = useSaveTaps()
  const [params, setParams] = useSearchParams()
  const [asking, setAsking] = useState(false)
  const byName = params.get('names') === '1'

  const onBus = view.children.filter((c) => c.answers.BOARDED_MORNING?.outcome === 'DONE')
  const absent = view.children.filter((c) => c.answers.BOARDED_MORNING?.outcome === 'ABSENT')
  const notYet = onBus.filter((c) => c.answers.REACHED_SCHOOL?.outcome !== 'DONE')
  const allReached = onBus.length > 0 && notYet.length === 0

  const subtitle = manifest
    ? t('label.routeVehicle', {
        route: routeLabel(manifest.routeName, t),
        vehicle: vehicleLabel(manifest.vehicle, t),
      })
    : ''
  const header = <PhoneHeader title={t('school.title')} subtitle={subtitle} />

  // The only confirm in the app: one press sends one SMS for every child.
  function confirmAll() {
    setAsking(false)
    save(
      notYet.map((c) => ({ studentId: c.studentId, eventType: 'REACHED_SCHOOL', outcome: 'DONE' })),
    )
  }

  if (byName) {
    return (
      <AttendantShell
        header={header}
        top={
          <div className="flex min-h-[58px] flex-none items-center justify-between gap-3 bg-canal px-4 py-2 text-white">
            <h2 className="text-[21px] font-bold">{t('school.namesTitle')}</h2>
            <span className="text-[14.5px]">
              {t('school.namesCount', { done: onBus.length - notYet.length, total: onBus.length })}
            </span>
          </div>
        }
        bottom={
          <div className="flex-none bg-paper px-4 pt-2 pb-4">
            <OutlineButton onClick={() => setParams({}, { replace: true })}>
              {t('school.namesBack')}
            </OutlineButton>
          </div>
        }
      >
        {onBus.length === 0 && <EmptyNote>{t('school.nobody')}</EmptyNote>}
        {onBus.map((child) => {
          const answer = child.answers.REACHED_SCHOOL
          const cls = classLabel(child.className, t)
          const reached = answer?.outcome === 'DONE'
          const sub = reached
            ? t(answer.pending ? 'child.reachedPending' : 'child.reachedAt', {
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
              tone={reached ? 'good' : null}
              buttons={[
                {
                  label: t(reached ? 'school.reachedDone' : 'school.reached'),
                  pressed: reached,
                  tone: 'good',
                  width: 124,
                  onPress: () => save([pressInput(child, 'REACHED_SCHOOL', 'DONE')]),
                },
              ]}
            />
          )
        })}
      </AttendantShell>
    )
  }

  return (
    <AttendantShell
      header={header}
      mainClassName="gap-5 bg-paper px-4 pt-6"
      bottom={
        allReached ? (
          <div className="flex-none bg-paper px-4 pt-2 pb-4">
            <FooterAction to="/trip">{t('common.backToday')}</FooterAction>
          </div>
        ) : undefined
      }
    >
      <h2 className="mx-1 text-[26px] leading-tight font-bold">{t('school.question')}</h2>

      <div className="grid grid-cols-2 gap-px border border-rule bg-rule">
        <div className="flex flex-col bg-panel px-4 py-3.5">
          <span className="text-[34px] leading-[1.1] font-bold">{onBus.length}</span>
          <span className="text-[16px] text-ink-soft">{t('school.onBus')}</span>
        </div>
        <div className="flex flex-col bg-panel px-4 py-3.5">
          <span className="text-[34px] leading-[1.1] font-bold">{absent.length}</span>
          <span className="text-[16px] text-ink-soft">{t('school.absent')}</span>
        </div>
      </div>

      {onBus.length === 0 ? (
        <EmptyNote>{t('school.nobody')}</EmptyNote>
      ) : allReached ? (
        <p
          role="status"
          className="border-2 border-good bg-good-soft px-4 py-6 text-center text-[26px] leading-tight font-bold text-good"
        >
          {t('school.allDone', { n: onBus.length })}
        </p>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setAsking(true)}
            style={{ minHeight: 136 }}
            className="flex w-full cursor-pointer flex-col items-center justify-center gap-0.5 border-none bg-good p-4 text-white"
          >
            <span className="text-[26px] leading-tight font-bold">
              {t('school.bigLine1', { n: onBus.length })}
            </span>
            <span className="text-[26px] leading-tight font-bold">{t('school.bigLine2')}</span>
          </button>
          <p className="mx-1 text-[16px]">{t('school.note')}</p>
        </>
      )}

      {onBus.length > 0 && (
        <OutlineButton small onClick={() => setParams({ names: '1' }, { replace: true })}>
          {t('school.byName')}
        </OutlineButton>
      )}

      {absent.length > 0 && (
        <div className="flex flex-col gap-1 border border-rule bg-panel px-4 py-3.5">
          <div className="text-[15px] font-semibold text-ink-soft">{t('school.absentHeading')}</div>
          {absent.map((child) => (
            <div key={child.studentId} className="text-[18px]">
              {child.name}{' '}
              <span className="text-[15px] text-ink-soft">{classLabel(child.className, t)}</span>
            </div>
          ))}
        </div>
      )}

      <QuestionDialog
        open={asking}
        title={t('school.confirm', { n: onBus.length })}
        hint={t('school.confirmHint')}
        yes={t('common.yes')}
        no={t('common.no')}
        onYes={confirmAll}
        onNo={() => setAsking(false)}
      />
    </AttendantShell>
  )
}
