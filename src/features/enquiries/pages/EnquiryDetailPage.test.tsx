import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { renderApp, saveLogin, sampleUserIds } from '@/test/utils'

async function openEnquiry(id: number, userId: number = sampleUserIds.admissions) {
  saveLogin(userId)
  const view = renderApp(`/enquiries/${id}`)
  await screen.findByRole('form', { name: 'Enquiry details' })
  return view
}

const form = () => screen.getByRole('form', { name: 'Enquiry details' })
const stage = () => screen.getByRole('region', { name: 'Stage' })
const followUps = () => screen.getByRole('region', { name: 'Follow-ups' })

describe('One enquiry', () => {
  it('fills the same form with what is saved', async () => {
    await openEnquiry(23)
    expect(screen.getByRole('heading', { name: 'Anita Goyal', level: 1 })).toBeInTheDocument()
    const f = within(form())
    expect(f.getByLabelText('Parent name *')).toHaveValue('Anita Goyal')
    expect(f.getByLabelText('Phone number *')).toHaveValue('9898100771')
    expect(f.getByLabelText('Relation to the child')).toHaveValue('MOTHER')
    expect(f.getByLabelText('Class wanted *')).toHaveValue('UKG')
    expect(f.getByLabelText("Child's name")).toHaveValue('Kavya')
    expect(f.getByLabelText('Walk-in')).toBeChecked()
    expect(f.getByLabelText('Call back on *')).toHaveValue('2026-10-10')
    expect(f.getByLabelText('Does the child need the school bus')).toHaveValue('NO')
    expect(f.queryByLabelText(/Referred by/)).not.toBeInTheDocument()
    expect(f.getByLabelText('Parent name *')).toHaveClass('min-h-[52px]!')
  })

  it('Save changes saves with PUT and shows a toast', async () => {
    await openEnquiry(23)
    const name = within(form()).getByLabelText("Child's name")
    await userEvent.clear(name)
    await userEvent.type(name, 'Kavya Goyal')
    await userEvent.click(within(form()).getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByText('Changes saved')).toBeInTheDocument()
    expect(within(form()).getByLabelText("Child's name")).toHaveValue('Kavya Goyal')
  })

  it('shows the stage as words with a square and a button for each allowed stage', async () => {
    await openEnquiry(23)
    const applied = within(stage()).getByText('Applied')
    expect(applied.querySelector('span[aria-hidden="true"]')).toBeInTheDocument()
    expect(
      within(stage())
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(['Mark as lost'])
  })

  it('moves to the next stage', async () => {
    await openEnquiry(26)
    expect(
      within(stage())
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(['Mark as Visited', 'Mark as Applied', 'Mark as lost'])
    await userEvent.click(within(stage()).getByRole('button', { name: 'Mark as Visited' }))
    await waitFor(() => expect(within(stage()).getByText('Visited')).toBeInTheDocument())
    expect(
      within(stage()).queryByRole('button', { name: 'Mark as Visited' }),
    ).not.toBeInTheDocument()
  })

  it('lostNeedsAReason', async () => {
    await openEnquiry(26)
    await userEvent.click(within(stage()).getByRole('button', { name: 'Mark as lost' }))
    const ask = screen.getByRole('form', { name: 'Why is this enquiry lost?' })
    await userEvent.click(within(ask).getByRole('button', { name: 'Mark as lost' }))
    expect(await within(ask).findByText('Say why the enquiry is lost.')).toBeInTheDocument()
    expect(within(stage()).queryByText('Lost')).not.toBeInTheDocument()
    await userEvent.type(within(ask).getByLabelText('Reason *'), 'Fee is too high')
    await userEvent.click(within(ask).getByRole('button', { name: 'Mark as lost' }))
    await waitFor(() => expect(within(stage()).getByText('Lost')).toBeInTheDocument())
    expect(within(stage()).getByText('Reason: Fee is too high')).toBeInTheDocument()
    expect(within(stage()).getByRole('button', { name: 'Reopen as New' })).toBeInTheDocument()
  })

  it('followUpAppearsOnTopAndMovesTheNextDate', async () => {
    await openEnquiry(26)
    expect(within(form()).getByLabelText('Call back on *')).toHaveValue('2026-10-05')
    const panel = within(followUps())
    expect(panel.getByText('No call or visit has been noted yet.')).toBeInTheDocument()
    await userEvent.type(panel.getByLabelText('Note *'), 'Spoke to the mother.')
    await userEvent.type(panel.getByLabelText('Next date (optional)'), '2026-10-10')
    await userEvent.click(panel.getByRole('button', { name: 'Add note' }))
    expect(await panel.findByText('Spoke to the mother.')).toBeInTheDocument()
    expect(panel.getByText(/Priya · next 10 Oct/)).toBeInTheDocument()
    expect(panel.getByLabelText('Note *')).toHaveValue('')
    await waitFor(() =>
      expect(within(form()).getByLabelText('Call back on *')).toHaveValue('2026-10-10'),
    )
    // A second note goes above the first.
    await userEvent.type(panel.getByLabelText('Note *'), 'Second call.')
    await userEvent.click(panel.getByRole('button', { name: 'Add note' }))
    await panel.findByText('Second call.')
    const notes = panel.getAllByRole('listitem').map((li) => li.textContent)
    expect(notes[0]).toContain('Second call.')
    expect(notes[1]).toContain('Spoke to the mother.')
  })

  it('needs a note for a follow-up', async () => {
    await openEnquiry(26)
    await userEvent.click(within(followUps()).getByRole('button', { name: 'Add note' }))
    expect(await screen.findByText('Write what was said.')).toBeInTheDocument()
  })

  it('startAdmissionCarriesTheEnquiryId', async () => {
    await openEnquiry(23)
    const link = screen.getByRole('link', { name: 'Start admission' })
    expect(link).toHaveAttribute('href', '/admissions/new?enquiryId=23')
  })

  it('shows Start admission only for Visited and Applied', async () => {
    const { unmount } = await openEnquiry(24)
    expect(screen.getByRole('link', { name: 'Start admission' })).toBeInTheDocument()
    unmount()
    for (const id of [29, 20, 22, 21]) {
      const view = await openEnquiry(id)
      expect(screen.queryByRole('link', { name: 'Start admission' })).not.toBeInTheDocument()
      view.unmount()
    }
  })

  it('an admitted enquiry links to the student and has no call-back box', async () => {
    await openEnquiry(22)
    expect(within(stage()).getByRole('link', { name: 'Open the student' })).toHaveAttribute(
      'href',
      '/students/8',
    )
    expect(within(form()).queryByLabelText(/Call back on/)).not.toBeInTheDocument()
    expect(within(stage()).queryAllByRole('button')).toHaveLength(0)
    await userEvent.click(within(form()).getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByText('Changes saved')).toBeInTheDocument()
  })

  it('shows an error with Retry for an enquiry that is not there', async () => {
    saveLogin(sampleUserIds.admissions)
    renderApp('/enquiries/9999')
    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong')
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })

  it('shows a loading state first', async () => {
    server.use(
      http.get('http://localhost:3000/api/v1/enquiries/23', async () => {
        await new Promise((resolve) => setTimeout(resolve, 600))
        return HttpResponse.json({}, { status: 500 })
      }),
    )
    saveLogin(sampleUserIds.admissions)
    renderApp('/enquiries/23')
    // The menu shows when the shell is there; the page itself is still waiting for the server.
    await screen.findByRole('navigation', { name: 'Main menu' })
    expect(within(screen.getByRole('main')).getByText('Loading…')).toBeInTheDocument()
  })

  it('transportInchargeCannotOpenOneEnquiry', async () => {
    saveLogin(sampleUserIds.transport)
    renderApp('/enquiries/23')
    expect(
      await screen.findByRole('heading', { name: 'You cannot open this page' }),
    ).toBeInTheDocument()
  })
})
