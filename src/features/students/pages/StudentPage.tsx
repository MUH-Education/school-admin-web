import { useState } from 'react'
import { useParams } from 'react-router'
import { ApiError } from '@/api/errors'
import { usePermissions } from '@/auth/usePermissions'
import { Breadcrumb } from '@/ui/Breadcrumb'
import { EmptyState } from '@/ui/EmptyState'
import { ErrorState } from '@/ui/ErrorState'
import { LinkButton } from '@/ui/LinkButton'
import { LoadingBlock } from '@/ui/LoadingBlock'
import { PageHeader } from '@/ui/PageHeader'
import { useStudent } from '../api'
import { DetailsBox } from '../components/DetailsBox'
import { HistoryBox } from '../components/HistoryBox'
import { PhonesBox } from '../components/PhonesBox'
import { StudentHeader } from '../components/StudentHeader'
import { TransportBox } from '../components/TransportBox'

export function StudentPage() {
  const { id } = useParams()
  return <OneStudent id={Number(id)} />
}

/** Which box is a form now. Only one at a time: opening another box closes the first. */
export type Editing =
  | { box: 'details' }
  | { box: 'transport' }
  | { box: 'phone-add' }
  | { box: 'phone'; id: number }
  | null

function OneStudent({ id }: { id: number }) {
  const [editing, setEditing] = useState<Editing>(null)
  const canEdit = usePermissions().can('STUDENTS_EDIT')
  const student = useStudent(id)
  const crumb = (name: string) => (
    <Breadcrumb items={[{ label: 'Students', to: '/students' }, { label: name }]} />
  )

  if (student.isPending) {
    return (
      <>
        <PageHeader breadcrumb={crumb('…')} title="Student" />
        <LoadingBlock />
      </>
    )
  }
  if (student.isError) {
    if (student.error instanceof ApiError && student.error.status === 404) {
      return (
        <>
          <PageHeader breadcrumb={crumb('Not found')} title="Student" />
          <EmptyState
            title="This student does not exist"
            hint="The student may have left the school."
            action={<LinkButton to="/students">Back to students</LinkButton>}
          />
        </>
      )
    }
    return (
      <>
        <PageHeader breadcrumb={crumb('…')} title="Student" />
        <ErrorState error={student.error} onRetry={() => void student.refetch()} />
      </>
    )
  }

  const s = student.data
  return (
    <>
      <StudentHeader student={s} canEdit={canEdit} />
      <div className="flex flex-wrap items-start gap-6">
        <div className="flex min-w-0 flex-[1_1_440px] flex-col gap-6">
          <DetailsBox
            student={s}
            canEdit={canEdit}
            editing={editing?.box === 'details'}
            onEdit={() => setEditing({ box: 'details' })}
            onClose={() => setEditing(null)}
          />
          <PhonesBox student={s} canEdit={canEdit} editing={editing} setEditing={setEditing} />
        </div>
        <div className="flex min-w-0 flex-[1_1_440px] flex-col gap-6">
          <TransportBox
            student={s}
            canEdit={canEdit}
            editing={editing?.box === 'transport'}
            onEdit={() => setEditing({ box: 'transport' })}
            onClose={() => setEditing(null)}
          />
          <HistoryBox studentId={s.id} />
        </div>
      </div>
    </>
  )
}
