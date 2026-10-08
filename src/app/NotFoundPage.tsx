import { Link } from 'react-router'

export function NotFoundPage() {
  return (
    <main className="px-10 pt-8">
      <h1 className="text-[30px] leading-[1.1] font-bold tracking-[-0.02em]">Page not found</h1>
      <p className="mt-3 text-ink-soft">This address does not exist.</p>
      <Link to="/" className="mt-4 inline-block text-canal underline">
        Go home
      </Link>
    </main>
  )
}
