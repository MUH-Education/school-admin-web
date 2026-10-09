import type { ClassName } from './types'

/** classAndSection('Class 4', 'A') → "4 A" ; classAndSection('UKG', null) → "UKG" */
export function classAndSection(className: ClassName, section: string | null): string {
  const short = className.replace(/^Class /, '')
  return section ? `${short} ${section}` : short
}

/** The long form for a heading: "Class 4 A", "UKG". */
export function longClass(className: ClassName, section: string | null): string {
  return section ? `${className} ${section}` : className
}

/** initials('Ishaan Sharma') → "IS" ; at most two letters. */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}
