import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { renderApp, saveLogin, sampleUserIds } from '@/test/utils'

async function openUsersPage() {
  saveLogin(sampleUserIds.owner)
  renderApp('/users')
  await screen.findByRole('table', { name: 'People with a login' })
}

describe('Users and roles page', () => {
  it('usersPageShowsRoleTableFromTheApi', async () => {
    server.use(
      http.get('/api/v1/roles', () =>
        HttpResponse.json([
          { role: 'OWNER', permissions: ['BUS_STATUS_VIEW', 'TRIPS_RECORD_ANY', 'USERS_MANAGE'] },
          { role: 'ATTENDANT', permissions: [] },
        ]),
      ),
    )
    saveLogin(sampleUserIds.owner)
    renderApp('/users')
    const table = await screen.findByRole('table', { name: 'What each role can do' })
    expect(within(table).getAllByRole('columnheader')).toHaveLength(3)
    const busRow = within(table).getByRole('row', { name: /Bus status/ })
    expect(
      within(busRow)
        .getAllByRole('cell')
        .map((c) => c.textContent),
    ).toEqual(['Full', '—'])
    const routesRow = within(table).getByRole('row', { name: /Routes and load/ })
    expect(
      within(routesRow)
        .getAllByRole('cell')
        .map((c) => c.textContent),
    ).toEqual(['—', '—'])
  })

  it('shows the people with a login', async () => {
    await openUsersPage()
    const table = screen.getByRole('table', { name: 'People with a login' })
    expect(within(table).getByRole('cell', { name: 'Balwan' })).toBeInTheDocument()
    expect(within(table).getByText('Turned off')).toBeInTheDocument()
    expect(within(table).getAllByText('On').length).toBeGreaterThan(0)
  })

  it('shows an error with Retry when the call fails, then the data', async () => {
    let fail = true
    server.use(
      http.get('/api/v1/users', () =>
        fail
          ? HttpResponse.json({ error: 'X', message: 'Boom' }, { status: 500 })
          : HttpResponse.json([]),
      ),
    )
    saveLogin(sampleUserIds.owner)
    renderApp('/users')
    expect(await screen.findByText('Something went wrong. Try again.')).toBeInTheDocument()
    fail = false
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByText('No logins yet')).toBeInTheDocument()
  })

  it('an office admin who types /users gets the cannot-open page', async () => {
    saveLogin(sampleUserIds.officeAdmin)
    renderApp('/users')
    expect(
      await screen.findByRole('heading', { name: 'You cannot open this page' }),
    ).toBeInTheDocument()
  })

  it('addUserNeedsOnlyPhoneAndRole', async () => {
    await openUsersPage()
    await userEvent.click(screen.getByRole('button', { name: 'Add user' }))
    const dialog = screen.getByRole('dialog', { name: 'Add user' })
    await userEvent.type(within(dialog).getByLabelText('Mobile number'), '98765 00000')
    await userEvent.selectOptions(within(dialog).getByLabelText('Role'), 'Office admin')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add user' }))

    expect(await screen.findByText('User added')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(await screen.findByText('+919876500000')).toBeInTheDocument()
  })

  it('asks for the missing phone and role', async () => {
    await openUsersPage()
    await userEvent.click(screen.getByRole('button', { name: 'Add user' }))
    const dialog = screen.getByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add user' }))
    expect(await within(dialog).findByText('Enter a 10-digit mobile number.')).toBeInTheDocument()
    expect(within(dialog).getByText('Pick a role.')).toBeInTheDocument()
  })

  it('attendantRoleAsksForAStaffMember', async () => {
    await openUsersPage()
    await userEvent.click(screen.getByRole('button', { name: 'Add user' }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).queryByLabelText('Which attendant?')).not.toBeInTheDocument()

    await userEvent.type(within(dialog).getByLabelText('Mobile number'), '98765 00001')
    await userEvent.selectOptions(within(dialog).getByLabelText('Role'), 'Attendant')
    const which = await within(dialog).findByLabelText('Which attendant?')
    await within(dialog).findByRole('option', { name: 'Sunil' })

    await userEvent.click(within(dialog).getByRole('button', { name: 'Add user' }))
    expect(await within(dialog).findByText('Pick the attendant.')).toBeInTheDocument()

    await userEvent.selectOptions(which, 'Sunil')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add user' }))
    expect(await screen.findByText('User added')).toBeInTheDocument()
    const row = (await screen.findByText('+919876500001')).closest('tr')
    expect(row).not.toBeNull()
    expect(within(row as HTMLElement).getByText('Attendant')).toBeInTheDocument()
  })

  it('duplicatePhoneShowsTheServerMessageInTheDialog', async () => {
    await openUsersPage()
    await userEvent.click(screen.getByRole('button', { name: 'Add user' }))
    const dialog = screen.getByRole('dialog')
    await userEvent.type(within(dialog).getByLabelText('Mobile number'), '98123 40002')
    await userEvent.selectOptions(within(dialog).getByLabelText('Role'), 'Office admin')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add user' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'This phone number already has a login.',
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('turningOffAUserAsksFirst', async () => {
    await openUsersPage()
    await userEvent.click(screen.getByRole('button', { name: 'Edit Balwan' }))
    const dialog = screen.getByRole('dialog', { name: 'Edit user' })
    await userEvent.click(within(dialog).getByLabelText('Login is on'))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }))

    const confirm = await screen.findByRole('dialog', { name: "Turn off Balwan's login?" })
    // Nothing has been saved yet.
    expect(screen.getAllByText('On').length).toBeGreaterThan(5)

    await userEvent.click(within(confirm).getByRole('button', { name: 'Turn off' }))
    expect(await screen.findByText('User saved')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getAllByText('Turned off')).toHaveLength(2)
  })

  it('cancelling the question saves nothing', async () => {
    await openUsersPage()
    await userEvent.click(screen.getByRole('button', { name: 'Edit Balwan' }))
    await userEvent.click(screen.getByLabelText('Login is on'))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    const confirm = await screen.findByRole('dialog', { name: "Turn off Balwan's login?" })
    await userEvent.click(within(confirm).getByRole('button', { name: 'Cancel' }))
    expect(
      screen.queryByRole('dialog', { name: "Turn off Balwan's login?" }),
    ).not.toBeInTheDocument()
    // Nothing was saved and the edit form is still open.
    expect(screen.getByRole('dialog', { name: 'Edit user' })).toBeInTheDocument()
    expect(screen.queryByText('User saved')).not.toBeInTheDocument()
  })

  it('shows CANNOT_DISABLE_SELF and LAST_OWNER messages in the dialog', async () => {
    await openUsersPage()
    await userEvent.click(screen.getByRole('button', { name: 'Edit Sourabh' }))
    await userEvent.click(screen.getByLabelText('Login is on'))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    await userEvent.click(
      within(await screen.findByRole('dialog', { name: "Turn off Sourabh's login?" })).getByRole(
        'button',
        { name: 'Turn off' },
      ),
    )
    expect(await screen.findByText('You cannot turn off your own login.')).toBeInTheDocument()
  })
})
