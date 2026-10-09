import type { Permission } from '@/auth/types'

export interface MenuItem {
  label: string
  to: string
  permission: Permission
}

export interface MenuGroup {
  title: string
  items: MenuItem[]
}

/** The menu by permission: docs/05-auth-permissions.md. */
export const menuGroups: MenuGroup[] = [
  {
    title: 'Transport',
    items: [
      { label: 'Bus status', to: '/bus-status', permission: 'BUS_STATUS_VIEW' },
      { label: 'Routes and load', to: '/routes', permission: 'ROUTES_VIEW' },
      { label: 'Vehicles and staff', to: '/vehicles', permission: 'VEHICLES_VIEW' },
      { label: 'Messages', to: '/messages', permission: 'MESSAGES_VIEW' },
    ],
  },
  {
    title: 'Admissions',
    items: [
      { label: 'Enquiries', to: '/enquiries', permission: 'ENQUIRIES_VIEW' },
      { label: 'New admission', to: '/admissions/new', permission: 'ADMISSIONS_CREATE' },
      { label: 'Students', to: '/students', permission: 'STUDENTS_VIEW' },
    ],
  },
  {
    title: 'Reports',
    items: [{ label: 'Analytics', to: '/analytics', permission: 'ANALYTICS_VIEW' }],
  },
  {
    title: 'Settings',
    items: [
      { label: 'Users and roles', to: '/users', permission: 'USERS_MANAGE' },
      { label: 'Fee setup', to: '/settings/fees', permission: 'SETTINGS_EDIT' },
    ],
  },
]

/** Only the allowed items. A group with no items is left out. */
export function allowedMenu(can: (permission: Permission) => boolean): MenuGroup[] {
  return menuGroups
    .map((group) => ({ ...group, items: group.items.filter((item) => can(item.permission)) }))
    .filter((group) => group.items.length > 0)
}
