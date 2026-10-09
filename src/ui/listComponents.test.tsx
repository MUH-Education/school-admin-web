import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DefinitionGrid } from './DefinitionGrid'
import { Field } from './Field'
import { FilterBar, FilterField, filterInputClass } from './FilterBar'
import { Pagination } from './Pagination'
import { Select } from './Select'
import { TextArea } from './TextArea'
import { TextInput } from './TextInput'

describe('Pagination', () => {
  it('says which rows are shown and turns Back off on the first page', async () => {
    const onPage = vi.fn()
    render(<Pagination page={1} pageSize={25} total={290} noun="students" onPage={onPage} />)
    expect(screen.getByText(/Showing/).textContent).toBe('Showing 1 to 25 of 290 students.')
    expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(onPage).toHaveBeenCalledWith(2)
  })

  it('shows the short last page and turns Next off', () => {
    render(<Pagination page={12} pageSize={25} total={290} noun="students" onPage={() => {}} />)
    expect(screen.getByText(/Showing/).textContent).toBe('Showing 276 to 290 of 290 students.')
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
    expect(screen.getByText('Page 12 of 12')).toBeInTheDocument()
  })

  it('says 0 when there is nothing', () => {
    render(<Pagination page={1} pageSize={25} total={0} noun="students" onPage={() => {}} />)
    expect(screen.getByText(/Showing/).textContent).toBe('Showing 0 to 0 of 0 students.')
  })
})

describe('FilterBar', () => {
  it('joins each label to its input and shows the summary', () => {
    render(
      <FilterBar label="Find a student" summary="290 students.">
        <FilterField label="Search" wide>
          <TextInput className={filterInputClass} />
        </FilterField>
        <FilterField label="Class">
          <Select className={filterInputClass}>
            <option>All classes</option>
          </Select>
        </FilterField>
      </FilterBar>,
    )
    expect(screen.getByRole('region', { name: 'Find a student' })).toBeInTheDocument()
    expect(screen.getByLabelText('Search')).toBeInTheDocument()
    expect(screen.getByLabelText('Class')).toBeInTheDocument()
    expect(screen.getByText('290 students.')).toBeInTheDocument()
  })
})

describe('DefinitionGrid and TextArea', () => {
  it('shows a label over each value', () => {
    render(
      <DefinitionGrid
        items={[
          { label: 'Gender', value: 'Boy' },
          { label: 'Class and section', value: '4 A', mono: true },
        ]}
      />,
    )
    expect(screen.getByText('Gender')).toBeInTheDocument()
    expect(screen.getByText('Boy')).toBeInTheDocument()
    expect(screen.getByText('4 A')).toHaveClass('font-mono')
  })

  it('a TextArea inside a Field gets the label and the error', () => {
    render(
      <Field label="Address" error="Too long.">
        <TextArea />
      </Field>,
    )
    expect(screen.getByLabelText('Address')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('alert')).toHaveTextContent('Too long.')
  })
})
