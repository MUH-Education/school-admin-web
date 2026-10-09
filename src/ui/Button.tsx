import type { ComponentProps } from 'react'
import { buttonClass, type ButtonVariant } from './buttonStyles'

interface ButtonProps extends ComponentProps<'button'> {
  variant?: ButtonVariant
  /** Shows "Saving…" and turns the button off. */
  saving?: boolean
}

export function Button({
  variant = 'primary',
  saving = false,
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
      {saving ? 'Saving…' : children}
    </button>
  )
}
