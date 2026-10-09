import type { ComponentProps } from 'react'

interface CheckboxProps extends Omit<ComponentProps<'input'>, 'type'> {
  label: string
}

/** A tick box with its words. The whole line can be pressed. */
export function Checkbox({ label, className = '', ...rest }: CheckboxProps) {
  return (
    <label className={`flex min-h-11 cursor-pointer items-center gap-3 text-[15px] ${className}`}>
      <input type="checkbox" className="m-0 size-5" {...rest} />
      {label}
    </label>
  )
}
