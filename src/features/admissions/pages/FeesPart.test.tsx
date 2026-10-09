import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { renderApp, saveLogin, sampleUserIds } from '@/test/utils'

async function openAdmission() {
  saveLogin(sampleUserIds.admissions)
  renderApp('/admissions/new')
  await screen.findByRole('form', { name: 'New admission' })
}

const form = () => within(screen.getByRole('form', { name: 'New admission' }))
const summary = () => within(screen.getByRole('complementary', { name: 'Fee summary' }))

async function replaceMoney(label: RegExp | string, text: string) {
  const input = form().getByLabelText(label)
  await userEvent.clear(input)
  if (text) await userEvent.type(input, text)
}

async function fillRestOfTheForm() {
  const f = form()
  await userEvent.type(f.getByLabelText(/Student name/), 'Kavya Goyal')
  await userEvent.type(f.getByLabelText(/Date of birth/), '2021-08-14')
  await userEvent.click(f.getByLabelText('Girl'))
  await userEvent.type(f.getByLabelText(/Father's name/), 'Rakesh Goyal')
  await userEvent.type(f.getByLabelText("Father's phone *"), '98123 00771')
  await userEvent.selectOptions(f.getByLabelText(/Father's occupation/), 'Shopkeeper or trader')
  await userEvent.type(f.getByLabelText(/Village or locality/), 'Tohana town')
}

describe('New admission: part 4, Fees', () => {
  it('fills the school fee from the class and says so', async () => {
    await openAdmission()
    const school = form().getByLabelText(/School fee for the year/)
    expect(school).toHaveValue('')
    await userEvent.selectOptions(form().getByLabelText(/Class \*/), 'UKG')
    await waitFor(() => expect(school).toHaveValue('26,000'))
    expect(
      form().getByText('Filled from the fee set for Class UKG. You can change it.'),
    ).toBeInTheDocument()
    // The clerk may change it.
    await replaceMoney(/School fee for the year/, '30000')
    expect(school).toHaveValue('30,000')
    expect(summary().getByText('School fee').nextSibling).toHaveTextContent('₹30,000')
  })

  it('starts empty when the class fee is not set yet, and says so', async () => {
    server.use(
      http.get('http://localhost:3000/api/v1/sessions/:id/class-fees', () =>
        HttpResponse.json([{ className: 'Class 5', amount: null }]),
      ),
    )
    await openAdmission()
    await userEvent.selectOptions(form().getByLabelText(/Class \*/), 'Class 5')
    await waitFor(() =>
      expect(
        form().getByText('The fee for Class 5 is not set yet. Enter it here.'),
      ).toBeInTheDocument(),
    )
    expect(form().getByLabelText(/School fee for the year/)).toHaveValue('')
  })

  it('busFeeIsHiddenWhenNoBus: the bus fee shows only with a bus and comes from settings', async () => {
    await openAdmission()
    expect(form().queryByLabelText(/Bus fee for the year/)).not.toBeInTheDocument()
    expect(summary().queryByText('Bus fee')).not.toBeInTheDocument()

    await userEvent.click(form().getByLabelText('Yes'))
    const bus = await form().findByLabelText(/Bus fee for the year/)
    await waitFor(() => expect(bus).toHaveValue('8,800'))
    expect(form().getByText('Filled because the child uses the bus.')).toBeInTheDocument()
    expect(summary().getByText('Bus fee').nextSibling).toHaveTextContent('₹8,800')

    await userEvent.click(form().getByLabelText('No, comes on own'))
    expect(form().queryByLabelText(/Bus fee for the year/)).not.toBeInTheDocument()
    expect(summary().queryByText('Bus fee')).not.toBeInTheDocument()
  })

  it('summaryUpdatesWhileTyping: ₹30,000 + ₹8,800 − ₹0 = ₹38,800, paid ₹9,700, still ₹29,100', async () => {
    await openAdmission()
    await userEvent.click(form().getByLabelText('Yes'))
    await replaceMoney(/School fee for the year/, '30000')
    await waitFor(() => expect(form().getByLabelText(/Bus fee for the year/)).toHaveValue('8,800'))
    expect(summary().getByText('Total for the year').nextSibling).toHaveTextContent('₹38,800')

    // Every key press moves the numbers.
    await replaceMoney('Amount received (₹)', '9')
    expect(summary().getByText('Paid today').nextSibling).toHaveTextContent('₹9')
    expect(summary().getByText('Still to pay').nextSibling).toHaveTextContent('₹38,791')
    await userEvent.type(form().getByLabelText('Amount received (₹)'), '700')
    expect(summary().getByText('Paid today').nextSibling).toHaveTextContent('₹9,700')
    expect(summary().getByText('Still to pay').nextSibling).toHaveTextContent('₹29,100')

    expect(summary().getByText('Pick how often the family pays.')).toBeInTheDocument()
    await userEvent.click(form().getByLabelText('Every 3 months'))
    expect(summary().getByText('4 payments of ₹9,700 in the year.')).toBeInTheDocument()
    expect(summary().getByText('₹9,700', { selector: 'strong' })).toBeInTheDocument()

    await userEvent.click(form().getByLabelText('Once a year'))
    expect(summary().getByText('1 payment of ₹38,800 in the year.')).toBeInTheDocument()
    expect(summary().getByText('₹29,100', { selector: 'strong' })).toBeInTheDocument()
  })

  it('discountNeedsAReason: a discount above 0 asks for a reason, under the box', async () => {
    await openAdmission()
    await fillRestOfTheForm()
    await userEvent.selectOptions(form().getByLabelText(/Class \*/), 'UKG')
    await userEvent.click(form().getByLabelText('No, comes on own'))
    await waitFor(() =>
      expect(form().getByLabelText(/School fee for the year/)).toHaveValue('26,000'),
    )
    await userEvent.click(form().getByLabelText('Every month'))
    await replaceMoney('Discount (₹)', '2000')
    expect(summary().getByText('Total for the year').nextSibling).toHaveTextContent('₹24,000')

    await userEvent.click(form().getByRole('button', { name: 'Save admission' }))
    const reason = await form().findByLabelText('Reason for discount')
    await waitFor(() => expect(reason).toHaveAccessibleDescription('Say why there is a discount.'))
    await userEvent.selectOptions(reason, 'Staff child')
    await waitFor(() => expect(reason).not.toHaveAttribute('aria-invalid', 'true'))
  })

  it('refuses a first payment that is more than the total', async () => {
    await openAdmission()
    await fillRestOfTheForm()
    await userEvent.selectOptions(form().getByLabelText(/Class \*/), 'UKG')
    await userEvent.click(form().getByLabelText('No, comes on own'))
    await waitFor(() =>
      expect(form().getByLabelText(/School fee for the year/)).toHaveValue('26,000'),
    )
    await userEvent.click(form().getByLabelText('Once a year'))
    await replaceMoney('Amount received (₹)', '26001')
    await userEvent.click(form().getByRole('button', { name: 'Save admission' }))
    const paid = await form().findByLabelText('Amount received (₹)')
    await waitFor(() =>
      expect(paid).toHaveAccessibleDescription(
        'The first payment is more than the ₹26,000 for the year.',
      ),
    )
  })

  it('sends the plan and the first payment, and shows the receipt number', async () => {
    let sent: Record<string, unknown> = {}
    server.use(
      http.post('http://localhost:3000/api/v1/admissions', async ({ request }) => {
        sent = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(
          { studentId: 2, admissionNo: 'A-2026-119', receiptNo: 'R-2026-0999' },
          { status: 201 },
        )
      }),
    )
    await openAdmission()
    await fillRestOfTheForm()
    await userEvent.selectOptions(form().getByLabelText(/Class \*/), 'UKG')
    await userEvent.click(form().getByLabelText('Yes'))
    await userEvent.selectOptions(await form().findByLabelText('Route'), 'Route 4')
    await userEvent.selectOptions(form().getByLabelText('Stop'), 'Jakhal · 7:40')
    await replaceMoney(/School fee for the year/, '30000')
    await waitFor(() => expect(form().getByLabelText(/Bus fee for the year/)).toHaveValue('8,800'))
    await userEvent.click(form().getByLabelText('Every 3 months'))
    await replaceMoney('Amount received (₹)', '9700')
    await userEvent.selectOptions(form().getByLabelText('Paid by'), 'Cash')
    await userEvent.click(form().getByRole('button', { name: 'Save admission' }))

    expect(await screen.findByText(/Receipt number R-2026-0999/)).toBeInTheDocument()
    expect(sent).toMatchObject({
      schoolFee: 30000,
      busFee: 8800,
      discount: 0,
      frequency: 'QUARTERLY',
      firstPaymentAmount: 9700,
      firstPaymentMode: 'CASH',
    })
    expect(sent).not.toHaveProperty('discountReason')
  })

  it('leaves the first payment out when the family pays later', async () => {
    let sent: Record<string, unknown> = {}
    server.use(
      http.post('http://localhost:3000/api/v1/admissions', async ({ request }) => {
        sent = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ studentId: 2, admissionNo: 'A-2026-119' }, { status: 201 })
      }),
    )
    await openAdmission()
    await fillRestOfTheForm()
    await userEvent.selectOptions(form().getByLabelText(/Class \*/), 'UKG')
    await userEvent.click(form().getByLabelText('No, comes on own'))
    await waitFor(() =>
      expect(form().getByLabelText(/School fee for the year/)).toHaveValue('26,000'),
    )
    await userEvent.click(form().getByLabelText('Every 3 months'))
    await userEvent.click(form().getByRole('button', { name: 'Save admission' }))
    await screen.findByText(/Admitted\. Admission number A-2026-119/)
    expect(sent).toMatchObject({ schoolFee: 26000, busFee: 0, frequency: 'QUARTERLY' })
    expect(sent).not.toHaveProperty('firstPaymentAmount')
  })

  it("paymentTooLargeShowsServerMessage: the server's sentence goes under the first payment", async () => {
    server.use(
      http.post('http://localhost:3000/api/v1/admissions', () =>
        HttpResponse.json(
          {
            error: 'PAYMENT_TOO_LARGE',
            message: 'The first payment is more than the ₹26,000 for the year.',
            fields: {
              firstPaymentAmount: 'The first payment is more than the ₹26,000 for the year.',
            },
          },
          { status: 409 },
        ),
      ),
    )
    await openAdmission()
    await fillRestOfTheForm()
    await userEvent.selectOptions(form().getByLabelText(/Class \*/), 'UKG')
    await userEvent.click(form().getByLabelText('No, comes on own'))
    await waitFor(() =>
      expect(form().getByLabelText(/School fee for the year/)).toHaveValue('26,000'),
    )
    await userEvent.click(form().getByLabelText('Every 3 months'))
    await replaceMoney('Amount received (₹)', '5000')
    await userEvent.click(form().getByRole('button', { name: 'Save admission' }))
    const paid = await form().findByLabelText('Amount received (₹)')
    await waitFor(() =>
      expect(paid).toHaveAccessibleDescription(
        'The first payment is more than the ₹26,000 for the year.',
      ),
    )
  })
})
