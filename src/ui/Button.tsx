import type { ComponentProps } from 'react'
import { buttonClass, type ButtonVariant } from './buttonStyles'

interface ButtonProps extends ComponentProps<'button'> {
  variant?: ButtonVariant
  /** Shows "Saving…" and turns the button off. */
  saving?: boolean
  /** The words while saving. The phone app passes Hindi words. */
  savingLabel?: string
}

export function Button({
  variant = 'primary',
  saving = false,
  savingLabel = 'Saving…',
  type = 'button',
  disabled,
  className = '',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || saving}
      aria-busy={saving || undefined}
      className={`${buttonClass(variant)} ${className}`}
      {...rest}
    >
      {saving ? savingLabel : children}
    </button>
  )
}
