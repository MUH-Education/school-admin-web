import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { renderApp, saveLogin, sampleUserIds } from '@/test/utils'

const names: Record<number, string> = { 1: 'Ishaan Sharma', 2: 'Aryan Punia' }

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
    expect(await screen.findByText('Photo saved')).toBeInTheDocument()
    expect(await screen.findByRole('img', { name: 'Photo of Ishaan Sharma' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Change photo' })).toBeInTheDocument()
  })

  it('removes the photo after a question', async () => {
    await openStudent(2)
    await userEvent.click(await screen.findByRole('button', { name: 'Remove photo' }))
    const dialog = screen.getByRole('dialog', { name: 'Remove the photo?' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Remove photo' }))
    expect(await screen.findByText('Photo removed')).toBeInTheDocument()
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
