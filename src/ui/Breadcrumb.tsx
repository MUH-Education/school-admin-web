import { Link } from 'react-router'

interface Crumb {
  label: string
  /** Missing on the last crumb: it is the page you are on. */
  to?: string
}

/** "Students / Ishaan Sharma" */
export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-[13px] text-ink-soft">
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
