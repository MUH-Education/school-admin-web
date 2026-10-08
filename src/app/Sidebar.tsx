import { NavLink, useNavigate } from 'react-router'
import { roleLabel } from '@/auth/roles'
import { useAuth } from '@/auth/useAuth'
import { usePermissions } from '@/auth/usePermissions'
import { allowedMenu } from './menu'

const itemClass = 'block px-3 py-[13px] text-[14.5px] no-underline'

export function Sidebar() {
  const { user, logout } = useAuth()
  const { can } = usePermissions()
  const navigate = useNavigate()
  if (!user) return null

  const role = roleLabel(user.role) + (user.role === 'OWNER' ? ' · sees everything' : '')

  return (
    <nav
      aria-label="Main menu"
      className="flex flex-[1_1_232px] flex-col gap-7 bg-ink px-4 pt-6 pb-7"
    >
      <div className="flex flex-col gap-1 px-3">
        <div className="font-mono text-[11px] tracking-[0.08em] text-dust-light uppercase">
          School admin
        </div>
        <div className="text-[17px] leading-tight font-bold text-white">MUH Jain Global School</div>
      </div>

      {allowedMenu(can).map((group) => (
        <div key={group.title} className="flex flex-col gap-0.5">
          <div className="px-3 pb-1.5 font-mono text-[11px] tracking-[0.08em] text-side-label uppercase">
            {group.title}
          </div>
          {group.items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `${itemClass} ${isActive ? 'bg-canal font-semibold text-white' : 'text-side-text'}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      ))}

      <div className="mt-auto flex flex-col gap-0.5 border-t border-side-rule px-3 pt-4">
        <div className="text-sm font-semibold text-white">{user.name ?? user.phone}</div>
        <div className="text-[12.5px] text-side-label">{role}</div>
        <button
          type="button"
          onClick={() => {
            logout()
            navigate('/login', { replace: true })
          }}
          className="mt-2 cursor-pointer self-start text-[13.5px] text-side-text underline"
        >
          Log out
        </button>
      </div>
    </nav>
  )
}
