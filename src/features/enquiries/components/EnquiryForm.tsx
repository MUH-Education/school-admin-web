import type { ReactNode, Ref } from 'react'
import { Controller, type UseFormReturn } from 'react-hook-form'
import { classNames } from '@/features/students/types'
import { ChoiceGroup } from '@/ui/ChoiceGroup'
import { DateInput } from '@/ui/DateInput'
import { Field } from '@/ui/Field'
import { FormGrid, FormSection } from '@/ui/FormSection'
import { PhoneInput } from '@/ui/PhoneInput'
import { Select } from '@/ui/Select'
import { TextArea } from '@/ui/TextArea'
import { TextInput } from '@/ui/TextInput'
import type { EnquiryValues } from '../form'
import { enquiryRelations, enquirySources, relationLabels, sourceLabels } from '../types'
import type { EnquirySource } from '../types'

interface EnquiryFormProps {
  /** Names the form for screen readers, for example "Add an enquiry". */
  label: string
  form: UseFormReturn<EnquiryValues>
  /** Called by the form's own submit (the Enter key and the main button). */
  onSubmit: () => void
  /** False for an Admitted or Lost enquiry: the "Call back on" box is left out. */
  callBack?: boolean
  formRef?: Ref<HTMLFormElement>
  /** The boxes above the buttons and the buttons themselves. */
  children: ReactNode
}

// The inputs of this form are 52px high (decision B15, the Add an enquiry design).
const big = 'min-h-[52px]!'

/** The four numbered parts of an enquiry. Add an enquiry and One enquiry both use it. */
export function EnquiryForm({
  label,
  form,
  onSubmit,
  callBack = true,
  formRef,
  children,
}: EnquiryFormProps) {
  const {
    register,
    control,
    watch,
    formState: { errors },
  } = form
  const source = watch('source')

  return (
    <form
      ref={formRef}
      noValidate
      aria-label={label}
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
      className="flex max-w-[920px] flex-col gap-6 text-[15px] leading-[1.45]"
    >
      <FormSection
        roomy
        title="1. Parent"
        description="The person we will call back."
        label="Parent"
      >
        <FormGrid roomy>
          <Field label="Parent name *" error={errors.parentName?.message}>
            <TextInput className={big} autoComplete="off" {...register('parentName')} />
          </Field>
          <Field label="Phone number *" error={errors.phone?.message}>
            <PhoneInput className={big} placeholder="10 digits" {...register('phone')} />
          </Field>
          <Field label="Relation to the child" error={errors.relation?.message}>
            <Select className={big} {...register('relation')}>
              {enquiryRelations.map((relation) => (
                <option key={relation} value={relation}>
                  {relationLabels[relation]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Village or locality *" error={errors.village?.message}>
            <TextInput className={big} placeholder="e.g. Jakhal" {...register('village')} />
          </Field>
        </FormGrid>
      </FormSection>

      <FormSection roomy title="2. Child" description="Who the admission is for." label="Child">
        <FormGrid roomy>
          <Field label="Child's name" error={errors.childName?.message}>
            <TextInput className={big} autoComplete="off" {...register('childName')} />
          </Field>
          <Field label="Class wanted *" error={errors.className?.message}>
            <Select className={big} {...register('className')}>
              <option value="">Choose a class</option>
              {classNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Child's age" error={errors.childAge?.message}>
            <TextInput className={big} placeholder="e.g. 6 years" {...register('childAge')} />
          </Field>
          <Field label="School the child goes to now" error={errors.currentSchool?.message}>
            <TextInput className={big} {...register('currentSchool')} />
          </Field>
        </FormGrid>
      </FormSection>

      <FormSection
        roomy
        title="3. How they heard about us"
        description="This tells you which marketing works."
        label="How they found us"
      >
        <div className="flex flex-col gap-2">
          <Controller
            control={control}
            name="source"
            render={({ field }) => (
              <ChoiceGroup<EnquirySource | ''>
                roomy
                legend="Source *"
                value={field.value as EnquirySource | ''}
                onChange={field.onChange}
                choices={enquirySources.map((value) => ({ value, label: sourceLabels[value] }))}
              />
            )}
          />
          {errors.source?.message && (
            <p role="alert" className="text-[13px] font-semibold text-bad">
              {errors.source.message}
            </p>
          )}
        </div>
        {source === 'REFERRAL' && (
          <div className="max-w-[428px]">
            <Field
              roomy
              label="Referred by which parent *"
              hint="That parent gets the referral fee credit if the child is admitted."
              error={errors.referredBy?.message}
            >
              <TextInput className={big} autoComplete="off" {...register('referredBy')} />
            </Field>
          </div>
        )}
      </FormSection>

      <FormSection
        roomy
        title="4. Follow-up"
        description={
          callBack ? 'When to call back, and anything to remember.' : 'Anything to remember.'
        }
        label="Follow-up"
      >
        <FormGrid roomy>
          {callBack && (
            <Field label="Call back on *" error={errors.nextStepDate?.message}>
              <DateInput className={big} {...register('nextStepDate')} />
            </Field>
          )}
          <Field label="Does the child need the school bus" error={errors.needsBus?.message}>
            <Select className={big} {...register('needsBus')}>
              <option value="">Not asked yet</option>
              <option value="YES">Yes</option>
              <option value="NO">No</option>
            </Select>
          </Field>
        </FormGrid>
        <Field label="Note" error={errors.note?.message}>
          <TextArea
            rows={4}
            className="leading-normal"
            placeholder="e.g. Asked about the bus from Jakhal and the fee for two children"
            {...register('note')}
          />
        </Field>
      </FormSection>

      {children}
    </form>
  )
}
