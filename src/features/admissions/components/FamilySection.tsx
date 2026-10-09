import { type UseFormReturn, useWatch } from 'react-hook-form'
import { occupationLabels, occupations } from '@/features/students/types'
import { Checkbox } from '@/ui/Checkbox'
import { Field } from '@/ui/Field'
import { FormGrid, FormSection } from '@/ui/FormSection'
import { PhoneInput } from '@/ui/PhoneInput'
import { Select } from '@/ui/Select'
import { TextInput } from '@/ui/TextInput'
import type { AdmissionValues } from '../form'
import { SiblingPicker } from './SiblingPicker'

/** Part 2: parents, phone numbers, where they live. */
export function FamilySection({ form }: { form: UseFormReturn<AdmissionValues> }) {
  const {
    register,
    control,
    setValue,
    clearErrors,
    formState: { errors },
  } = form
  const siblingId = useWatch({ control, name: 'siblingStudentId' })
  const siblingName = useWatch({ control, name: 'siblingName' })
  const copied = siblingId !== null

  return (
    <FormSection
      title="2. Family"
      description="Parents, phone numbers and where they live. Occupation and village feed the Analytics page."
    >
      <FormGrid>
        {!copied && (
          <>
            <Field label="Father's name *" error={errors.fatherName?.message}>
              <TextInput autoComplete="off" {...register('fatherName')} />
            </Field>
            <Field label="Father's phone *" error={errors.fatherPhone?.message}>
              <PhoneInput {...register('fatherPhone')} />
            </Field>
            <Field label="Mother's name" error={errors.motherName?.message}>
              <TextInput autoComplete="off" {...register('motherName')} />
            </Field>
            <Field label="Mother's phone" error={errors.motherPhone?.message}>
              <PhoneInput {...register('motherPhone')} />
            </Field>
          </>
        )}
        <Field label="Father's occupation *" error={errors.fatherOccupation?.message}>
          <Select {...register('fatherOccupation')}>
            <option value="">Pick an occupation</option>
            {occupations.map((code) => (
              <option key={code} value={code}>
                {occupationLabels[code]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Village or locality *" error={errors.village?.message}>
          <TextInput autoComplete="off" {...register('village')} />
        </Field>
      </FormGrid>
      <Field label="Address" error={errors.address?.message}>
        <TextInput autoComplete="off" {...register('address')} />
      </Field>

      <SiblingPicker
        picked={copied ? { id: siblingId, name: siblingName } : null}
        error={errors.siblingStudentId?.message}
        onPick={(student) => {
          setValue('siblingStudentId', student.id, { shouldDirty: true })
          setValue('siblingName', student.name, { shouldDirty: true })
          // The hidden parent boxes are not checked, so their old mistakes go away.
          clearErrors(['fatherName', 'fatherPhone', 'motherName', 'motherPhone'])
        }}
        onClear={() => {
          setValue('siblingStudentId', null, { shouldDirty: true })
          setValue('siblingName', '', { shouldDirty: true })
        }}
      />

      {!copied && (
        <fieldset className="m-0 border-0 p-0">
          <legend className="mb-2.5 p-0 text-[15px] font-semibold">Send bus SMS to</legend>
          <div className="flex flex-wrap gap-3">
            <Checkbox boxed label="Father's phone" {...register('smsToFather')} />
            <Checkbox boxed label="Mother's phone" {...register('smsToMother')} />
          </div>
        </fieldset>
      )}
    </FormSection>
  )
}
