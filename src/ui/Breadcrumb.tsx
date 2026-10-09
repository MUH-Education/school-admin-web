import { Link } from 'react-router'

interface Crumb {
  label: string
  /** Missing on the last crumb: it is the page you are on. */
  to?: string
}

/** "Students / Ishaan Sharma". `roomy` is the 14px size of the Add an enquiry design. */
export function Breadcrumb({ items, roomy = false }: { items: Crumb[]; roomy?: boolean }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={`text-ink-soft ${roomy ? 'text-[14px]' : 'text-[13px]'}`}
    >
      <ol className="flex flex-wrap gap-x-2">
        {items.map((item, index) => (
          <li key={item.label} className="flex gap-2">
            {index > 0 && <span aria-hidden="true">/</span>}
            {item.to ? (
              <Link to={item.to} className="text-canal underline">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-ink">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
