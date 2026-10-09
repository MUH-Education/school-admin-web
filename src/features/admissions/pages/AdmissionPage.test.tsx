import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { api } from '@/api/client'
import { server } from '@/mocks/server'
import { renderApp, saveLogin, sampleUserIds } from '@/test/utils'

async function openAdmission(userId: number = sampleUserIds.admissions) {
  saveLogin(userId)
  const view = renderApp('/admissions/new')
  await screen.findByRole('form', { name: 'New admission' })
  return view
}

const form = () => screen.getByRole('form', { name: 'New admission' })

async function fillStudent(name = 'Kavya Goyal') {
  const f = within(form())
  await userEvent.type(f.getByLabelText(/Student name/), name)
  await userEvent.type(f.getByLabelText(/Date of birth/), '2021-08-14')
  await userEvent.selectOptions(f.getByLabelText(/Class \*/), 'UKG')
  await userEvent.click(f.getByLabelText('Girl'))
}

async function fillFamily() {
  const f = within(form())
  await userEvent.type(f.getByLabelText(/Father's name/), 'Rakesh Goyal')
  await userEvent.type(f.getByLabelText("Father's phone *"), '98123 00771')
  await userEvent.selectOptions(f.getByLabelText(/Father's occupation/), 'Shopkeeper or trader')
  await userEvent.type(f.getByLabelText(/Village or locality/), 'Tohana town')
}

describe('New admission: the form', () => {
  it('has the three parts, the automatic number and no draft button', async () => {
    await openAdmission()
    expect(within(form()).getByRole('heading', { name: '1. Student' })).toBeInTheDocument()
    expect(within(form()).getByRole('heading', { name: '2. Family' })).toBeInTheDocument()
    expect(within(form()).getByRole('heading', { name: '3. Transport' })).toBeInTheDocument()
    expect(within(form()).queryByRole('heading', { name: /4\. Fees/ })).not.toBeInTheDocument()
    expect(screen.getByText('Given automatically when you save')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /draft/i })).not.toBeInTheDocument()
    expect(within(form()).getByRole('button', { name: 'Save admission' })).toBeInTheDocument()
    // Nothing is chosen for the bus until the person answers.
    expect(within(form()).getByLabelText('Yes')).not.toBeChecked()
    expect(within(form()).getByLabelText('No, comes on own')).not.toBeChecked()
    expect(within(form()).queryByLabelText('Route')).not.toBeInTheDocument()
  })

  it('shows Route and Stop only after "Yes", and the stops follow the route', async () => {
    await openAdmission()
    await userEvent.click(within(form()).getByLabelText('Yes'))
    const route = await within(form()).findByLabelText('Route')
    await within(route).findByRole('option', { name: 'Route 4' })
    await userEvent.selectOptions(route, 'Route 4')
    const stop = within(form()).getByLabelText('Stop')
    expect(
      within(stop)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toContain('Jakhal · 7:40')
    await userEvent.selectOptions(route, 'Route 1')
    expect(
      within(stop)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).not.toContain('Jakhal · 7:40')
    expect(stop).toHaveValue('')
    await userEvent.click(within(form()).getByLabelText('No, comes on own'))
    expect(within(form()).queryByLabelText('Route')).not.toBeInTheDocument()
  })

  it('admissionShowsFieldErrorsUnderInputs (checked in the browser)', async () => {
    const scroll = vi.spyOn(Element.prototype, 'scrollIntoView')
    await openAdmission()
    await userEvent.click(within(form()).getByRole('button', { name: 'Save admission' }))

    const f = within(form())
    const under = (label: RegExp) => f.getByLabelText(label)
    expect(await f.findByText('Enter the student name.')).toBeInTheDocument()
    expect(under(/Student name/)).toHaveAttribute('aria-invalid', 'true')
    expect(under(/Student name/)).toHaveAccessibleDescription('Enter the student name.')
    expect(f.getByText('Enter the date of birth.')).toBeInTheDocument()
    expect(f.getByText('Pick a class.')).toBeInTheDocument()
    expect(f.getByText('Pick girl or boy.')).toBeInTheDocument()
    expect(f.getByText("Enter the father's name.")).toBeInTheDocument()
    expect(f.getByText('Enter a 10-digit mobile number.')).toBeInTheDocument()
    expect(f.getByText("Pick the father's occupation.")).toBeInTheDocument()
    expect(f.getByText('Enter the village or locality.')).toBeInTheDocument()
    expect(f.getByText('Say yes or no.')).toBeInTheDocument()
    // The page scrolls to the first mistake: the student name.
    await waitFor(() => expect(scroll).toHaveBeenCalled())
    expect(scroll.mock.contexts[0]).toBe(under(/Student name/))
    scroll.mockRestore()
  })

  it('admissionShowsFieldErrorsUnderInputs (sent by the server)', async () => {
    const scroll = vi.spyOn(Element.prototype, 'scrollIntoView')
    server.use(
      http.post('http://localhost:3000/api/v1/admissions', () =>
        HttpResponse.json(
          {
            error: 'VALIDATION',
            message: 'Check the form.',
            fields: { fatherPhone: 'This number is not in use.', village: 'Unknown village.' },
          },
          { status: 400 },
        ),
      ),
    )
    await openAdmission()
    await fillStudent()
    await fillFamily()
    await userEvent.click(within(form()).getByLabelText('No, comes on own'))
    await userEvent.click(within(form()).getByRole('button', { name: 'Save admission' }))

    const phone = await within(form()).findByLabelText("Father's phone *")
    await waitFor(() => expect(phone).toHaveAccessibleDescription('This number is not in use.'))
    expect(within(form()).getByLabelText(/Village or locality/)).toHaveAccessibleDescription(
      'Unknown village.',
    )
    // The first one in the page order is the father's phone.
    await waitFor(() => expect(scroll).toHaveBeenCalled())
    expect(scroll.mock.contexts[0]).toBe(phone)
    scroll.mockRestore()
  })

  it('shows a message that has no field above the buttons', async () => {
    server.use(
      http.post('http://localhost:3000/api/v1/admissions', () =>
        HttpResponse.json({ error: 'SERVER', message: 'The server is busy.' }, { status: 500 }),
      ),
    )
    await openAdmission()
    await fillStudent()
    await fillFamily()
    await userEvent.click(within(form()).getByLabelText('No, comes on own'))
    await userEvent.click(within(form()).getByRole('button', { name: 'Save admission' }))
    expect(await within(form()).findByText('The server is busy.')).toBeInTheDocument()
  })
})

describe('New admission: brother or sister', () => {
  async function pickAryan() {
    await userEvent.type(
      within(form()).getByLabelText('Brother or sister already in this school'),
      'Aryan',
    )
    const list = await within(form()).findByRole('list', { name: 'Matching students' })
    await userEvent.click(within(list).getByRole('button', { name: /Aryan Punia/ }))
  }

  it('searches by name and by admission number', async () => {
    await openAdmission()
    const search = within(form()).getByLabelText('Brother or sister already in this school')
    await userEvent.type(search, 'punia')
    const list = await within(form()).findByRole('list', { name: 'Matching students' })
    expect(
      within(list)
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual([expect.stringContaining('Aryan Punia'), expect.stringContaining('Siya Punia')])
    await userEvent.clear(search)
    await userEvent.type(search, 'A-2026-118')
    await waitFor(() =>
      expect(
        within(screen.getByRole('list', { name: 'Matching students' })).getAllByRole('button'),
      ).toHaveLength(1),
    )
    await userEvent.clear(search)
    await userEvent.type(search, 'zzzzz')
    expect(await within(form()).findByText('No student found.')).toBeInTheDocument()
  })

  it('siblingChoiceHidesParentInputs', async () => {
    await openAdmission()
    expect(within(form()).getByLabelText(/Father's name/)).toBeInTheDocument()
    await pickAryan()

    expect(
      await within(form()).findByText('Aryan Punia', { selector: 'strong' }),
    ).toBeInTheDocument()
    expect(within(form()).getByRole('status')).toHaveTextContent(
      'Parents will be copied from Aryan Punia',
    )
    for (const label of [/Father's name/, "Father's phone *", /Mother's name/, "Mother's phone"]) {
      expect(within(form()).queryByLabelText(label)).not.toBeInTheDocument()
    }
    expect(within(form()).queryByText('Send bus SMS to')).not.toBeInTheDocument()
    // The family details that can differ stay.
    expect(within(form()).getByLabelText(/Village or locality/)).toBeInTheDocument()
    expect(within(form()).getByLabelText(/Father's occupation/)).toBeInTheDocument()

    await userEvent.click(within(form()).getByRole('button', { name: 'Choose another' }))
    expect(within(form()).getByLabelText(/Father's name/)).toBeInTheDocument()
  })

  it('saves without the parent boxes and copies the parents', async () => {
    await openAdmission()
    await fillStudent('Younger Punia')
    await pickAryan()
    await userEvent.selectOptions(
      within(form()).getByLabelText(/Father's occupation/),
      'Farmer, large (5+ acres)',
    )
    await userEvent.type(within(form()).getByLabelText(/Village or locality/), 'Jakhal')
    await userEvent.click(within(form()).getByLabelText('No, comes on own'))
    await userEvent.click(within(form()).getByRole('button', { name: 'Save admission' }))

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Younger Punia' }),
    ).toBeInTheDocument()
    const phones = await screen.findByRole('region', { name: 'Parents and phone numbers' })
    expect(await within(phones).findByText(/Rajender Punia/)).toBeInTheDocument()
    expect(phones).toHaveTextContent('94XXX XX871')
  })
})

describe('New admission: route is full, saving, leaving', () => {
  it('fullRouteShowsWarningButSaves', async () => {
    await openAdmission()
    await fillStudent()
    await fillFamily()
    await userEvent.click(within(form()).getByLabelText('Yes'))
    const route = await within(form()).findByLabelText('Route')
    await within(route).findByRole('option', { name: 'Route 9' })
    await userEvent.selectOptions(route, 'Route 9')
    const box = await within(form()).findByRole('status')
    expect(box).toHaveTextContent(
      'Route 9 is already full. It has 45 children on 26 seats. This child will be number 46.',
    )
    expect(within(box).getByRole('link', { name: 'See Routes and load' })).toHaveAttribute(
      'href',
      '/routes',
    )
    await userEvent.selectOptions(within(form()).getByLabelText('Stop'), 'Lahli · 6:55')
    // It does not block saving.
    await userEvent.click(within(form()).getByRole('button', { name: 'Save admission' }))
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Kavya Goyal' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Transport' })).toHaveTextContent(
      'Now: Route 9, Lahli',
    )
  })

  it('does not show the full-route box for a route with room', async () => {
    // Every sample route is over its seats, so make a new route on a new van.
    saveLogin(sampleUserIds.owner)
    const van = await api<{ id: number }>('POST', '/vehicles', {
      name: 'Van 10',
      registrationNo: 'HR 23 XX 1110',
      vehicleType: 'SMALL_VAN',
      seats: 14,
      monthlyCost: 30300,
    })
    const created = await api<{ id: number }>('POST', '/routes', {
      name: 'Route 10',
      vehicleId: van.id,
    })
    await api('PUT', `/routes/${created.id}/stops`, [{ name: 'Ratia', morningTime: '07:30' }])

    renderApp('/admissions/new')
    await screen.findByRole('form', { name: 'New admission' })
    await userEvent.click(within(form()).getByLabelText('Yes'))
    const route = await within(form()).findByLabelText('Route')
    await within(route).findByRole('option', { name: 'Route 10' })
    await userEvent.selectOptions(route, 'Route 10')
    expect(within(form()).getByLabelText('Stop')).toBeInTheDocument()
    expect(within(form()).queryByRole('status')).not.toBeInTheDocument()
    // And a full route still shows it.
    await userEvent.selectOptions(route, 'Route 9')
    expect(await within(form()).findByRole('status')).toHaveTextContent('Route 9 is already full')
  })

  it('afterAdmissionTheStudentPageOpensWithTheNumber', async () => {
    const { router } = await openAdmission()
    await fillStudent()
    await fillFamily()
    await userEvent.click(within(form()).getByLabelText('No, comes on own'))
    await userEvent.click(within(form()).getByRole('button', { name: 'Save admission' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/students/1000'))
    expect(await screen.findByText('Admitted. Admission number A-2026-119')).toBeInTheDocument()
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Kavya Goyal' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/Admission number/, { selector: 'p' })).toHaveTextContent('A-2026-119')
    expect(screen.getByRole('region', { name: 'Transport' })).toHaveTextContent(
      'does not use the bus',
    )
  })

  it('leavingADirtyFormAsksFirst', async () => {
    const { router } = await openAdmission()
    const menu = screen.getByRole('navigation', { name: 'Main menu' })
    await userEvent.type(within(form()).getByLabelText(/Student name/), 'Kav')
    await userEvent.click(within(menu).getByRole('link', { name: 'Students' }))

    const dialog = await screen.findByRole('dialog', { name: 'Leave without saving?' })
    expect(router.state.location.pathname).toBe('/admissions/new')
    // "Stay here": the typed name is still there.
    await userEvent.click(within(dialog).getByRole('button', { name: 'Stay here' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(within(form()).getByLabelText(/Student name/)).toHaveValue('Kav')

    // "Leave": the page changes.
    await userEvent.click(within(menu).getByRole('link', { name: 'Students' }))
    await userEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Leave' }),
    )
    await waitFor(() => expect(router.state.location.pathname).toBe('/students'))
  })

  it('leaves at once when nothing was typed', async () => {
    const { router } = await openAdmission()
    const menu = screen.getByRole('navigation', { name: 'Main menu' })
    await userEvent.click(within(menu).getByRole('link', { name: 'Students' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/students'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('Cancel on a typed form asks first', async () => {
    await openAdmission()
    await userEvent.type(within(form()).getByLabelText(/Student name/), 'K')
    await userEvent.click(within(form()).getByRole('link', { name: 'Cancel' }))
    expect(await screen.findByRole('dialog', { name: 'Leave without saving?' })).toBeInTheDocument()
  })

  it('is closed to a role that cannot admit', async () => {
    saveLogin(sampleUserIds.transport)
    renderApp('/admissions/new')
    expect(
      await screen.findByRole('heading', { name: 'You cannot open this page' }),
    ).toBeInTheDocument()
  })
})

describe('New admission: started from an enquiry', () => {
  async function openFromEnquiry(id: number) {
    saveLogin(sampleUserIds.admissions)
    const view = renderApp(`/admissions/new?enquiryId=${id}`)
    await screen.findByRole('form', { name: 'New admission' })
    return view
  }

  it('admissionFormIsPrefilledFromTheEnquiry', async () => {
    await openFromEnquiry(23)
    const box = await screen.findByRole('region', { name: 'Started from an enquiry' })
    expect(box).toHaveTextContent(
      'Started from the enquiry of Anita Goyal, Tohana town, Class UKG. The known details are already filled in.',
    )
    expect(within(box).getByRole('link', { name: 'View enquiry' })).toHaveAttribute(
      'href',
      '/enquiries/23',
    )
    const f = within(form())
    await waitFor(() => expect(f.getByLabelText(/Student name/)).toHaveValue('Kavya'))
    expect(f.getByLabelText(/Class \*/)).toHaveValue('UKG')
    expect(f.getByLabelText(/Village or locality/)).toHaveValue('Tohana town')
    // The enquiry was from a mother, so the mother's boxes are filled.
    expect(f.getByLabelText("Mother's name")).toHaveValue('Anita Goyal')
    expect(f.getAllByLabelText(/^Mother's phone$/)[0]).toHaveValue('9898100771')
    expect(f.getByLabelText("Father's name *")).toHaveValue('')
  })

  it('lets the clerk change every filled box', async () => {
    await openFromEnquiry(29)
    const name = within(form()).getByLabelText(/Village or locality/)
    await waitFor(() => expect(name).toHaveValue('Jakhal'))
    expect(within(form()).getByLabelText("Father's name *")).toHaveValue('Rajesh Kumar')
    await userEvent.clear(name)
    await userEvent.type(name, 'Kanheri')
    expect(name).toHaveValue('Kanheri')
  })

  it('has no blue box without ?enquiryId=', async () => {
    await openAdmission()
    expect(
      screen.queryByRole('region', { name: 'Started from an enquiry' }),
    ).not.toBeInTheDocument()
  })

  it('sends enquiryId, and the enquiry then shows as Admitted in the list', async () => {
    let sent: { enquiryId?: number } = {}
    server.use(
      http.post('http://localhost:3000/api/v1/admissions', async ({ request }) => {
        sent = (await request.clone().json()) as { enquiryId?: number }
        return undefined
      }),
    )
    const { router } = await openFromEnquiry(23)
    const f = within(form())
    await waitFor(() => expect(f.getByLabelText(/Student name/)).toHaveValue('Kavya'))
    await userEvent.type(f.getByLabelText(/Date of birth/), '2021-08-14')
    await userEvent.click(f.getByLabelText('Girl'))
    await userEvent.selectOptions(f.getByLabelText(/Father's occupation/), 'Shopkeeper or trader')
    await userEvent.type(f.getByLabelText("Father's name *"), 'Rakesh Goyal')
    await userEvent.type(f.getByLabelText("Father's phone *"), '98123 00771')
    await userEvent.click(f.getByLabelText('No, comes on own'))
    await userEvent.click(f.getByRole('button', { name: 'Save admission' }))
    await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/students\/\d+$/))
    expect(sent.enquiryId).toBe(23)
    await router.navigate('/enquiries?status=ADMITTED')
    const table = await screen.findByRole('table', { name: 'Enquiries' })
    const row = (await within(table).findByText('Anita Goyal')).closest('tr') as HTMLElement
    expect(within(row).getByText('Admitted')).toBeInTheDocument()
  })

  it('shows an error with Retry when the enquiry cannot be read, and the form still works', async () => {
    server.use(
      http.get('http://localhost:3000/api/v1/enquiries/23/prefill', () =>
        HttpResponse.json({ error: 'SERVER', message: 'boom' }, { status: 500 }),
      ),
    )
    await openFromEnquiry(23)
    const alert = await screen.findByText(
      'The enquiry could not be loaded. You can fill the form by hand.',
    )
    expect(
      within(alert.parentElement as HTMLElement).getByRole('button', { name: 'Retry' }),
    ).toBeInTheDocument()
    expect(within(form()).getByLabelText(/Student name/)).toHaveValue('')
  })
})
