import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { z } from 'zod'
import { ApiError } from '@/api/errors'
import { formatLongDate, todayIso } from '@/lib/format'
import { Button } from '@/ui/Button'
import { ChoiceGroup } from '@/ui/ChoiceGroup'
import { ConfirmDialog } from '@/ui/ConfirmDialog'
import { DateInput } from '@/ui/DateInput'
import { DefinitionGrid } from '@/ui/DefinitionGrid'
import { Field } from '@/ui/Field'
import { Panel } from '@/ui/Panel'
import { Select } from '@/ui/Select'
import { TextInput } from '@/ui/TextInput'
import { useToast } from '@/ui/useToast'
import { useUpdateStudent } from '../api'
import { classAndSection } from '../labels'
import {
  classNames,
  genderLabels,
  occupationLabels,
  occupations,
  sections,
  type Occupation,
  type Student,
  type StudentUpdateBody,
} from '../types'

const schema = z.object({
  name: z.string().trim().min(1, 'Enter the name.'),
  dateOfBirth: z.string().min(1, 'Enter the date of birth.'),
  gender: z.enum(['BOY', 'GIRL']),
  className: z.enum(classNames),
  section: z.string(),
  village: z.string().trim().min(1, 'Enter the village or locality.'),
  address: z.string(),
  fatherOccupation: z.string(),
})
type FormValues = z.infer<typeof schema>
const knownFields = [
  'name',
  'dateOfBirth',
  'gender',
  'className',
  'section',
  'village',
  'address',
  'fatherOccupation',
] as const

const heading = <h2 className="text-[17px] font-semibold">Student details</h2>

interface Props {
  student: Student
  canEdit: boolean
  editing: boolean
  onEdit: () => void
  onClose: () => void
}

/** The details in view state; "Edit" turns the box into a form. */
export function DetailsBox({ student, canEdit, editing, onEdit, onClose }: Props) {
  if (editing && canEdit) return <DetailsForm student={student} onClose={onClose} />
  return (
    <Panel aria-label="Student details" className="flex flex-col gap-4 px-6 pt-[22px] pb-6">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        {heading}
        {canEdit && (
          <Button variant="secondary" onClick={onEdit}>
            Edit
          </Button>
        )}
      </div>
      <DefinitionGrid
        items={[
          { label: 'Date of birth', value: formatLongDate(student.dateOfBirth) },
          { label: 'Gender', value: genderLabels[student.gender] },
          {
            label: 'Class and section',
            value: classAndSection(student.className, student.section),
          },
          { label: 'Village or locality', value: student.village },
          { label: 'Address', value: student.address ?? 'Not given' },
          {
            label: "Father's occupation",
            value: student.fatherOccupation
              ? occupationLabels[student.fatherOccupation]
              : 'Not given',
          },
        ]}
      />
    </Panel>
  )
}

function DetailsForm({ student, onClose }: { student: Student; onClose: () => void }) {
  const toast = useToast()
  const navigate = useNavigate()
  const update = useUpdateStudent(student.id)
  const [serverError, setServerError] = useState<string | null>(null)
  const [leftOn, setLeftOn] = useState(todayIso())
  const [confirmingLeft, setConfirmingLeft] = useState(false)

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: student.name,
      dateOfBirth: student.dateOfBirth,
      gender: student.gender,
      className: student.className,
      section: student.section ?? '',
      village: student.village,
      address: student.address ?? '',
      fatherOccupation: student.fatherOccupation ?? '',
    },
  })

  function bodyFrom(values: FormValues): StudentUpdateBody {
    return {
      name: values.name.trim(),
      dateOfBirth: values.dateOfBirth,
      gender: values.gender,
      className: values.className,
      section: values.section || null,
      village: values.village.trim(),
      address: values.address.trim() || null,
      fatherOccupation: (values.fatherOccupation || null) as Occupation | null,
    }
  }

  function fail(error: unknown) {
    if (!(error instanceof ApiError)) {
      setServerError('Something went wrong. Try again.')
      return
    }
    const names = knownFields.filter((name) => error.fields[name])
    for (const name of names) setError(name, { message: error.fields[name] })
    if (names.length === 0) setServerError(error.message)
  }

  async function save(values: FormValues) {
    setServerError(null)
    try {
      await update.mutateAsync(bodyFrom(values))
      toast.show('Details saved')
      onClose()
    } catch (error) {
      fail(error)
    }
  }

  /** Marks the child as left with the details as they are saved, not as they are typed. */
  async function markLeft() {
    setServerError(null)
    try {
      await update.mutateAsync({
        name: student.name,
        dateOfBirth: student.dateOfBirth,
        gender: student.gender,
        className: student.className,
        section: student.section,
        village: student.village,
        address: student.address,
        fatherOccupation: student.fatherOccupation,
        leftOn,
      })
      toast.show(`${student.name} is marked as left the school`)
      void navigate('/students')
    } catch (error) {
      setConfirmingLeft(false)
      fail(error)
    }
  }

  return (
    <Panel aria-label="Student details" className="border-2! border-canal! px-6 pt-[22px] pb-6">
      <form
        noValidate
        aria-label="Edit student details"
        onSubmit={(event) => void handleSubmit(save)(event)}
        className="flex flex-col gap-4"
      >
        {heading}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(220px,100%),1fr))] gap-x-5 gap-y-4">
          <Field compact label="Student name" error={errors.name?.message}>
            <TextInput {...register('name')} />
          </Field>
          <Field compact label="Date of birth" error={errors.dateOfBirth?.message}>
            <DateInput {...register('dateOfBirth')} />
          </Field>
          <Field compact label="Class" error={errors.className?.message}>
            <Select {...register('className')}>
              {classNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </Select>
          </Field>
          <Field compact label="Section" error={errors.section?.message}>
            <Select {...register('section')}>
              <option value="">No section</option>
              {sections.map((section) => (
                <option key={section} value={section}>
                  {section}
                </option>
              ))}
            </Select>
          </Field>
          <Field compact label="Village or locality" error={errors.village?.message}>
            <TextInput {...register('village')} />
          </Field>
          <Field compact label="Address" error={errors.address?.message}>
            <TextInput {...register('address')} />
          </Field>
          <Field compact label="Father's occupation" error={errors.fatherOccupation?.message}>
            <Select {...register('fatherOccupation')}>
              <option value="">Not given</option>
              {occupations.map((code) => (
                <option key={code} value={code}>
                  {occupationLabels[code]}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Controller
          control={control}
          name="gender"
          render={({ field }) => (
            <ChoiceGroup
              legend="Gender"
              value={field.value}
              onChange={field.onChange}
              choices={[
                { value: 'GIRL', label: genderLabels.GIRL },
                { value: 'BOY', label: genderLabels.BOY },
              ]}
            />
          )}
        />

        {serverError && (
          <p role="alert" className="border border-bad bg-bad-soft p-3 font-semibold text-bad">
            {serverError}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2.5">
          <Button type="submit" saving={update.isPending} className="min-h-12 px-[22px]">
            Save
          </Button>
          <Button variant="plain" onClick={onClose} className="min-h-12">
            Cancel
          </Button>
        </div>

        <div className="flex flex-col gap-3 border-t border-rule pt-4">
          <h3 className="text-[15.5px] font-semibold">Left the school?</h3>
          <p className="text-[13.5px] text-ink-soft">
            Use this when the child has left. The child leaves the student list and the bus seat is
            given back. The change history keeps everything.
          </p>
          <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
            <div className="w-full max-w-[220px]">
              <Field compact label="Last day at school">
                <DateInput value={leftOn} onChange={(event) => setLeftOn(event.target.value)} />
              </Field>
            </div>
            <Button
              variant="danger"
              className="min-h-12"
              disabled={!leftOn}
              onClick={() => setConfirmingLeft(true)}
            >
              Mark as left the school
            </Button>
          </div>
        </div>
      </form>
      <ConfirmDialog
        open={confirmingLeft}
        title={`Mark ${student.name} as left the school?`}
        message={`The last day is ${leftOn ? formatLongDate(leftOn) : 'not chosen'}. The child leaves the student list and the bus seat is given back.`}
        confirmLabel="Mark as left"
        danger
        saving={update.isPending}
        onConfirm={() => void markLeft()}
        onCancel={() => setConfirmingLeft(false)}
      />
    </Panel>
  )
}
