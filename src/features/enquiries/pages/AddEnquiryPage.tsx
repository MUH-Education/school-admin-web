import { zodResolver } from '@hookform/resolvers/zod'
import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import { ApiError } from '@/api/errors'
import { Breadcrumb } from '@/ui/Breadcrumb'
import { Button } from '@/ui/Button'
import { PageHeader } from '@/ui/PageHeader'
import { Panel } from '@/ui/Panel'
import { useToast } from '@/ui/useToast'
import { useCreateEnquiry } from '../api'
import { EnquiryForm } from '../components/EnquiryForm'
import {
  emptyEnquiry,
  enquiryFieldNames,
  enquirySchema,
  showFirstMistake,
  showServerErrors,
  toRequest,
  type EnquiryValues,
} from '../form'

type After = 'list' | 'another'

const schema = enquirySchema({ callBackRequired: true })

export function AddEnquiryPage() {
  const toast = useToast()
  const navigate = useNavigate()
  const create = useCreateEnquiry()
  const formRef = useRef<HTMLFormElement>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  // The enquiry that already has this phone number (ENQUIRY_EXISTS).
  const [existingId, setExistingId] = useState<number | null>(null)
  const after = useRef<After>('list')

  const form = useForm<EnquiryValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyEnquiry(),
  })

  async function save(values: EnquiryValues) {
    setServerError(null)
    setExistingId(null)
    try {
      await create.mutateAsync(toRequest(values))
    } catch (error) {
      if (error instanceof ApiError && error.code === 'ENQUIRY_EXISTS') {
        setExistingId(error.enquiryId ?? null)
        if (error.enquiryId === undefined) setServerError(error.message)
      } else {
        setServerError(showServerErrors(form, error, enquiryFieldNames))
      }
      showFirstMistake(formRef.current)
      return
    }
    toast.show('Enquiry saved')
    if (after.current === 'another') {
      form.reset(emptyEnquiry())
      // After the clean form is on the screen, so the cursor is not taken away again.
      setTimeout(() => form.setFocus('parentName'), 0)
      window.scrollTo({ top: 0 })
    } else {
      void navigate('/enquiries')
    }
  }

  /** Both buttons save; they only differ in where the person goes next. */
  function submit(next: After) {
    after.current = next
    void form.handleSubmit(save, () => showFirstMistake(formRef.current))()
  }

  return (
    <div className="flex flex-col gap-7 text-[15px] leading-[1.45]">
      <PageHeader
        breadcrumb={
          <Breadcrumb
            roomy
            items={[{ label: 'Enquiries', to: '/enquiries' }, { label: 'Add enquiry' }]}
          />
        }
        title="Add an enquiry"
        description="Fill this when a parent visits or calls. Only the fields marked * are needed. The rest can be added later."
        descriptionWidth={620}
        roomy
      />
      <EnquiryForm
        label="Add an enquiry"
        form={form}
        formRef={formRef}
        onSubmit={() => submit('list')}
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
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <Button type="submit" saving={create.isPending} className="min-h-[52px] px-7! text-base">
            Save enquiry
          </Button>
          <Button
            variant="secondary"
            disabled={create.isPending}
            onClick={() => submit('another')}
            className="min-h-[52px] px-6! text-base"
          >
            Save and add another
          </Button>
          <Link
            to="/enquiries"
            className="inline-flex min-h-[52px] items-center px-3 text-base text-canal underline"
          >
            Cancel
          </Link>
        </div>
      </EnquiryForm>
    </div>
  )
}
