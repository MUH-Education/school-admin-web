import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Field } from './Field'
import { PhoneInput } from './PhoneInput'
import { Select } from './Select'
import { TextInput } from './TextInput'

describe('Field', () => {
  it('links the label, hint and error to the input', () => {
    render(
      <Field label="Name" hint="As on the ID card" error="Required">
        <TextInput />
      </Field>,
    )
    const input = screen.getByLabelText('Name')
    expect(input).toHaveAccessibleDescription('As on the ID card Required')
    expect(input).toBeInvalid()
    expect(screen.getByRole('alert')).toHaveTextContent('Required')
  })

  it('takes typing', async () => {
    render(
      <Field label="Mobile number">
        <PhoneInput />
      </Field>,
    )
    const input = screen.getByLabelText('Mobile number')
    await userEvent.type(input, '98123 45678')
    expect(input).toHaveValue('98123 45678')
    expect(input).toHaveAttribute('type', 'tel')
  })

  it('Select lets you pick an option', async () => {
    render(
      <Field label="Role">
        <Select defaultValue="">
          <option value="">Pick</option>
          <option value="A">Alpha</option>
        </Select>
      </Field>,
    )
    await userEvent.selectOptions(screen.getByLabelText('Role'), 'Alpha')
    expect(screen.getByLabelText('Role')).toHaveValue('A')
  })
})
