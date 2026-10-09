import { sessionLabel } from '@/lib/format'
import { PageHeader } from '@/ui/PageHeader'
import { AdmissionForm } from '../components/AdmissionForm'

export function AdmissionPage() {
  return (
    <>
      <PageHeader
        label={`Admissions · Session ${sessionLabel()}`}
        title="New admission"
        description="Add the student and the family once. The admission number is given when you save."
      />
      <AdmissionForm />
    </>
  )
}
