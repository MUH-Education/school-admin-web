import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import type { StudentFees } from '@/features/fees/types'
import { server } from '@/mocks/server'
import { renderApp, saveLogin, sampleUserIds } from '@/test/utils'

const ISHAAN = 1
const FEES_URL = 'http://localhost:3000/api/v1/students/:id/fees'

async function openStudent(id: number, userId: number = sampleUserIds.owner) {
  saveLogin(userId)
  renderApp(`/students/${id}`)
  await screen.findByRole('heading', { level: 1 })
}

const box = () => screen.findByRole('region', { name: 'Fees this year' })

const mixed: StudentFees = {
  studentId: 2,
  session: { id: 1, label: '2026–27', startsOn: '2026-04-01', endsOn: '2027-03-31', current: true },
  plan: {
    sessionId: 1,
    schoolFee: 30000,
    busFee: 8800,
    discount: 0,
    discountReason: null,
    frequency: 'QUARTERLY',
    startsOn: '2026-04-01',
  },
  total: 38800,
  paidSoFar: 25000,
  pendingNow: 4700,
  stillToPay: 13800,
  status: 'DELAYED',
  nextPayment: { amount: 9700, dueDate: '2027-01-01' },
  heads: [
    { head: 'SCHOOL', total: 30000, paid: 22500, pendingNow: 0, status: 'ON_TIME' },
    { head: 'BUS', total: 8800, paid: 2500, pendingNow: 4700, status: 'DELAYED' },
  ],
  dues: [],
  payments: [],
}

describe('One student: Fees this year', () => {
  it("shows Ishaan's numbers as in the design: ₹30,000, paid ₹22,500, still ₹7,500", async () => {
    await openStudent(ISHAAN)
    const fees = within(await box())
    expect(await fees.findByText('School fee for the year')).toBeInTheDocument()
    expect(fees.getByText('School fee for the year').nextSibling).toHaveTextContent('₹30,000')
    expect(fees.getByText('Paid so far').nextSibling).toHaveTextContent('₹22,500')
    expect(fees.getByText('Pending now').nextSibling).toHaveTextContent('₹0')
    expect(fees.getByText('Still to pay').nextSibling).toHaveTextContent('₹7,500')
    expect(
      fees.getByText('Next payment: ₹7,500 on 1 January 2027. Bus fee: not used yet.'),
    ).toBeInTheDocument()
    // Money is never a raw number.
    expect(fees.queryByText('22500')).not.toBeInTheDocument()
  })

  it('feesBoxShowsStatusPerHead: each fee head has its own square and words', async () => {
    server.use(http.get(FEES_URL, () => HttpResponse.json(mixed)))
    await openStudent(2)
    const fees = within(await box())
    const list = await fees.findByRole('list', { name: 'Status of each fee' })
    const [school, bus] = within(list).getAllByRole('listitem')
    expect(school).toHaveTextContent('School fee')
    expect(school).toHaveTextContent('On time')
    expect(bus).toHaveTextContent('Bus fee')
    expect(bus).toHaveTextContent('Delayed')
    // A square, not colour alone: the words are text in the page.
    expect(fees.getByText('Bus fee for the year').nextSibling).toHaveTextContent('₹8,800')
    expect(fees.getByText('Pending now').nextSibling).toHaveTextContent('₹4,700')
  })

  it('lists the payments with date, amount, how and receipt number', async () => {
    await openStudent(ISHAAN)
    const list = await within(await box()).findByRole('list', { name: 'Payments' })
    const lines = within(list).getAllByRole('listitem')
    expect(lines).toHaveLength(3)
    expect(lines[0]).toHaveTextContent('1 Oct 2026')
    expect(lines[0]).toHaveTextContent('₹7,500')
    expect(lines[0]).toHaveTextContent(/R-2026-\d{4}/)
  })

  it('roleWithoutFeesViewDoesNotSeeTheBox, and no fee call is made', async () => {
    let asked = 0
    server.use(
      http.get(FEES_URL, () => {
        asked++
        return HttpResponse.json(mixed)
      }),
    )
    await openStudent(ISHAAN, sampleUserIds.transport)
    // The rest of the page is there, so the page has been drawn.
    expect(await screen.findByRole('region', { name: 'Transport' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Fees this year' })).not.toBeInTheDocument()
    expect(screen.queryByText('Fees this year')).not.toBeInTheDocument()
    expect(asked).toBe(0)
  })

  it('says so when the child has no fee plan', async () => {
    await openStudent(13)
    const fees = within(await box())
    expect(await fees.findByText('No fee plan for this year')).toBeInTheDocument()
    expect(fees.queryByRole('button', { name: 'Record a payment' })).not.toBeInTheDocument()
  })

  it('shows an error with Retry, and the rest of the page still works', async () => {
    let fail = true
    server.use(
      http.get(FEES_URL, () =>
        fail
          ? HttpResponse.json(
              { error: 'SERVER', message: 'The fees could not be read.' },
              { status: 500 },
            )
          : HttpResponse.json(mixed),
      ),
    )
    await openStudent(2)
    const fees = within(await box())
    expect(await fees.findByText('Something went wrong. Try again.')).toBeInTheDocument()
    fail = false
    await userEvent.click(fees.getByRole('button', { name: 'Retry' }))
    expect(await fees.findByText('Still to pay')).toBeInTheDocument()
  })

  it('shows a loading block first', async () => {
    saveLogin(sampleUserIds.owner)
    renderApp(`/students/${ISHAAN}`)
    const fees = within(await box())
    expect(fees.getByRole('status')).toBeInTheDocument()
    expect(await fees.findByText('Still to pay')).toBeInTheDocument()
  })
})

describe('One student: Record a payment', () => {
  const MOHIT = 4

  async function openDialog(id: number) {
    await openStudent(id)
    const fees = within(await box())
    await userEvent.click(await fees.findByRole('button', { name: 'Record a payment' }))
    return within(await screen.findByRole('dialog', { name: 'Record a payment' }))
  }

  it('receiptNumberIsShownAfterPayment: a toast with the receipt number, and the box moves', async () => {
    const dialog = await openDialog(4)
    const fees = within(await box())
    expect(fees.getByText('Pending now').nextSibling).toHaveTextContent('₹10,200')
    expect(fees.getAllByText('Delayed')).toHaveLength(2)

    // The money that is due now is already in the boxes. Pay both fees.
    await userEvent.click(dialog.getByLabelText('Both'))
    expect(dialog.getByLabelText(/School fee: amount received/)).toHaveValue('8,000')
    expect(dialog.getByLabelText(/Bus fee: amount received/)).toHaveValue('2,200')
    await userEvent.selectOptions(dialog.getByLabelText('Paid by'), 'Cash')
    await userEvent.click(dialog.getByRole('button', { name: 'Save payment' }))

    expect(
      await screen.findByText(/Payment saved\. Receipt number R-2026-\d{4}/),
    ).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await waitFor(() =>
      expect(
        within(screen.getByRole('region', { name: 'Fees this year' })).getAllByText('On time'),
      ).toHaveLength(2),
    )
    expect(within(await box()).getByText('Pending now').nextSibling).toHaveTextContent('₹0')
    const lines = within(within(await box()).getByRole('list', { name: 'Payments' })).getAllByRole(
      'listitem',
    )
    expect(lines[0]).toHaveTextContent('₹10,200')
    expect(lines[0]).toHaveTextContent('Cash')
  })

  it('has the bus choices only for a child who has a bus fee', async () => {
    const withBus = await openDialog(MOHIT)
    expect(withBus.getByLabelText('Bus fee')).toBeInTheDocument()
    expect(withBus.getByLabelText('Both')).toBeInTheDocument()
  })

  it('offers only the school fee when there is no bus fee', async () => {
    const dialog = await openDialog(ISHAAN)
    expect(dialog.getByLabelText('School fee')).toBeChecked()
    expect(dialog.queryByLabelText('Bus fee')).not.toBeInTheDocument()
    expect(dialog.queryByLabelText('Both')).not.toBeInTheDocument()
  })

  it('asks for an amount and does not send an empty form', async () => {
    let sent = 0
    server.use(
      http.post('http://localhost:3000/api/v1/students/:id/payments', () => {
        sent++
        return HttpResponse.json({}, { status: 201 })
      }),
    )
    const dialog = await openDialog(ISHAAN)
    await userEvent.click(dialog.getByRole('button', { name: 'Save payment' }))
    const amount = await dialog.findByLabelText(/School fee: amount received/)
    await dialog.findByText('Enter the amount received.')
    expect(amount).toHaveAttribute('aria-invalid', 'true')
    expect(sent).toBe(0)
  })

  it('paymentTooLargeShowsServerMessage: the sentence of the server goes under the amount', async () => {
    const dialog = await openDialog(ISHAAN)
    const amount = dialog.getByLabelText(/School fee: amount received/)
    await userEvent.type(amount, '9000')
    await userEvent.click(dialog.getByRole('button', { name: 'Save payment' }))
    await waitFor(() =>
      expect(amount).toHaveAccessibleDescription(
        expect.stringContaining('Only ₹7,500 is left to pay on the school fee.'),
      ),
    )
    expect(amount).toHaveAttribute('aria-invalid', 'true')
    // The dialog stays open so the amount can be changed.
    expect(screen.getByRole('dialog', { name: 'Record a payment' })).toBeInTheDocument()
    expect(screen.queryByText(/Payment saved/)).not.toBeInTheDocument()
  })

  it('puts the server sentence under the amount even when it names no field', async () => {
    server.use(
      http.post('http://localhost:3000/api/v1/students/:id/payments', () =>
        HttpResponse.json(
          { error: 'PAYMENT_TOO_LARGE', message: 'That is more than the year needs.' },
          { status: 409 },
        ),
      ),
    )
    const dialog = await openDialog(ISHAAN)
    const amount = dialog.getByLabelText(/School fee: amount received/)
    await userEvent.type(amount, '100')
    await userEvent.click(dialog.getByRole('button', { name: 'Save payment' }))
    await waitFor(() =>
      expect(amount).toHaveAccessibleDescription(
        expect.stringContaining('That is more than the year needs.'),
      ),
    )
  })

  it('Cancel closes the dialog and sends nothing', async () => {
    const dialog = await openDialog(ISHAAN)
    await userEvent.click(dialog.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('One student: Correct a wrong payment', () => {
  const correctButtons = () => screen.queryAllByRole('button', { name: /Correct a wrong payment/ })

  it('onlyOwnerSeesCorrectPayment: the office admin can record but not correct', async () => {
    await openStudent(ISHAAN, sampleUserIds.officeAdmin)
    const fees = within(await box())
    expect(await fees.findByRole('button', { name: 'Record a payment' })).toBeInTheDocument()
    expect(await fees.findByRole('list', { name: 'Payments' })).toBeInTheDocument()
    expect(correctButtons()).toHaveLength(0)
  })

  it('shows the button on each payment line to the owner', async () => {
    await openStudent(ISHAAN)
    await within(await box()).findByRole('list', { name: 'Payments' })
    expect(correctButtons()).toHaveLength(3)
  })

  it('asks for a note, then asks once more, then takes the payment back', async () => {
    await openStudent(ISHAAN)
    await within(await box()).findByRole('list', { name: 'Payments' })
    await userEvent.click(correctButtons()[0] as HTMLElement)

    // Step 1: a note is needed.
    const first = within(await screen.findByRole('dialog', { name: 'Correct a wrong payment' }))
    await userEvent.click(first.getByRole('button', { name: 'Continue' }))
    expect(await first.findByText('Write why this payment is wrong.')).toBeInTheDocument()
    await userEvent.type(first.getByLabelText(/Why is it wrong/), 'Paid for the wrong child')
    await userEvent.click(first.getByRole('button', { name: 'Continue' }))

    // Step 2: nothing is saved before this answer.
    const second = within(await screen.findByRole('dialog', { name: 'Are you sure?' }))
    expect(second.getByText(/This changes the money records/)).toBeInTheDocument()
    expect(second.getByText('Your note: Paid for the wrong child')).toBeInTheDocument()
    expect(within(await box()).getByText('Paid so far').nextSibling).toHaveTextContent('₹22,500')
    await userEvent.click(second.getByRole('button', { name: 'Yes, correct the payment' }))

    expect(
      await screen.findByText(/Payment corrected\. Receipt number R-2026-\d{4}/),
    ).toBeInTheDocument()
    const fees = within(await box())
    await waitFor(() =>
      expect(fees.getByText('Paid so far').nextSibling).toHaveTextContent('₹15,000'),
    )
    expect(fees.getByText('Still to pay').nextSibling).toHaveTextContent('₹15,000')
    const lines = within(fees.getByRole('list', { name: 'Payments' })).getAllByRole('listitem')
    expect(lines).toHaveLength(4)
    expect(lines[0]).toHaveTextContent('−₹7,500')
    expect(lines[0]).toHaveTextContent('Correction')
    expect(lines[0]).toHaveTextContent('Note: Paid for the wrong child')
    // The wrong payment stays in the list, marked, with no second correction button.
    expect(fees.getAllByText(/Corrected/).length).toBeGreaterThan(0)
    expect(correctButtons()).toHaveLength(2)
  })

  it('"Go back" returns to the note, and Cancel sends nothing', async () => {
    let sent = 0
    server.use(
      http.post('http://localhost:3000/api/v1/students/:id/payment-corrections', () => {
        sent++
        return HttpResponse.json({}, { status: 201 })
      }),
    )
    await openStudent(ISHAAN)
    await within(await box()).findByRole('list', { name: 'Payments' })
    await userEvent.click(correctButtons()[0] as HTMLElement)
    const first = within(await screen.findByRole('dialog', { name: 'Correct a wrong payment' }))
    await userEvent.type(first.getByLabelText(/Why is it wrong/), 'Mistake')
    await userEvent.click(first.getByRole('button', { name: 'Continue' }))
    const second = within(await screen.findByRole('dialog', { name: 'Are you sure?' }))
    await userEvent.click(second.getByRole('button', { name: 'Go back' }))
    const again = within(await screen.findByRole('dialog', { name: 'Correct a wrong payment' }))
    expect(again.getByLabelText(/Why is it wrong/)).toHaveValue('Mistake')
    await userEvent.click(again.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(sent).toBe(0)
  })
})

describe('One student: a bus change and the fees', () => {
  it('busChangeRefreshesFees: after the bus starts, the fees box shows the bus fee at once', async () => {
    await openStudent(ISHAAN)
    const fees = within(await box())
    expect(await fees.findByText('Still to pay')).toBeInTheDocument()
    expect(fees.getByText('Still to pay').nextSibling).toHaveTextContent('₹7,500')
    expect(fees.queryByText('Bus fee for the year')).not.toBeInTheDocument()

    const transport = within(screen.getByRole('region', { name: 'Transport' }))
    await userEvent.click(transport.getByRole('button', { name: 'Change' }))
    const form = within(await transport.findByRole('form', { name: 'Change the bus' }))
    await userEvent.selectOptions(form.getByLabelText('Route'), 'Route 4')
    await userEvent.selectOptions(form.getByLabelText('Stop'), 'Jakhal · 7:40')
    const date = form.getByLabelText('Start from')
    await userEvent.clear(date)
    await userEvent.type(date, '2030-11-02')
    const fee = form.getByLabelText('Bus fee for the rest of this year (₹)')
    await userEvent.clear(fee)
    await userEvent.type(fee, '4000')
    await userEvent.click(form.getByRole('button', { name: 'Save change' }))
    expect(await screen.findByText('Bus change saved')).toBeInTheDocument()

    await waitFor(() =>
      expect(fees.getByText('Bus fee for the year').nextSibling).toHaveTextContent('₹4,000'),
    )
    expect(fees.getByText('Still to pay').nextSibling).toHaveTextContent('₹11,500')
  })
})
