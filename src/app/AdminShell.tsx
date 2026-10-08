import { Outlet } from 'react-router'
import { Sidebar } from './Sidebar'

/**
 * Sidebar + content. When the screen is narrower than about 800px the content cannot
 * keep its 560px, so it wraps and the sidebar sits above it.
 */
export function AdminShell() {
  return (
    <div className="flex min-h-screen flex-wrap bg-paper">
      <Sidebar />
      <main className="flex min-w-0 flex-[999_1_560px] flex-col gap-6 px-4 pt-8 pb-14 sm:px-10">
        <Outlet />
      </main>
    </div>
  )
}
