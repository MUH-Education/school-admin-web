import type { ComponentProps } from 'react'
import { Link } from 'react-router'
import { buttonClass, type ButtonVariant } from './buttonStyles'

interface LinkButtonProps extends ComponentProps<typeof Link> {
  variant?: ButtonVariant
}

/** A link that looks like a Button. */
export function LinkButton({ variant = 'primary', className = '', ...rest }: LinkButtonProps) {
  return <Link className={`${buttonClass(variant)} ${className}`} {...rest} />
}
