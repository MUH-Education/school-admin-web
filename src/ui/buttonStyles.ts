export type ButtonVariant = 'primary' | 'secondary' | 'plain' | 'danger' | 'dark' | 'outline'

const base =
  'inline-flex min-h-11 items-center justify-center border px-[18px] font-semibold no-underline cursor-pointer disabled:cursor-not-allowed disabled:border-side-text disabled:bg-side-text disabled:text-ink-soft aria-disabled:cursor-not-allowed'

const variants: Record<ButtonVariant, string> = {
  primary: 'border-canal bg-canal text-white',
  secondary: 'border-canal bg-panel text-canal',
  plain: 'border-rule-strong bg-panel text-ink',
  danger: 'border-bad bg-panel text-bad',
  dark: 'border-ink bg-ink text-white',
  // A dark outline on white, for a button inside a callout box (Enquiry list: Show only overdue).
  outline: 'border-ink bg-panel text-ink',
}

export function buttonClass(variant: ButtonVariant): string {
  return `${base} ${variants[variant]}`
}
