import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { renderApp, saveLogin, sampleUserIds } from '@/test/utils'

async function openAdd(userId: number = sampleUserIds.admissions) {
  saveLogin(userId)
  const view = renderApp('/enquiries/new')
  await screen.findByRole('form', { name: 'Add an enquiry' })
  return view
}

const form = () => screen.getByRole('form', { name: 'Add an enquiry' })

async function fillParent(name = 'Ramesh Malik', phone = '98123 55501') {
  const f = within(form())
  await userEvent.type(f.getByLabelText('Parent name *'), name)
  await userEvent.type(f.getByLabelText('Phone number *'), phone)
  await userEvent.type(f.getByLabelText('Village or locality *'), 'Jakhal')
}

async function fillRest() {
  const f = within(form())
  await userEvent.selectOptions(f.getByLabelText('Class wanted *'), 'Class 2')
  await userEvent.click(f.getByLabelText('Walk-in'))
  await userEvent.type(f.getByLabelText('Call back on *'), '2026-10-09')
}

describe('Add an enquiry', () => {
  it('has the header, the breadcrumb, the form and the three buttons', async () => {
    await openAdd()
    expect(screen.getByRole('heading', { name: 'Add an enquiry', level: 1 })).toBeInTheDocument()
    expect(
      within(screen.getByRole('navigation', { name: 'Breadcrumb' })).getByRole('link', {
        name: 'Enquiries',
      }),
    ).toHaveAttribute('href', '/enquiries')
    expect(
      screen.getByText(/Only the fields marked \* are needed\. The rest can be added later\./),
    ).toBeInTheDocument()
    const f = within(form())
    expect(f.getByRole('button', { name: 'Save enquiry' })).toBeInTheDocument()
    expect(f.getByRole('button', { name: 'Save and add another' })).toBeInTheDocument()
    expect(f.getByRole('link', { name: 'Cancel' })).toHaveAttribute('href', '/enquiries')
  })

  it('Save enquiry saves, goes to the list and shows the new enquiry on top', async () => {
    const { router } = await openAdd()
    await fillParent()
    await fillRest()
    await userEvent.click(within(form()).getByRole('button', { name: 'Save enquiry' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/enquiries'))
    const table = await screen.findByRole('table', { name: 'Enquiries' })
    expect(within(table).getAllByRole('row')[1]).toHaveTextContent('Ramesh Malik')
    expect(screen.getByText('Enquiry saved')).toBeInTheDocument()
    expect(await screen.findByText('4 of 30 admitted so far · 13%')).toBeInTheDocument()
  })

  it('saveAndAddAnotherClearsTheForm', async () => {
    const { router } = await openAdd()
    await fillParent()
    await fillRest()
    await userEvent.click(within(form()).getByRole('button', { name: 'Save and add another' }))
    expect(await screen.findByText('Enquiry saved')).toBeInTheDocument()
    const f = within(form())
    await waitFor(() => expect(f.getByLabelText('Parent name *')).toHaveValue(''))
    expect(f.getByLabelText('Phone number *')).toHaveValue('')
    expect(f.getByLabelText('Village or locality *')).toHaveValue('')
    expect(f.getByLabelText('Class wanted *')).toHaveValue('')
    expect(f.getByLabelText('Walk-in')).not.toBeChecked()
    expect(f.getByLabelText('Call back on *')).toHaveValue('')
    await waitFor(() => expect(f.getByLabelText('Parent name *')).toHaveFocus())
    expect(router.state.location.pathname).toBe('/enquiries/new')
    // The first one is really saved: the same phone is now a duplicate.
    await fillParent('Another Parent')
    await fillRest()
    await userEvent.click(f.getByRole('button', { name: 'Save enquiry' }))
    expect(await screen.findByText('This parent already has an open enquiry.')).toBeInTheDocument()
  })

  it('duplicateEnquiryShowsLinkToTheOldOne', async () => {
    const { router } = await openAdd()
    await fillParent('Rajesh Kumar', '98123 00412')
    await fillRest()
    await userEvent.click(within(form()).getByRole('button', { name: 'Save enquiry' }))
    const box = await screen.findByText('This parent already has an open enquiry.')
    const link = within(box.parentElement as HTMLElement).getByRole('link', { name: 'Open it' })
    expect(link).toHaveAttribute('href', '/enquiries/29')
    // Nothing was saved and the person stays on the form with the typed data.
    expect(router.state.location.pathname).toBe('/enquiries/new')
    expect(within(form()).getByLabelText('Parent name *')).toHaveValue('Rajesh Kumar')
  })

  it('shows the mistakes under the inputs and does not call the server', async () => {
    let calls = 0
    server.use(
      http.post('http://localhost:3000/api/v1/enquiries', () => {
        calls += 1
        return HttpResponse.json({}, { status: 201 })
      }),
    )
    await openAdd()
    await userEvent.click(within(form()).getByRole('button', { name: 'Save enquiry' }))
    expect(await screen.findByText("Enter the parent's name.")).toBeInTheDocument()
    expect(screen.getByText('Pick how they heard about us.')).toBeInTheDocument()
    expect(within(form()).getByLabelText('Parent name *')).toHaveAttribute('aria-invalid', 'true')
    expect(calls).toBe(0)
  })

  it('Referral needs the name of the referring parent before it is sent', async () => {
    await openAdd()
    await fillParent()
    const f = within(form())
    await userEvent.selectOptions(f.getByLabelText('Class wanted *'), 'Class 2')
    await userEvent.type(f.getByLabelText('Call back on *'), '2026-10-09')
    await userEvent.click(f.getByLabelText('Referral'))
    await userEvent.click(f.getByRole('button', { name: 'Save enquiry' }))
    expect(
      await screen.findByText('Enter the name of the parent who referred them.'),
    ).toBeInTheDocument()
    await userEvent.type(f.getByLabelText('Referred by which parent *'), 'Poonam Devi')
    await userEvent.click(f.getByRole('button', { name: 'Save enquiry' }))
    expect(await screen.findByRole('table', { name: 'Enquiries' })).toBeInTheDocument()
  })

  it('puts the server field errors under the right input', async () => {
    server.use(
      http.post('http://localhost:3000/api/v1/enquiries', () =>
        HttpResponse.json(
          {
            error: 'VALIDATION',
            message: 'Check the form.',
            fields: { village: 'No such village.' },
          },
          { status: 400 },
        ),
      ),
    )
    await openAdd()
    await fillParent()
    await fillRest()
    await userEvent.click(within(form()).getByRole('button', { name: 'Save enquiry' }))
    const village = within(form()).getByLabelText('Village or locality *')
    await waitFor(() => expect(village).toHaveAttribute('aria-invalid', 'true'))
    expect(screen.getByText('No such village.')).toBeInTheDocument()
  })

  it('shows another error in a red box', async () => {
    server.use(
      http.post('http://localhost:3000/api/v1/enquiries', () =>
        HttpResponse.json({ error: 'SERVER', message: 'The server is busy.' }, { status: 500 }),
      ),
    )
    await openAdd()
    await fillParent()
    await fillRest()
    await userEvent.click(within(form()).getByRole('button', { name: 'Save enquiry' }))
    expect(await screen.findByText('The server is busy.')).toBeInTheDocument()
  })

  it('transportInchargeCannotOpenAddEnquiry', async () => {
    saveLogin(sampleUserIds.transport)
    renderApp('/enquiries/new')
    expect(
      await screen.findByRole('heading', { name: 'You cannot open this page' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('form', { name: 'Add an enquiry' })).not.toBeInTheDocument()
  })
})
