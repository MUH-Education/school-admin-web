import { useTranslation } from 'react-i18next'
import { Dialog } from '@/ui/Dialog'
import { refreshLocalState, useLocalState } from '../localState'
import { clearProblems } from '../tapStore'
import { clock12 } from '../labels'

const BUTTON_HEIGHT = 56

/** The list of taps the office did not take, with the reason in simple words and a clear button. */
export function ProblemsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const { problems } = useLocalState()

  async function clear() {
    await clearProblems()
    await refreshLocalState()
    onClose()
  }

  return (
    <Dialog open={open} title={t('problems.title')} onClose={onClose} className="font-hindi">
      <ul className="mb-5 flex flex-col gap-3">
        {problems.map((problem) => (
          <li key={problem.id} className="border border-rule bg-bad-soft p-3">
            <div className="text-lg font-semibold">
              {t('problems.line', {
                name: problem.name || t('problems.unknownChild', { id: problem.studentId }),
                event: t(`problems.event.${problem.eventType}`),
              })}
              <span className="font-normal text-ink-soft"> · {clock12(problem.occurredAt)}</span>
            </div>
            <div>
              {problem.error === 'NOT_YOUR_ROUTE'
                ? t('problems.reason.NOT_YOUR_ROUTE')
                : t('problems.reason.other')}
            </div>
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => void clear()}
          style={{ minHeight: BUTTON_HEIGHT }}
          className="cursor-pointer border-2 border-ink bg-ink text-lg font-bold text-white"
        >
          {t('problems.clear')}
        </button>
        <button
          type="button"
          onClick={onClose}
          style={{ minHeight: BUTTON_HEIGHT }}
          className="cursor-pointer border-2 border-rule-strong bg-panel text-lg font-semibold"
        >
          {t('problems.close')}
        </button>
      </div>
    </Dialog>
  )
}
