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
import { StudentHeader } from '../components/StudentHeader'

export function StudentPage() {
  const { id } = useParams()
  return <OneStudent id={Number(id)} />
}

function OneStudent({ id }: { id: number }) {
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
        <div className="flex min-w-0 flex-[1_1_440px] flex-col gap-6" />
        <div className="flex min-w-0 flex-[1_1_440px] flex-col gap-6" />
      </div>
    </>
  )
}
