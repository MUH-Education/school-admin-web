import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { renderApp, saveLogin, sampleUserIds } from '@/test/utils'

async function openSetup(userId: number = sampleUserIds.owner) {
  saveLogin(userId)
  renderApp('/settings/fees')
}

const table = () => screen.findByRole('table', { name: 'School fee by class' })
const input = (name: string) => screen.getByLabelText(`School fee for ${name}`)

describe('Fee setup', () => {
  it('feeSetupIsOwnerOnly: others get "You cannot open this page" and have no menu item', async () => {
    for (const userId of [
      sampleUserIds.officeAdmin,
      sampleUserIds.admissions,
      sampleUserIds.transport,
    ]) {
      await openSetup(userId)
      expect(
        await screen.findByRole('heading', { name: 'You cannot open this page' }),
      ).toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: 'Fee setup' })).not.toBeInTheDocument()
      expect(screen.queryByRole('link', { name: 'Fee setup' })).not.toBeInTheDocument()
      document.body.innerHTML = ''
    }
  })

  it('the owner has the menu item and the page', async () => {
    saveLogin(sampleUserIds.owner)
    renderApp('/students')
    const nav = await screen.findByRole('navigation', { name: 'Main menu' })
    const link = within(nav).getByRole('link', { name: 'Fee setup' })
    expect(link).toHaveAttribute('href', '/settings/fees')
    await userEvent.click(link)
    expect(await screen.findByRole('heading', { level: 1, name: 'Fee setup' })).toBeInTheDocument()
  })

  it('shows the 15 classes with their fee, from the current school year', async () => {
    await openSetup()
    const rows = within(await table()).getAllByRole('row')
    // One header row and 15 classes.
    expect(rows).toHaveLength(16)
    await waitFor(() => expect(input('Class 4')).toHaveValue('30,000'))
    expect(input('Nursery')).toHaveValue('22,000')
    expect(input('Class 12')).toHaveValue('40,000')
    expect(screen.getByLabelText('School year')).toHaveDisplayValue('2026–27 (now)')
  })

  it('saves a changed fee and says so', async () => {
    await openSetup()
    await table()
    await waitFor(() => expect(input('Class 5')).toHaveValue('32,000'))
    await userEvent.clear(input('Class 5'))
    await userEvent.type(input('Class 5'), '30000')
    expect(input('Class 5')).toHaveValue('30,000')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Fees saved')).toBeInTheDocument()

    // New admission for a Class 5 child now starts from ₹30,000.
    document.body.innerHTML = ''
    renderApp('/admissions/new')
    const form = within(await screen.findByRole('form', { name: 'New admission' }))
    await userEvent.selectOptions(form.getByLabelText(/Class \*/), 'Class 5')
    await waitFor(() =>
      expect(form.getByLabelText(/School fee for the year/)).toHaveValue('30,000'),
    )
  })

  it('an empty box means "not set yet", and the next school year starts empty', async () => {
    await openSetup()
    await table()
    await userEvent.selectOptions(screen.getByLabelText('School year'), '2027–28')
    await waitFor(() => expect(input('Class 4')).toHaveValue(''))
    expect(input('Class 4')).toHaveAttribute('placeholder', 'Not set yet')
    expect(screen.getByText('15 classes have no fee yet.')).toBeInTheDocument()
  })

  it('shows the server message under the class it names', async () => {
    server.use(
      http.put('http://localhost:3000/api/v1/sessions/:id/class-fees', () =>
        HttpResponse.json(
          {
            error: 'VALIDATION',
            message: 'Check the form.',
            fields: { 'Class 5': 'This is too much.' },
          },
          { status: 400 },
        ),
      ),
    )
    await openSetup()
    await table()
    await waitFor(() => expect(input('Class 5')).toHaveValue('32,000'))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(input('Class 5')).toHaveAccessibleDescription('This is too much.'))
    expect(input('Class 5')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.queryByText('Fees saved')).not.toBeInTheDocument()
  })

  it('shows an error with Retry when the fees cannot be read', async () => {
    let fail = true
    server.use(
      http.get('http://localhost:3000/api/v1/sessions/:id/class-fees', () =>
        fail
          ? HttpResponse.json({ error: 'SERVER' }, { status: 500 })
          : HttpResponse.json([{ className: 'Class 1', amount: 1000 }]),
      ),
    )
    await openSetup()
    expect(await screen.findByText('Something went wrong. Try again.')).toBeInTheDocument()
    fail = false
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    await table()
    await waitFor(() => expect(input('Class 1')).toHaveValue('1,000'))
  })

  it('says so when there is no school year', async () => {
    server.use(http.get('http://localhost:3000/api/v1/sessions', () => HttpResponse.json([])))
    await openSetup()
    expect(await screen.findByText('There is no school year yet')).toBeInTheDocument()
  })
})
