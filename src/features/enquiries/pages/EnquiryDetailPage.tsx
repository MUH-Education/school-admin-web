import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useParams } from 'react-router'
import { ApiError } from '@/api/errors'
import { usePermissions } from '@/auth/usePermissions'
import { formatDate } from '@/lib/format'
import { Breadcrumb } from '@/ui/Breadcrumb'
import { Button } from '@/ui/Button'
import { ErrorState } from '@/ui/ErrorState'
import { LinkButton } from '@/ui/LinkButton'
import { LoadingBlock } from '@/ui/LoadingBlock'
import { PageHeader } from '@/ui/PageHeader'
import { Panel } from '@/ui/Panel'
import { useToast } from '@/ui/useToast'
import { useEnquiry, useUpdateEnquiry } from '../api'
import { EnquiryForm } from '../components/EnquiryForm'
import { FollowUpsPanel } from '../components/FollowUpsPanel'
import { StagePanel } from '../components/StagePanel'
import {
  enquiryFieldNames,
  enquirySchema,
  fromEnquiry,
  showFirstMistake,
  showServerErrors,
  toRequest,
  type EnquiryValues,
} from '../form'
import type { Enquiry } from '../types'

export function EnquiryDetailPage() {
  const id = Number(useParams().id)
  const enquiry = useEnquiry(id)

  if (enquiry.isPending) return <LoadingBlock />
  if (enquiry.isError) {
    return <ErrorState error={enquiry.error} onRetry={() => void enquiry.refetch()} />
  }
  return <EnquiryDetail enquiry={enquiry.data} />
}

function EnquiryDetail({ enquiry }: { enquiry: Enquiry }) {
  const { can } = usePermissions()
  const toast = useToast()
  const update = useUpdateEnquiry(enquiry.id)
  const formRef = useRef<HTMLFormElement>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [existingId, setExistingId] = useState<number | null>(null)

  const canEdit = can('ENQUIRIES_EDIT')
  const open = enquiry.status !== 'ADMITTED' && enquiry.status !== 'LOST'
  const schema = useMemo(() => enquirySchema({ callBackRequired: open }), [open])

  const form = useForm<EnquiryValues>({
    resolver: zodResolver(schema),
    defaultValues: fromEnquiry(enquiry),
  })

  // A new follow-up moves the next date: bring it into the form, but keep what the person typed.
  const { reset } = form
  useEffect(() => {
    reset(fromEnquiry(enquiry), { keepDirtyValues: true })
  }, [enquiry, reset])

  async function save(values: EnquiryValues) {
    setServerError(null)
    setExistingId(null)
    try {
      await update.mutateAsync(toRequest(values))
      toast.show('Changes saved')
    } catch (error) {
      if (error instanceof ApiError && error.code === 'ENQUIRY_EXISTS') {
        setExistingId(error.enquiryId ?? null)
      } else {
        setServerError(showServerErrors(form, error, enquiryFieldNames))
      }
      showFirstMistake(formRef.current)
    }
  }

  const submit = () => void form.handleSubmit(save, () => showFirstMistake(formRef.current))()
  const canAdmit =
    can('ADMISSIONS_CREATE') && (enquiry.status === 'VISITED' || enquiry.status === 'APPLIED')

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumb={
          <Breadcrumb
            items={[{ label: 'Enquiries', to: '/enquiries' }, { label: enquiry.parentName }]}
          />
        }
        title={enquiry.parentName}
        description={`Enquiry of ${formatDate(enquiry.createdOn)}. Change the details on the left, move the stage on the right.`}
      />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <EnquiryForm
          label="Enquiry details"
          form={form}
          formRef={formRef}
          callBack={open}
          onSubmit={submit}
        >
          {existingId !== null && (
            <Panel tone="dust" role="alert" className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <strong>This parent already has an open enquiry.</strong>
              <Link to={`/enquiries/${existingId}`} className="font-semibold text-canal underline">
                Open it
              </Link>
            </Panel>
          )}
          {serverError && (
            <p role="alert" className="border border-bad bg-bad-soft p-3 font-semibold text-bad">
              {serverError}
            </p>
          )}
          {canEdit && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
              <Button
                type="submit"
                saving={update.isPending}
                className="min-h-[52px] px-7! text-base"
              >
                Save changes
              </Button>
            </div>
          )}
        </EnquiryForm>
        <div className="flex flex-col gap-6">
          <StagePanel enquiry={enquiry} canEdit={canEdit} />
          <FollowUpsPanel enquiry={enquiry} canEdit={canEdit} />
          {canAdmit && (
            <Panel aria-label="Start admission" className="flex flex-col gap-3">
              <h2 className="text-[15.5px] font-semibold">Start admission</h2>
              <p className="text-sm text-ink-soft">
                The parent's details are copied to the New admission form.
              </p>
              <div>
                <LinkButton to={`/admissions/new?enquiryId=${enquiry.id}`}>
                  Start admission
                </LinkButton>
              </div>
            </Panel>
          )}
        </div>
      </div>
    </div>
  )
}
