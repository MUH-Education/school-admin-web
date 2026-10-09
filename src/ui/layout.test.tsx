import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { Breadcrumb } from './Breadcrumb'
import { DataTable } from './DataTable'
import { PageHeader } from './PageHeader'
import { Panel } from './Panel'
import { StatusDot } from './StatusDot'

describe('layout pieces', () => {
  it('PageHeader has one h1 and a description', () => {
    render(<PageHeader label="Settings" title="Users and roles" description="Who can open what" />)
    expect(screen.getByRole('heading', { level: 1, name: 'Users and roles' })).toBeInTheDocument()
    expect(screen.getByText('Who can open what')).toBeInTheDocument()
  })

  it('Panel is a labelled region', () => {
    render(
      <Panel aria-label="Box" tone="dust">
        Inside
      </Panel>,
    )
    expect(screen.getByRole('region', { name: 'Box' })).toHaveTextContent('Inside')
  })

  it('Breadcrumb marks the current page', () => {
    render(
      <MemoryRouter>
        <Breadcrumb items={[{ label: 'Students', to: '/students' }, { label: 'Ishaan Sharma' }]} />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: 'Students' })).toBeInTheDocument()
    expect(screen.getByText('Ishaan Sharma')).toHaveAttribute('aria-current', 'page')
  })

  it('DataTable shows headers and rows with table roles', () => {
    render(
      <DataTable
        caption="People"
        getRowKey={(r) => r.id}
        rows={[{ id: 1, name: 'Balwan' }]}
        columns={[{ header: 'Name', cell: (r) => r.name }]}
      />,
    )
    expect(screen.getByRole('table', { name: 'People' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'Balwan' })).toBeInTheDocument()
  })

  it('StatusDot shows words, not only colour', () => {
    render(<StatusDot tone="good">On</StatusDot>)
    expect(screen.getByText('On')).toBeInTheDocument()
  })
})
