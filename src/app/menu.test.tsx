import { screen, within } from '@testing-library/react'
import { renderApp, saveLogin, sampleUserIds } from '@/test/utils'

async function menuFor(userId: number): Promise<string[]> {
  saveLogin(userId)
  renderApp('/')
  const nav = await screen.findByRole('navigation', { name: 'Main menu' })
  return within(nav)
    .getAllByRole('link')
    .map((link) => link.textContent ?? '')
}

describe('the menu by role', () => {
  it('owner sees everything', async () => {
    expect(await menuFor(sampleUserIds.owner)).toEqual([
      'Bus status',
      'Routes and load',
      'Vehicles and staff',
      'Messages',
      'Enquiries',
      'New admission',
      'Students',
      'Analytics',
      'Users and roles',
    ])
  })

  it('officeAdminDoesNotSeeUsersInTheMenu', async () => {
    const menu = await menuFor(sampleUserIds.officeAdmin)
    expect(menu).not.toContain('Users and roles')
    expect(menu).toContain('Students')
  })

  it('transport in-charge sees the transport pages and Students', async () => {
    expect(await menuFor(sampleUserIds.transport)).toEqual([
      'Bus status',
      'Routes and load',
      'Vehicles and staff',
      'Messages',
      'Students',
    ])
  })

  it('admissions desk sees Enquiries, New admission, Students, Analytics', async () => {
    expect(await menuFor(sampleUserIds.admissions)).toEqual([
      'Enquiries',
      'New admission',
      'Students',
      'Analytics',
    ])
  })

  it('hides a group when all its items are hidden', async () => {
    await menuFor(sampleUserIds.admissions)
    expect(screen.queryByText('Transport')).not.toBeInTheDocument()
    expect(screen.queryByText('Settings')).not.toBeInTheDocument()
  })
})
