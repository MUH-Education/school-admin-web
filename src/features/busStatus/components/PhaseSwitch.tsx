import { phaseChoices } from '../labels'
import type { BusPhase } from '../types'

interface PhaseSwitchProps {
  /** Null while the server has not said which phase it picked. */
  value: BusPhase | null
  onChange: (phase: BusPhase) => void
}

/** Three joined buttons. The pressed one is dark. */
export function PhaseSwitch({ value, onChange }: PhaseSwitchProps) {
  return (
    <div role="group" aria-label="Part of the day" className="flex flex-wrap border border-ink">
      {phaseChoices.map((choice, index) => {
        const pressed = value === choice.value
        return (
          <button
            key={choice.value}
            type="button"
            aria-pressed={pressed}
            onClick={() => onChange(choice.value)}
            className={`min-h-11 cursor-pointer px-4 ${index > 0 ? 'border-l border-ink' : ''} ${pressed ? 'bg-ink font-semibold text-white' : 'bg-panel text-ink'}`}
          >
            {choice.label}
          </button>
        )
      })}
    </div>
  )
}
