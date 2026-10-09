import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { ChoiceGroup } from './ChoiceGroup'
import { Field } from './Field'
import { HistoryList } from './HistoryList'
import { InlineForm } from './InlineForm'
import { MoneyInput } from './MoneyInput'
import { SeatMeter } from './SeatMeter'
import { seatMeterWidths } from './seatMeterWidths'
import { Tile, TileRow } from './Tile'

function part(name: 'blue' | 'red'): HTMLElement {
  const meter = screen.getByRole('img')
  const found = meter.querySelector<HTMLElement>(`[data-part="${name}"]`)
  if (!found) throw new Error('part missing')
  return found
}

describe('SeatMeter', () => {
  it('seatMeterShowsRedOnlyWhenOverSeats', () => {
    const { rerender } = render(<SeatMeter count={7} seats={14} />)
    expect(part('blue').style.width).toBe('25%')
    expect(part('red').style.width).toBe('0%')

    rerender(<SeatMeter count={14} seats={14} />)
    expect(part('blue').style.width).toBe('50%')
    expect(part('red').style.width).toBe('0%')

    rerender(<SeatMeter count={19} seats={14} />)
    expect(part('blue').style.width).toBe('50%')
    expect(part('red').style.width).toBe('17.9%')
    expect(screen.getByRole('img')).toHaveAccessibleName(
      '19 children on 14 seats, 5 without a seat',
    )
  })

  it('stops the red part at one full half', () => {
    expect(seatMeterWidths(60, 14).red).toBe(50)
    expect(seatMeterWidths(0, 0)).toEqual({ blue: 0, red: 0 })
  })
})

describe('small components', () => {
  it('shows tiles with a label and a number', () => {
    render(
      <TileRow label="Fleet summary">
        <Tile label="Seats" value="150" />
        <Tile label="Yearly loss" value="−₹8,67,900" tone="bad" />
      </TileRow>,
    )
    expect(screen.getByLabelText('Fleet summary')).toHaveTextContent('Seats150')
    expect(screen.getByText('−₹8,67,900')).toHaveClass('text-bad')
  })

  it('MoneyInput shows commas and gives back a number', async () => {
    function Harness() {
      const [value, setValue] = useState<number | null>(null)
      return (
        <>
          <Field label="Cost">
            <MoneyInput value={value} onValueChange={setValue} />
          </Field>
          <output>{value === null ? 'empty' : value}</output>
        </>
      )
    }
    render(<Harness />)
    await userEvent.type(screen.getByLabelText('Cost'), '30300')
    expect(screen.getByLabelText('Cost')).toHaveValue('30,300')
    expect(screen.getByRole('status')).toHaveTextContent('30300')
    await userEvent.clear(screen.getByLabelText('Cost'))
    expect(screen.getByRole('status')).toHaveTextContent('empty')
  })

  it('ChoiceGroup changes the chosen box', async () => {
    const onChange = vi.fn()
    render(
      <ChoiceGroup
        legend="For how long"
        value="TEMP"
        onChange={onChange}
        choices={[
          { value: 'TEMP', label: 'Only till a date' },
          { value: 'FOREVER', label: 'From now on' },
        ]}
      />,
    )
    expect(screen.getByRole('radio', { name: 'Only till a date' })).toBeChecked()
    await userEvent.click(screen.getByRole('radio', { name: 'From now on' }))
    expect(onChange).toHaveBeenCalledWith('FOREVER')
  })

  it('InlineForm submits, cancels and shows the server message', async () => {
    const onSubmit = vi.fn()
    const onCancel = vi.fn()
    render(
      <InlineForm
        title="Change the driver of Van 4"
        submitLabel="Save change"
        error="Rajpal drives Van 1 on these days."
        onSubmit={onSubmit}
        onCancel={onCancel}
      >
        <p>fields</p>
      </InlineForm>,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Rajpal drives Van 1 on these days.')
    await userEvent.click(screen.getByRole('button', { name: 'Save change' }))
    expect(onSubmit).toHaveBeenCalledTimes(1)
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('HistoryList shows every row', () => {
    render(
      <HistoryList
        items={[
          { key: 1, label: 'Driver', title: 'Jagdish', when: '1 Apr 2026 to now', current: true },
          { key: 2, label: 'Driver', title: 'Om Prakash', when: '1 Jul 2025 to 31 Mar 2026' },
        ]}
      />,
    )
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByText('Jagdish')).toHaveClass('font-semibold')
  })
})
