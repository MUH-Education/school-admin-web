import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { renderApp, saveLogin, sampleUserIds } from '@/test/utils'

const names: Record<number, string> = { 1: 'Ishaan Sharma', 2: 'Aryan Punia', 4: 'Mohit Nain' }

async function openStudent(id: number, userId: number = sampleUserIds.officeAdmin) {
  saveLogin(userId)
  const view = renderApp(`/students/${id}`)
  await screen.findByRole('heading', { level: 1, name: names[id] })
  return view
}

describe('One student: header and photo', () => {
  it('shows the name, class, admission number and the joined date', async () => {
    await openStudent(1)
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Ishaan Sharma' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/Class 4 A/)).toHaveTextContent(
      'Class 4 A · Admission number A-2026-118 · Joined 1 April 2026',
    )
    const crumbs = screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(within(crumbs).getByRole('link', { name: 'Students' })).toHaveAttribute(
      'href',
      '/students',
    )
    expect(screen.getByText(/No photo yet/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add a photo' })).toBeInTheDocument()
  })

  it('shows a photo that is already there, with Change and Remove', async () => {
    await openStudent(2)
    expect(await screen.findByRole('img', { name: 'Photo of Aryan Punia' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Change photo' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove photo' })).toBeInTheDocument()
  })

  it('photoOver2MbIsRefusedBeforeUpload', async () => {
    let uploads = 0
    server.use(
      http.post('http://localhost:3000/api/v1/students/1/photo', () => {
        uploads += 1
        return new HttpResponse(null, { status: 204 })
      }),
    )
    await openStudent(1)
    const big = new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'big.png', { type: 'image/png' })
    await userEvent.upload(screen.getByLabelText('Photo file'), big)
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The photo is too big. Choose one under 2 MB.',
    )
    expect(uploads).toBe(0)
  })

  it('refuses a file that is not JPEG or PNG', async () => {
    await openStudent(1)
    const gif = new File(['x'], 'pic.gif', { type: 'image/gif' })
    // `applyAccept: false`: the browser would hide a .gif in the chooser, but a person can still drop one.
    await userEvent.upload(screen.getByLabelText('Photo file'), gif, {
      applyAccept: false,
    } as never)
    expect(await screen.findByRole('alert')).toHaveTextContent('Choose a JPEG or PNG picture.')
  })

  it('shows the new photo right after the upload', async () => {
    await openStudent(1)
    const png = new File([new Uint8Array(1000)], 'me.png', { type: 'image/png' })
    await userEvent.upload(screen.getByLabelText('Photo file'), png)
    expect((await screen.findAllByText('Photo saved')).length).toBeGreaterThan(0)
    expect(await screen.findByRole('img', { name: 'Photo of Ishaan Sharma' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Change photo' })).toBeInTheDocument()
  })

  it('removes the photo after a question', async () => {
    await openStudent(2)
    await userEvent.click(await screen.findByRole('button', { name: 'Remove photo' }))
    const dialog = screen.getByRole('dialog', { name: 'Remove the photo?' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Remove photo' }))
    // The toast and the new line of the change history both say it.
    expect((await screen.findAllByText('Photo removed')).length).toBeGreaterThan(0)
    await waitFor(() =>
      expect(screen.queryByRole('img', { name: /Photo of/ })).not.toBeInTheDocument(),
    )
    expect(screen.getByRole('button', { name: 'Add a photo' })).toBeInTheDocument()
  })
})

describe('One student: the four states', () => {
  it('shows loading, then the page', async () => {
    server.use(
      http.get('http://localhost:3000/api/v1/students/1', async () => {
        await delay(100)
        return HttpResponse.json({ error: 'SERVER', message: 'x' }, { status: 500 })
      }),
    )
    saveLogin(sampleUserIds.officeAdmin)
    renderApp('/students/1')
    await screen.findByRole('heading', { level: 1, name: 'Student' })
    expect(screen.getByText('Loading…')).toBeInTheDocument()
  })

  it('shows an error with Retry', async () => {
    let fail = true
    server.use(
      http.get('http://localhost:3000/api/v1/students/1', async ({ request }) => {
        if (fail) return HttpResponse.json({ error: 'SERVER', message: 'x' }, { status: 500 })
        void request
        return HttpResponse.json({ error: 'NOT_FOUND', message: 'gone' }, { status: 404 })
      }),
    )
    saveLogin(sampleUserIds.officeAdmin)
    renderApp('/students/1')
    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong')
    fail = false
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByText('This student does not exist')).toBeInTheDocument()
  })

  it('says so for a student who is not there', async () => {
    saveLogin(sampleUserIds.officeAdmin)
    renderApp('/students/9999')
    expect(await screen.findByText('This student does not exist')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to students' })).toHaveAttribute(
      'href',
      '/students',
    )
  })
})

describe('One student: details box', () => {
  it('shows the details in view state, with one Edit button', async () => {
    await openStudent(1)
    // The box is a new element once it turns into a form, so look it up each time.
    const box = () => screen.getByRole('region', { name: 'Student details' })
    expect(within(box()).getByText('12 March 2017')).toBeInTheDocument()
    expect(within(box()).getByText('Boy')).toBeInTheDocument()
    expect(within(box()).getByText('4 A')).toBeInTheDocument()
    expect(within(box()).getByText('Tohana town')).toBeInTheDocument()
    expect(within(box()).getByText('Model Town')).toBeInTheDocument()
    expect(within(box()).getByText('Government employee')).toBeInTheDocument()
    expect(within(box()).queryByRole('textbox')).not.toBeInTheDocument()
    expect(within(box()).getByRole('button', { name: 'Edit' })).toBeInTheDocument()
  })

  it('Edit turns the box into a form, Cancel turns it back', async () => {
    await openStudent(1)
    // The box is a new element once it turns into a form, so look it up each time.
    const box = () => screen.getByRole('region', { name: 'Student details' })
    await userEvent.click(within(box()).getByRole('button', { name: 'Edit' }))
    expect(within(box()).getByLabelText('Student name')).toHaveValue('Ishaan Sharma')
    await userEvent.clear(within(box()).getByLabelText('Student name'))
    await userEvent.type(within(box()).getByLabelText('Student name'), 'Changed')
    await userEvent.click(within(box()).getByRole('button', { name: 'Cancel' }))
    expect(within(box()).queryByLabelText('Student name')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Ishaan Sharma' })).toBeInTheDocument()
  })

  it('Save changes the details and the history', async () => {
    await openStudent(1)
    // The box is a new element once it turns into a form, so look it up each time.
    const box = () => screen.getByRole('region', { name: 'Student details' })
    await userEvent.click(within(box()).getByRole('button', { name: 'Edit' }))
    await userEvent.selectOptions(within(box()).getByLabelText('Class'), 'Class 5')
    await userEvent.clear(within(box()).getByLabelText('Address'))
    await userEvent.type(within(box()).getByLabelText('Address'), 'Sector 2')
    await userEvent.click(within(box()).getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Details saved')).toBeInTheDocument()
    expect(await within(box()).findByText('5 A')).toBeInTheDocument()
    expect(within(box()).getByText('Sector 2')).toBeInTheDocument()
    expect(within(box()).queryByLabelText('Student name')).not.toBeInTheDocument()
  })

  it('shows a mistake under its input and keeps the form open', async () => {
    await openStudent(1)
    // The box is a new element once it turns into a form, so look it up each time.
    const box = () => screen.getByRole('region', { name: 'Student details' })
    await userEvent.click(within(box()).getByRole('button', { name: 'Edit' }))
    await userEvent.clear(within(box()).getByLabelText('Village or locality'))
    await userEvent.click(within(box()).getByRole('button', { name: 'Save' }))
    expect(await within(box()).findByText('Enter the village or locality.')).toBeInTheDocument()
    expect(within(box()).getByLabelText('Village or locality')).toHaveAttribute(
      'aria-invalid',
      'true',
    )
  })

  it('shows the field error that the server sends', async () => {
    server.use(
      http.put('http://localhost:3000/api/v1/students/1', () =>
        HttpResponse.json(
          {
            error: 'VALIDATION',
            message: 'Check the form.',
            fields: { name: 'This name is taken.' },
          },
          { status: 400 },
        ),
      ),
    )
    await openStudent(1)
    // The box is a new element once it turns into a form, so look it up each time.
    const box = () => screen.getByRole('region', { name: 'Student details' })
    await userEvent.click(within(box()).getByRole('button', { name: 'Edit' }))
    await userEvent.click(within(box()).getByRole('button', { name: 'Save' }))
    expect(await within(box()).findByText('This name is taken.')).toBeInTheDocument()
  })

  it('marks a child as left after a question, and goes back to the list', async () => {
    const { router } = await openStudent(1)
    // The box is a new element once it turns into a form, so look it up each time.
    const box = () => screen.getByRole('region', { name: 'Student details' })
    await userEvent.click(within(box()).getByRole('button', { name: 'Edit' }))
    await userEvent.click(within(box()).getByRole('button', { name: 'Mark as left the school' }))
    const dialog = screen.getByRole('dialog', { name: 'Mark Ishaan Sharma as left the school?' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Mark as left' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/students'))
    await screen.findByRole('table', { name: 'Students' })
    expect(screen.queryByText('Ishaan Sharma')).not.toBeInTheDocument()
  })

  it('does not mark as left when the question is answered Cancel', async () => {
    await openStudent(1)
    // The box is a new element once it turns into a form, so look it up each time.
    const box = () => screen.getByRole('region', { name: 'Student details' })
    await userEvent.click(within(box()).getByRole('button', { name: 'Edit' }))
    await userEvent.click(within(box()).getByRole('button', { name: 'Mark as left the school' }))
    const dialog = screen.getByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Ishaan Sharma' })).toBeInTheDocument()
  })
})

describe('One student: phone numbers', () => {
  const phones = () => screen.getByRole('region', { name: 'Parents and phone numbers' })

  it('lists the numbers as the server sends them', async () => {
    await openStudent(1)
    const list = within(phones()).getByRole('list', { name: 'Phone numbers' })
    const items = within(list).getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent('Sanjay Sharma · Father')
    expect(items[0]).toHaveTextContent('98XXX XX340 · gets bus SMS')
    expect(items[1]).toHaveTextContent('Pooja Sharma · Mother')
  })

  it('addedPhoneAppearsInTheList', async () => {
    await openStudent(1)
    await userEvent.click(within(phones()).getByRole('button', { name: 'Add a phone number' }))
    const form = within(phones()).getByRole('form', { name: 'Add a phone number' })
    await userEvent.type(within(form).getByLabelText('Name'), 'Ramkumar Sharma')
    await userEvent.selectOptions(
      within(form).getByLabelText('Relation to the child'),
      'Grandfather',
    )
    await userEvent.type(within(form).getByLabelText('Phone number'), '94123 45208')
    expect(within(form).getByLabelText('Send bus SMS to this number too')).toBeChecked()
    await userEvent.click(within(form).getByRole('button', { name: 'Save number' }))

    expect(await screen.findByText('Phone number added')).toBeInTheDocument()
    await waitFor(() => {
      const items = within(phones()).getAllByRole('listitem')
      expect(items).toHaveLength(3)
      expect(items[2]).toHaveTextContent('Ramkumar Sharma · Grandfather')
      expect(items[2]).toHaveTextContent('94XXX XX208 · gets bus SMS')
    })
    // The form is closed again.
    expect(within(phones()).queryByRole('form')).not.toBeInTheDocument()
  })

  it('shows mistakes under the inputs of the add form', async () => {
    await openStudent(1)
    await userEvent.click(within(phones()).getByRole('button', { name: 'Add a phone number' }))
    const form = within(phones()).getByRole('form', { name: 'Add a phone number' })
    await userEvent.type(within(form).getByLabelText('Phone number'), '12345')
    await userEvent.click(within(form).getByRole('button', { name: 'Save number' }))
    expect(await within(form).findByText('Enter the name.')).toBeInTheDocument()
    expect(within(form).getByText('Pick the relation.')).toBeInTheDocument()
    expect(within(form).getByText('Enter a 10-digit mobile number.')).toBeInTheDocument()
  })

  it('shows the message of the server when the number is already there', async () => {
    await openStudent(1)
    await userEvent.click(within(phones()).getByRole('button', { name: 'Add a phone number' }))
    const form = within(phones()).getByRole('form', { name: 'Add a phone number' })
    await userEvent.type(within(form).getByLabelText('Name'), 'Sanjay again')
    await userEvent.selectOptions(within(form).getByLabelText('Relation to the child'), 'Father')
    await userEvent.type(within(form).getByLabelText('Phone number'), '9812345340')
    await userEvent.click(within(form).getByRole('button', { name: 'Save number' }))
    expect(await within(form).findByRole('alert')).toHaveTextContent(
      'This number is already saved for Ishaan Sharma.',
    )
  })

  it('edits a name and the SMS tick', async () => {
    await openStudent(1)
    await userEvent.click(within(phones()).getByRole('button', { name: 'Edit Pooja Sharma' }))
    const form = within(phones()).getByRole('form', { name: 'Edit Pooja Sharma' })
    expect(within(form).getByText('97XXX XX615')).toBeInTheDocument()
    await userEvent.click(within(form).getByLabelText('Send bus SMS to this number'))
    await userEvent.click(within(form).getByRole('button', { name: 'Save' }))
    await waitFor(() =>
      expect(within(phones()).getAllByRole('listitem')[1]).toHaveTextContent('no bus SMS'),
    )
  })

  it('removes a number after a question', async () => {
    await openStudent(1)
    await userEvent.click(within(phones()).getByRole('button', { name: 'Edit Pooja Sharma' }))
    await userEvent.click(within(phones()).getByRole('button', { name: 'Remove this number' }))
    const dialog = screen.getByRole('dialog', { name: 'Remove the number of Pooja Sharma?' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Remove number' }))
    await waitFor(() => expect(within(phones()).getAllByRole('listitem')).toHaveLength(1))
    expect(within(phones()).queryByText(/Pooja/)).not.toBeInTheDocument()
  })

  it('lastPhoneHasNoRemoveButton', async () => {
    // Mohit Nain has one number.
    await openStudent(4)
    await userEvent.click(within(phones()).getByRole('button', { name: 'Edit Mahavir Nain' }))
    const form = within(phones()).getByRole('form', { name: 'Edit Mahavir Nain' })
    expect(within(form).getByRole('button', { name: 'Save' })).toBeInTheDocument()
    expect(
      within(form).queryByRole('button', { name: 'Remove this number' }),
    ).not.toBeInTheDocument()
  })

  it('shows the message of the server if it still says LAST_GUARDIAN', async () => {
    server.use(
      http.delete('http://localhost:3000/api/v1/students/1/guardians/:gid', () =>
        HttpResponse.json(
          { error: 'LAST_GUARDIAN', message: 'A child must keep at least one phone number.' },
          { status: 409 },
        ),
      ),
    )
    await openStudent(1)
    await userEvent.click(within(phones()).getByRole('button', { name: 'Edit Pooja Sharma' }))
    await userEvent.click(within(phones()).getByRole('button', { name: 'Remove this number' }))
    const dialog = screen.getByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Remove number' }))
    expect(await within(phones()).findByRole('alert')).toHaveTextContent(
      'A child must keep at least one phone number.',
    )
  })

  it('onlyOneBoxIsInEditStateAtATime', async () => {
    await openStudent(1)
    const details = () => screen.getByRole('region', { name: 'Student details' })
    await userEvent.click(within(details()).getByRole('button', { name: 'Edit' }))
    expect(within(details()).getByLabelText('Student name')).toBeInTheDocument()

    // Opening the phone form closes the details form.
    await userEvent.click(within(phones()).getByRole('button', { name: 'Add a phone number' }))
    expect(within(details()).queryByLabelText('Student name')).not.toBeInTheDocument()
    expect(within(phones()).getByRole('form', { name: 'Add a phone number' })).toBeInTheDocument()

    // Opening an Edit on a number closes the add form.
    await userEvent.click(within(phones()).getByRole('button', { name: 'Edit Sanjay Sharma' }))
    expect(
      within(phones()).queryByRole('form', { name: 'Add a phone number' }),
    ).not.toBeInTheDocument()
    expect(within(phones()).getAllByRole('form')).toHaveLength(1)

    // And the details Edit takes it back.
    await userEvent.click(within(details()).getByRole('button', { name: 'Edit' }))
    expect(within(phones()).queryByRole('form')).not.toBeInTheDocument()
    expect(screen.getAllByRole('form')).toHaveLength(1)
  })
})

describe('One student: transport', () => {
  const box = () => screen.getByRole('region', { name: 'Transport' })

  async function openChange() {
    await userEvent.click(within(box()).getByRole('button', { name: 'Change' }))
    return await within(box()).findByRole('form', { name: 'Change the bus' })
  }

  async function setDate(form: HTMLElement, label: string, value: string) {
    const input = within(form).getByLabelText(label)
    await userEvent.clear(input)
    await userEvent.type(input, value)
  }

  it('shows the state now, closed, with a Change button', async () => {
    await openStudent(1)
    expect(box()).toHaveTextContent('Now: does not use the bus, since admission on 1 April 2026.')
    expect(within(box()).queryByRole('form')).not.toBeInTheDocument()
    expect(within(box()).getByRole('button', { name: 'Change' })).toBeInTheDocument()
  })

  it('shows the route, the stop and the fee for a child on the bus', async () => {
    await openStudent(2)
    expect(box()).toHaveTextContent('Now: Route 4, Jakhal, since 1 April 2024.')
    expect(box()).toHaveTextContent('Bus fee: ₹8,800.')
  })

  it('stopListFollowsTheChosenRoute', async () => {
    await openStudent(1)
    const form = await openChange()
    const stop = within(form).getByLabelText('Stop')
    // Before a route is chosen there is nothing to pick.
    expect(
      within(stop)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['Pick a route first'])

    await userEvent.selectOptions(within(form).getByLabelText('Route'), 'Route 4')
    expect(
      within(stop)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual([
      'Pick a stop',
      'Sadhanwas · 7:25',
      'Jakhal · 7:40',
      'Kanheri · 7:55',
      'Tohana town · 8:02',
    ])
    await userEvent.selectOptions(stop, 'Jakhal · 7:40')
    expect(stop).toHaveValue('11')

    // Another route: other stops, and the old choice is gone.
    await userEvent.selectOptions(within(form).getByLabelText('Route'), 'Route 1')
    expect(
      within(stop)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['Pick a stop', 'Samain · 7:05', 'Bhuna road · 7:22', 'Dhand · 7:38'])
    expect(stop).toHaveValue('')
  })

  it('fullRouteShowsWarningButSaves', async () => {
    await openStudent(1)
    const form = await openChange()
    await userEvent.selectOptions(within(form).getByLabelText('Route'), 'Route 9')
    // The warning shows at once, from the load-board numbers.
    expect(await within(form).findByRole('status')).toHaveTextContent(
      'Route 9 is already full. It has 45 children on 26 seats. Ishaan will be number 46.',
    )
    await userEvent.selectOptions(within(form).getByLabelText('Stop'), 'Lahli · 6:55')
    await setDate(form, 'Start from', '2026-11-02')
    const fee = within(form).getByLabelText('Bus fee for the rest of this year (₹)')
    expect(fee).toHaveValue('8,800')
    await userEvent.clear(fee)
    await userEvent.type(fee, '4000')
    expect(fee).toHaveValue('4,000')
    expect(
      within(form).getByText('The full year is ₹8,800. You decide the amount for the months left.'),
    ).toBeInTheDocument()
    expect(form).toHaveTextContent("From 2 November, Ishaan is on the Route 9 attendant's list.")
    expect(form).toHaveTextContent('₹4,000 is added to the fees still to pay.')

    await userEvent.click(within(form).getByRole('button', { name: 'Save change' }))
    expect(await screen.findByText('Bus change saved')).toBeInTheDocument()
    // The change was saved, and the server's warning stays on the screen.
    await waitFor(() =>
      expect(box()).toHaveTextContent('The change was saved. Route 9 has 46 children on 26 seats.'),
    )
    expect(box()).toHaveTextContent('From 2 November 2026: Route 9, Lahli.')
    expect(box()).toHaveTextContent('Now: does not use the bus')
    expect(within(box()).queryByRole('form')).not.toBeInTheDocument()
  })

  it('noBusAsksOnlyForTheDate', async () => {
    await openStudent(2)
    const form = await openChange()
    expect(within(form).getByLabelText('Route')).toHaveValue('4')
    await userEvent.click(within(form).getByLabelText('No bus'))
    expect(within(form).queryByLabelText('Route')).not.toBeInTheDocument()
    expect(within(form).queryByLabelText('Stop')).not.toBeInTheDocument()
    expect(within(form).queryByLabelText(/Bus fee/)).not.toBeInTheDocument()
    expect(within(form).queryByRole('status')).not.toBeInTheDocument()
    await setDate(form, 'From which date', '2026-12-01')
    expect(form).toHaveTextContent("From 1 December, Aryan is taken off the attendant's list.")

    await userEvent.click(within(form).getByRole('button', { name: 'Save change' }))
    await waitFor(() =>
      expect(box()).toHaveTextContent('From 1 December 2026: does not use the bus.'),
    )
    expect(box()).toHaveTextContent('Now: Route 4, Jakhal')
    // No warning for a child who leaves the bus.
    expect(box()).not.toHaveTextContent('The change was saved.')
  })

  it('asks for a route and a stop when the child uses the bus', async () => {
    await openStudent(1)
    const form = await openChange()
    await userEvent.click(within(form).getByRole('button', { name: 'Save change' }))
    expect(await within(form).findByText('Pick a route.')).toBeInTheDocument()
    expect(within(form).getByText('Pick a stop.')).toBeInTheDocument()
  })

  it('Cancel closes the form and nothing is saved', async () => {
    await openStudent(1)
    const form = await openChange()
    await userEvent.click(within(form).getByRole('button', { name: 'Cancel' }))
    expect(within(box()).queryByRole('form')).not.toBeInTheDocument()
    expect(box()).toHaveTextContent('Now: does not use the bus')
  })

  it('shows the message of the server when the stop is not on the route', async () => {
    server.use(
      http.put('http://localhost:3000/api/v1/students/1/transport', () =>
        HttpResponse.json(
          { error: 'STOP_NOT_ON_ROUTE', message: 'That stop is not on Route 4.' },
          { status: 409 },
        ),
      ),
    )
    await openStudent(1)
    const form = await openChange()
    await userEvent.selectOptions(within(form).getByLabelText('Route'), 'Route 4')
    await userEvent.selectOptions(within(form).getByLabelText('Stop'), 'Jakhal · 7:40')
    await userEvent.click(within(form).getByRole('button', { name: 'Save change' }))
    expect(await within(form).findByRole('alert')).toHaveTextContent('That stop is not on Route 4.')
  })
})

describe('One student: change history', () => {
  const box = () => screen.getByRole('region', { name: 'Change history' })

  it('shows date, what changed and who, newest first', async () => {
    await openStudent(1)
    const items = await within(box()).findAllByRole('listitem')
    expect(items).toHaveLength(3)
    expect(items[0]).toHaveTextContent('12 Aug 2026')
    expect(items[0]).toHaveTextContent('Section changed from B to A')
    expect(items[0]).toHaveTextContent('Neelam')
    expect(items[1]).toHaveTextContent('3 Jun 2026')
    expect(items[1]).toHaveTextContent("Mother's phone number added")
    expect(items[2]).toHaveTextContent('1 Apr 2026')
    expect(items[2]).toHaveTextContent('Admitted to Class 4, no bus')
    expect(items[2]).toHaveTextContent('Priya')
  })

  it('shows a new line after a change, with the name of the person who made it', async () => {
    await openStudent(1)
    await within(box()).findAllByRole('listitem')
    const phones = screen.getByRole('region', { name: 'Parents and phone numbers' })
    await userEvent.click(within(phones).getByRole('button', { name: 'Edit Pooja Sharma' }))
    await userEvent.click(within(phones).getByRole('button', { name: 'Remove this number' }))
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Remove number' }),
    )
    await waitFor(() => expect(within(box()).getAllByRole('listitem')).toHaveLength(4))
    const first = within(box()).getAllByRole('listitem')[0]
    expect(first).toHaveTextContent('Phone number of Pooja Sharma removed')
    expect(first).toHaveTextContent('Neelam')
  })

  it('shows an error with Retry', async () => {
    let fail = true
    server.use(
      http.get('http://localhost:3000/api/v1/students/1/history', () =>
        fail
          ? HttpResponse.json({ error: 'SERVER', message: 'x' }, { status: 500 })
          : HttpResponse.json([]),
      ),
    )
    await openStudent(1)
    expect(await within(box()).findByRole('alert')).toHaveTextContent('Something went wrong')
    fail = false
    await userEvent.click(within(box()).getByRole('button', { name: 'Retry' }))
    expect(await within(box()).findByText('No changes yet.')).toBeInTheDocument()
  })
})

describe('One student: view-only roles', () => {
  it.each([
    ['the transport in-charge', sampleUserIds.transport],
    ['the admissions desk', sampleUserIds.admissions],
  ])('viewOnlyRoleSeesNoEditButtons (%s)', async (_who, userId) => {
    await openStudent(2, userId)
    // Everything is there to read.
    const details = screen.getByRole('region', { name: 'Student details' })
    expect(within(details).getByText('21 June 2018')).toBeInTheDocument()
    const phones = screen.getByRole('region', { name: 'Parents and phone numbers' })
    expect(phones).toHaveTextContent('Rajender Punia · Father')
    expect(phones).toHaveTextContent('94XXX XX871')
    expect(screen.getByRole('region', { name: 'Transport' })).toHaveTextContent(
      'Now: Route 4, Jakhal',
    )
    expect((await screen.findAllByRole('listitem')).length).toBeGreaterThan(0)
    expect(await screen.findByRole('img', { name: 'Photo of Aryan Punia' })).toBeInTheDocument()

    // And nothing to change.
    const main = screen.getByRole('main')
    for (const name of [
      'Edit',
      'Change',
      'Add a photo',
      'Change photo',
      'Remove photo',
      'Add a phone number',
    ]) {
      expect(within(main).queryByRole('button', { name })).not.toBeInTheDocument()
    }
    expect(within(main).queryByRole('button', { name: /^Edit / })).not.toBeInTheDocument()
    expect(within(main).queryAllByRole('button')).toHaveLength(0)
    expect(within(main).queryByLabelText('Photo file')).not.toBeInTheDocument()
    expect(within(main).queryByRole('textbox')).not.toBeInTheDocument()
    expect(within(main).queryByRole('combobox')).not.toBeInTheDocument()
  })

  it('the office admin, who may edit, sees the buttons', async () => {
    await openStudent(2)
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Change' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add a phone number' })).toBeInTheDocument()
  })
})
