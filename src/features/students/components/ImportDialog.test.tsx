import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp, saveLogin, sampleUserIds } from '@/test/utils'

const csv = [
  'name,dateOfBirth,gender,className,section,village,fatherName,fatherPhone',
  'Meera Dalal,2016-04-05,GIRL,Class 5,A,Jakhal,Ajit Dalal,9812311111',
  'Bad Phone,2016-04-05,BOY,Class 5,A,Jakhal,Ajit Dalal,981231111',
  'Sonu Dalal,2016-04-05,BOY,Class 5,A,Jakhal,Ajit Dalal,9812322222',
].join('\n')

async function openDialog() {
  saveLogin(sampleUserIds.officeAdmin)
  renderApp('/students')
  await userEvent.click(await screen.findByRole('button', { name: 'Import from a sheet' }))
  return screen.getByRole('dialog', { name: 'Import students from a sheet' })
}

describe('Import dialog', () => {
  it('importCheckListsProblemLines, then Import saves the good lines', async () => {
    const dialog = await openDialog()
    // Import waits for a check.
    expect(within(dialog).getByRole('button', { name: 'Import' })).toBeDisabled()

    const file = new File([csv], 'students.csv', { type: 'text/csv' })
    await userEvent.upload(within(dialog).getByLabelText('CSV file'), file)
    await userEvent.click(within(dialog).getByRole('button', { name: 'Check' }))

    const problems = await within(dialog).findByRole('list', { name: 'Lines with a problem' })
    expect(within(problems).getByText(/Line 3/)).toBeInTheDocument()
    expect(problems).toHaveTextContent('Line 3: phone has 9 digits')
    expect(within(dialog).getByText(/2 lines are good/)).toBeInTheDocument()

    await userEvent.click(within(dialog).getByRole('button', { name: 'Import' }))
    expect(await within(dialog).findByText('2 students added, 1 line skipped')).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    // The new children are in the list now.
    await userEvent.type(screen.getByLabelText(/Search by name/), 'Meera')
    expect(await screen.findByText('Meera Dalal', {}, { timeout: 2000 })).toBeInTheDocument()
  })

  it('asks for a file before checking', async () => {
    const dialog = await openDialog()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Check' }))
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Choose a CSV file first.')
  })

  it('a role that cannot edit students has no import button', async () => {
    saveLogin(sampleUserIds.admissions)
    renderApp('/students')
    await screen.findByRole('table', { name: 'Students' })
    expect(screen.queryByRole('button', { name: 'Import from a sheet' })).not.toBeInTheDocument()
  })
})
