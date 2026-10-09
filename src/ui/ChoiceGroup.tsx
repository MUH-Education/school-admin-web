import { useId } from 'react'

export interface Choice<Value extends string> {
  value: Value
  label: string
}

interface ChoiceGroupProps<Value extends string> {
  legend: string
  choices: Choice<Value>[]
  value: Value
  onChange: (value: Value) => void
  disabled?: boolean
}

/** Big boxes with a round button each. Example: "Only till 16 Oct" or "From now on". */
export function ChoiceGroup<Value extends string>({
  legend,
  choices,
  value,
  onChange,
  disabled,
}: ChoiceGroupProps<Value>) {
  const name = useId()
  return (
    <fieldset className="m-0 border-0 p-0">
      <legend className="mb-2.5 p-0 text-sm font-semibold">{legend}</legend>
      <div className="flex flex-wrap gap-3">
        {choices.map((choice) => {
          const selected = choice.value === value
          return (
            <label
              key={choice.value}
              className={`flex min-h-12 cursor-pointer items-center gap-3 py-0 pr-[18px] pl-3.5 text-[15px] ${
                selected
                  ? 'border-2 border-canal bg-canal-soft font-semibold'
                  : 'border border-rule-strong bg-panel'
              }`}
            >
              <input
                type="radio"
                name={name}
                value={choice.value}
                checked={selected}
                disabled={disabled}
                onChange={() => onChange(choice.value)}
                className="m-0 size-5"
              />
              {choice.label}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
