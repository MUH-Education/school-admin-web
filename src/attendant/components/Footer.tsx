import type { ReactNode } from 'react'
import { Link } from 'react-router'

/** "आगे: कन्हेड़ी (4 बच्चे) · टोहाना शहर (3 बच्चे)" above the footer. */
export function NextLine({ children }: { children: ReactNode }) {
  return <div className="flex-none bg-paper px-4 py-2 text-[15px] text-ink-soft">{children}</div>
}

export const FOOTER_MIN_HEIGHT = 56

const base = 'flex w-full items-center justify-center text-center'

/** The big dark button at the bottom. A link when it goes to another page. */
export function FooterAction({
  children,
  to,
  onClick,
  disabled = false,
}: {
  children: ReactNode
  to?: string
  onClick?: () => void
  disabled?: boolean
}) {
  const style = { minHeight: FOOTER_MIN_HEIGHT }
  if (to && !disabled) {
    return (
      <Link
        to={to}
        onClick={onClick}
        style={style}
        className={`${base} bg-ink text-sm text-white no-underline`.replace(
          'text-sm',
          'text-[19px] font-bold',
        )}
      >
        {children}
      </Link>
    )
  }
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={style}
      className={`${base} ${
        disabled
          ? 'cursor-not-allowed bg-side-text text-[18px] font-semibold text-ink'
          : 'cursor-pointer bg-ink text-[19px] font-bold text-white'
      }`}
    >
      {children}
    </button>
  )
}

/** The outlined button: "ऑफ़िस को फ़ोन करें" (a tel: link) and "एक-एक बच्चे का नाम देखें". */
export function OutlineButton({
  children,
  tone = 'ink',
  small = false,
  onClick,
  href,
}: {
  children: ReactNode
  tone?: 'ink' | 'bad'
  /** 18px words instead of 19px. */
  small?: boolean
  onClick?: () => void
  href?: string
}) {
  const className = `${base} border-2 bg-panel ${small ? 'text-lg' : 'text-[19px]'} font-bold ${
    tone === 'bad' ? 'border-bad text-bad' : 'border-ink text-ink'
  } cursor-pointer no-underline`
  const style = { minHeight: FOOTER_MIN_HEIGHT }
  return href ? (
    <a href={href} style={style} className={className}>
      {children}
    </a>
  ) : (
    <button type="button" onClick={onClick} style={style} className={className}>
      {children}
    </button>
  )
}
