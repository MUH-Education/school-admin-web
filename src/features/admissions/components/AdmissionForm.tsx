import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useBeforeUnload, useBlocker, useNavigate, useSearchParams } from 'react-router'
import { ApiError } from '@/api/errors'
import { Button } from '@/ui/Button'
import { ConfirmDialog } from '@/ui/ConfirmDialog'
import { LinkButton } from '@/ui/LinkButton'
import { useToast } from '@/ui/useToast'
import { usePermissions } from '@/auth/usePermissions'
import { useEnquiryPrefill } from '@/features/enquiries/api'
import { useAdmit } from '../api'
import {
  admissionFieldNames,
  admissionSchema,
  emptyAdmission,
  prefillValues,
  toRequest,
} from '../form'
import type { AdmissionValues } from '../form'
import { EnquiryNotice } from './EnquiryNotice'
import { FamilySection } from './FamilySection'
import { FeesSection } from './FeesSection'
import { FeeSummary } from './FeeSummary'
import { StudentSection } from './StudentSection'
import { TransportSection } from './TransportSection'

/** The admission: 1 Student, 2 Family, 3 Transport, and 4 Fees with the Fee summary on the right. */
export function AdmissionForm() {
  const toast = useToast()
  const navigate = useNavigate()
  const admit = useAdmit()
  // Part 4 and the summary are for people who may edit fees. The server checks too.
  const feesOn = usePermissions().can('FEES_EDIT')
  const formRef = useRef<HTMLFormElement>(null)
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm<AdmissionValues>({
    resolver: zodResolver(admissionSchema),
    defaultValues: emptyAdmission(feesOn),
  })
  const { isDirty } = form.formState

  // With ?enquiryId= the known details come from the enquiry, once. After that the clerk is free.
  const [params] = useSearchParams()
  const rawEnquiryId = Number(params.get('enquiryId'))
  const enquiryId = Number.isInteger(rawEnquiryId) && rawEnquiryId > 0 ? rawEnquiryId : null
  const prefill = useEnquiryPrefill(enquiryId)
  const prefilled = useRef(false)
  const { setValue } = form
  useEffect(() => {
    if (!prefill.data || prefilled.current) return
    prefilled.current = true
    for (const [name, value] of Object.entries(prefillValues(prefill.data))) {
      setValue(name as keyof AdmissionValues, value as never)
    }
  }, [prefill.data, setValue])

  // Leaving with typed data asks first. After a good save there is nothing to lose.
  const dirty = useRef(false)
  const saved = useRef(false)
  useEffect(() => {
    dirty.current = isDirty
  }, [isDirty])
  const blocker = useBlocker(() => dirty.current && !saved.current)
  useBeforeUnload(
    useCallback((event: BeforeUnloadEvent) => {
      if (dirty.current && !saved.current) event.preventDefault()
    }, []),
  )

  /** Scrolls to the first input with a mistake. The timer lets the mistakes reach the screen first. */
  function showFirstMistake() {
    setTimeout(() => {
      const first = formRef.current?.querySelector<HTMLElement>(
        '[aria-invalid="true"], p[role="alert"]',
      )
      first?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      first?.focus({ preventScroll: true })
    }, 0)
  }

  async function save(values: AdmissionValues) {
    setServerError(null)
    try {
      const result = await admit.mutateAsync(toRequest(values, prefill.data ? enquiryId : null))
      saved.current = true
      toast.show(
        `Admitted. Admission number ${result.admissionNo}` +
          (result.receiptNo ? `. Receipt number ${result.receiptNo}` : ''),
      )
      void navigate(`/students/${result.studentId}`)
    } catch (error) {
      if (!(error instanceof ApiError)) {
        setServerError('Something went wrong. Try again.')
      } else {
        const names = admissionFieldNames.filter((name) => error.fields[name])
        for (const name of names) form.setError(name, { message: error.fields[name] })
        if (names.length === 0) setServerError(error.message)
      }
      showFirstMistake()
    }
  }

  return (
    <>
      {enquiryId !== null && <EnquiryNotice enquiryId={enquiryId} prefill={prefill} />}
      <div className="flex flex-wrap items-start gap-6">
        <form
          ref={formRef}
          noValidate
          aria-label="New admission"
          onSubmit={(event) => void form.handleSubmit(save, showFirstMistake)(event)}
          className={`flex flex-col gap-6 ${feesOn ? 'min-w-0 flex-[999_1_620px]' : 'max-w-[860px]'}`}
        >
          <StudentSection form={form} />
          <FamilySection form={form} />
          <TransportSection form={form} />
          {feesOn && <FeesSection form={form} />}

          {serverError && (
            <p role="alert" className="border border-bad bg-bad-soft p-3 font-semibold text-bad">
              {serverError}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            <Button type="submit" saving={admit.isPending} className="min-h-[52px] px-7 text-base">
              Save admission
            </Button>
            <LinkButton to="/students" variant="plain" className="min-h-[52px] px-6 text-base">
              Cancel
            </LinkButton>
          </div>
        </form>
        {feesOn && <FeeSummary control={form.control} />}
      </div>
      <ConfirmDialog
        open={blocker.state === 'blocked'}
        title="Leave without saving?"
        message="You typed data on this form. If you leave now, it is lost."
        confirmLabel="Leave"
        cancelLabel="Stay here"
        danger
        onConfirm={() => blocker.proceed?.()}
        onCancel={() => blocker.reset?.()}
      />
    </>
  )
}
