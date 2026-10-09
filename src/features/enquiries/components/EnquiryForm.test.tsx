import { zodResolver } from '@hookform/resolvers/zod'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'
import { emptyEnquiry, enquirySchema, toRequest, type EnquiryValues } from '../form'
import { EnquiryForm } from './EnquiryForm'

function Harness({
  callBack = true,
  onSave = () => undefined,
}: {
  callBack?: boolean
  onSave?: (values: EnquiryValues) => void
}) {
  const form = useForm<EnquiryValues>({
    resolver: zodResolver(enquirySchema({ callBackRequired: callBack })),
    defaultValues: emptyEnquiry(),
  })
  return (
    <EnquiryForm
      label="Test enquiry"
      form={form}
      callBack={callBack}
      onSubmit={() => void form.handleSubmit(onSave)()}
    >
      <button type="submit">Save</button>
    </EnquiryForm>
  )
}

const form = () => screen.getByRole('form', { name: 'Test enquiry' })

describe('EnquiryForm', () => {
  it('has the four numbered parts, one column, up to 920px', () => {
    render(<Harness />)
    for (const title of ['1. Parent', '2. Child', '3. How they heard about us', '4. Follow-up']) {
      expect(within(form()).getByRole('heading', { name: title })).toBeInTheDocument()
    }
    expect(form()).toHaveClass('max-w-[920px]', 'flex-col')
  })

  it('has the boxes of the design, and every input is 52px high', () => {
    render(<Harness />)
    const f = within(form())
    for (const label of [
      'Parent name *',
      'Phone number *',
      'Relation to the child',
      'Village or locality *',
      "Child's name",
      'Class wanted *',
      "Child's age",
      'School the child goes to now',
      'Call back on *',
      'Does the child need the school bus',
      'Note',
    ]) {
      expect(f.getByLabelText(label)).toBeInTheDocument()
    }
    for (const label of ['Parent name *', 'Phone number *', 'Class wanted *', 'Call back on *']) {
      expect(f.getByLabelText(label)).toHaveClass('min-h-[52px]!')
    }
    expect(f.getByLabelText('Relation to the child')).toHaveValue('FATHER')
    expect(
      within(f.getByLabelText('Relation to the child'))
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['Father', 'Mother', 'Grandparent', 'Other'])
  })

  it('source is a group of big choice boxes with nothing chosen at first', () => {
    render(<Harness />)
    const group = within(form()).getByRole('group', { name: 'Source *' })
    const labels = within(group)
      .getAllByRole('radio')
      .map((radio) => (radio as HTMLInputElement).labels?.[0]?.textContent)
    expect(labels).toEqual([
      'Walk-in',
      'Referral',
      'Facebook',
      'WhatsApp',
      'Hoarding',
      'Bus enquiry',
    ])
    for (const radio of within(group).getAllByRole('radio')) expect(radio).not.toBeChecked()
    expect(within(group).getByLabelText('Walk-in').closest('label')).toHaveClass('min-h-[52px]')
  })

  it('referredByAppearsOnlyForReferral', async () => {
    render(<Harness />)
    const f = within(form())
    expect(f.queryByLabelText(/Referred by which parent/)).not.toBeInTheDocument()
    await userEvent.click(f.getByLabelText('Facebook'))
    expect(f.queryByLabelText(/Referred by which parent/)).not.toBeInTheDocument()
    await userEvent.click(f.getByLabelText('Referral'))
    expect(f.getByLabelText('Referred by which parent *')).toBeInTheDocument()
    expect(
      f.getByText('That parent gets the referral fee credit if the child is admitted.'),
    ).toBeInTheDocument()
    await userEvent.click(f.getByLabelText('Walk-in'))
    expect(f.queryByLabelText(/Referred by which parent/)).not.toBeInTheDocument()
  })

  it('needs the six boxes and shows a message under each', async () => {
    render(<Harness />)
    await userEvent.click(within(form()).getByRole('button', { name: 'Save' }))
    expect(await screen.findByText("Enter the parent's name.")).toBeInTheDocument()
    expect(screen.getByText('Enter a 10-digit mobile number.')).toBeInTheDocument()
    expect(screen.getByText('Enter the village or locality.')).toBeInTheDocument()
    expect(screen.getByText('Pick a class.')).toBeInTheDocument()
    expect(screen.getByText('Pick how they heard about us.')).toBeInTheDocument()
    expect(screen.getByText('Enter the date to call back.')).toBeInTheDocument()
  })

  it('Referral then needs the name of the referring parent', async () => {
    render(<Harness />)
    await userEvent.click(within(form()).getByLabelText('Referral'))
    await userEvent.click(within(form()).getByRole('button', { name: 'Save' }))
    expect(
      await screen.findByText('Enter the name of the parent who referred them.'),
    ).toBeInTheDocument()
  })

  it('leaves the call-back box out for an enquiry that is closed', async () => {
    const onSave = vi.fn()
    render(<Harness callBack={false} onSave={onSave} />)
    const f = within(form())
    expect(f.queryByLabelText(/Call back on/)).not.toBeInTheDocument()
    await userEvent.type(f.getByLabelText('Parent name *'), 'Anita Goyal')
    await userEvent.type(f.getByLabelText('Phone number *'), '98123 45678')
    await userEvent.type(f.getByLabelText('Village or locality *'), 'Tohana town')
    await userEvent.selectOptions(f.getByLabelText('Class wanted *'), 'UKG')
    await userEvent.click(f.getByLabelText('Walk-in'))
    await userEvent.click(f.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(onSave).toHaveBeenCalledOnce())
  })
})

describe('toRequest', () => {
  const filled: EnquiryValues = {
    ...emptyEnquiry(),
    parentName: ' Anita Goyal ',
    phone: '98123 45678',
    village: 'Tohana town',
    className: 'UKG',
    source: 'WALK_IN',
    referredBy: 'Left over text',
    nextStepDate: '2026-10-10',
  }

  it('leaves out empty boxes and the referrer of a walk-in', () => {
    expect(toRequest(filled)).toEqual({
      parentName: 'Anita Goyal',
      phone: '98123 45678',
      relation: 'FATHER',
      village: 'Tohana town',
      className: 'UKG',
      source: 'WALK_IN',
      nextStepDate: '2026-10-10',
    })
  })

  it('sends the referrer and the bus answer when they are given', () => {
    expect(
      toRequest({ ...filled, source: 'REFERRAL', referredBy: ' Poonam ', needsBus: 'NO' }),
    ).toMatchObject({ source: 'REFERRAL', referredBy: 'Poonam', needsBus: false })
  })
})
