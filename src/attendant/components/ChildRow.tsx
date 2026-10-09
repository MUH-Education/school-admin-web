import type { ReactNode } from 'react'

/** Every answer button is at least this high (CLAUDE.md, attendant rules). */
export const ANSWER_BUTTON_MIN_HEIGHT = 52

export type AnswerTone = 'good' | 'bad'

export interface AnswerButton {
  label: string
  /** Is this the answer that is shown now? Then the button is filled. */
  pressed: boolean
  /** The colour of a pressed button. */
  tone: AnswerTone
  /** The design gives each button its own width. */
  width: number
  onPress: () => void
}

interface ChildRowProps {
  name: string
  /** The small line under the name. */
  sub: string
  /** The sub line is amber and bold: the tap is on the phone, the server does not have it yet. */
  pending?: boolean
  /** Row colour: green for a done child, red for an absent one. */
  tone?: AnswerTone | null
  /** One or two buttons. */
  buttons: AnswerButton[]
  /** The evening and drop rows are a little higher in the designs. */
  tall?: boolean
}

const rowTone: Record<AnswerTone, string> = { good: 'bg-good-soft', bad: 'bg-bad-soft' }
const filled: Record<AnswerTone, string> = {
  good: 'border-good bg-good text-white',
  bad: 'border-bad bg-bad text-white',
}

/** One child with one or two big answer buttons. The same button pressed again takes the answer back. */
export function ChildRow({
  name,
  sub,
  pending = false,
  tone = null,
  buttons,
  tall = false,
}: ChildRowProps) {
  return (
    <div
      role="group"
      aria-label={name}
      className={`flex items-center gap-2 border-b border-rule py-2 pr-3 pl-4 ${
        tall ? 'min-h-[76px]' : 'min-h-[68px]'
      } ${tone ? rowTone[tone] : 'bg-panel'}`}
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-[21px] leading-[1.2] font-semibold">{name}</span>
        <span
          className={`text-[13.5px] leading-[1.3] ${pending ? 'font-semibold text-dust-text' : 'text-ink-soft'}`}
        >
          {sub}
        </span>
      </div>
      {buttons.map((button, index) => (
        <AnswerButtonView key={index} button={button} first={index === 0 && buttons.length > 1} />
      ))}
    </div>
  )
}

function AnswerButtonView({ button, first }: { button: AnswerButton; first: boolean }): ReactNode {
  return (
    <button
      type="button"
      data-answer-button
      aria-pressed={button.pressed}
      onClick={button.onPress}
      style={{ width: button.width, minHeight: ANSWER_BUTTON_MIN_HEIGHT }}
      className={`flex-none cursor-pointer border-2 ${
        button.pressed ? filled[button.tone] : 'border-rule-strong bg-panel text-ink'
      } ${first ? 'text-[17px] font-bold' : 'text-[16px] font-semibold'}`}
    >
      {button.label}
    </button>
  )
}
