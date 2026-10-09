import type { ComponentProps } from 'react'

interface CheckboxProps extends Omit<ComponentProps<'input'>, 'type'> {
  label: string
  /** A box with a border round the tick and the words, like the choices in a form. */
  boxed?: boolean
}

/** A tick box with its words. The whole line can be pressed. */
export function Checkbox({ label, boxed = false, className = '', ...rest }: CheckboxProps) {
  const look = boxed
    ? 'min-h-12 border border-rule-strong bg-panel py-0 pr-5 pl-4 text-base'
    : 'min-h-11 text-[15px]'
  return (
    <label className={`flex cursor-pointer items-center gap-3 ${look} ${className}`}>
      <input type="checkbox" className="m-0 size-5" {...rest} />
      {label}
    </label>
  )
}
