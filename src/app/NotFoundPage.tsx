import { Link } from 'react-router'

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-start gap-3">
      <h1 className="text-[30px] leading-[1.1] font-bold tracking-[-0.02em]">Page not found</h1>
      <p className="text-ink-soft">This address does not exist.</p>
      <Link to="/" className="text-canal underline">
        Go home
      </Link>
    </div>
  )
}
