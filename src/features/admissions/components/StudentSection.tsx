import { Controller, type UseFormReturn } from 'react-hook-form'
import { classNames, genderLabels, sections } from '@/features/students/types'
import { ChoiceGroup } from '@/ui/ChoiceGroup'
import { DateInput } from '@/ui/DateInput'
import { Field } from '@/ui/Field'
import { FormGrid, FormSection } from '@/ui/FormSection'
import { Select } from '@/ui/Select'
import { TextInput } from '@/ui/TextInput'
import type { AdmissionValues } from '../form'

/** Part 1: the child who is joining. */
export function StudentSection({ form }: { form: UseFormReturn<AdmissionValues> }) {
  const {
    register,
    control,
    formState: { errors },
  } = form
  return (
    <FormSection title="1. Student" description="The child who is joining.">
      <FormGrid>
        <Field label="Student name *" error={errors.name?.message}>
          <TextInput autoComplete="off" {...register('name')} />
        </Field>
        <Field label="Date of birth *" error={errors.dateOfBirth?.message}>
          <DateInput {...register('dateOfBirth')} />
        </Field>
        <Field label="Class *" error={errors.className?.message}>
          <Select {...register('className')}>
            <option value="">Pick a class</option>
            {classNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Section" error={errors.section?.message}>
          <Select {...register('section')}>
            <option value="">No section</option>
            {sections.map((section) => (
              <option key={section} value={section}>
                {section}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Admission date" error={errors.admissionDate?.message}>
          <DateInput {...register('admissionDate')} />
        </Field>
        <div className="flex flex-col gap-2">
          <div className="text-[15px] font-semibold">Admission number</div>
          <div className="min-h-12 border border-dashed border-rule-strong bg-paper px-3.5 py-3 text-[15px] text-ink-soft">
            Given automatically when you save
          </div>
        </div>
      </FormGrid>
      <div className="flex flex-col gap-2">
        <Controller
          control={control}
          name="gender"
          render={({ field }) => (
            <ChoiceGroup
              legend="Gender *"
              value={field.value as 'GIRL' | 'BOY' | ''}
              onChange={field.onChange}
              choices={[
                { value: 'GIRL', label: genderLabels.GIRL },
                { value: 'BOY', label: genderLabels.BOY },
              ]}
            />
          )}
        />
        {errors.gender?.message && (
          <p role="alert" className="text-[13px] font-semibold text-bad">
            {errors.gender.message}
          </p>
        )}
      </div>
    </FormSection>
  )
}
