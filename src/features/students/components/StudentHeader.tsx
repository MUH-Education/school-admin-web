import { useRef, useState } from 'react'
import { ApiError } from '@/api/errors'
import { formatLongDate } from '@/lib/format'
import { Breadcrumb } from '@/ui/Breadcrumb'
import { Button } from '@/ui/Button'
import { ConfirmDialog } from '@/ui/ConfirmDialog'
import { useToast } from '@/ui/useToast'
import { useRemovePhoto, useUploadPhoto } from '../api'
import { longClass } from '../labels'
import { PHOTO_MAX_BYTES, PHOTO_TYPES, type Student } from '../types'
import { StudentPhoto } from './StudentPhoto'

interface Props {
  student: Student
  canEdit: boolean
}

/** Photo, name, class and admission number. The photo can be added, changed and removed. */
export function StudentHeader({ student, canEdit }: Props) {
  const toast = useToast()
  const upload = useUploadPhoto(student.id)
  const remove = useRemovePhoto(student.id)
  const chooser = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)

  async function pick(file: File | undefined) {
    if (!file) return
    // The size is checked here, so a big picture is never sent.
    if (!PHOTO_TYPES.includes(file.type)) {
      setError('Choose a JPEG or PNG picture.')
      return
    }
    if (file.size > PHOTO_MAX_BYTES) {
      setError('The photo is too big. Choose one under 2 MB.')
      return
    }
    setError(null)
    try {
      await upload.mutateAsync(file)
      toast.show('Photo saved')
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Something went wrong. Try again.')
    }
  }

  async function takeOff() {
    try {
      await remove.mutateAsync()
      toast.show('Photo removed')
      setError(null)
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Something went wrong. Try again.')
    } finally {
      setConfirming(false)
    }
  }

  return (
    <header className="flex flex-col gap-4 border-b-2 border-ink pb-5">
      <Breadcrumb items={[{ label: 'Students', to: '/students' }, { label: student.name }]} />
      <div className="flex flex-wrap items-center gap-x-6 gap-y-5">
        <StudentPhoto
          id={student.id}
          name={student.name}
          hasPhoto={student.hasPhoto}
          size="large"
        />
        <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-1.5">
          <h1 className="text-[30px] leading-[1.1] font-bold tracking-[-0.02em]">{student.name}</h1>
          <p className="text-[15px] text-ink-soft">
            {longClass(student.className, student.section)} · Admission number{' '}
            <span className="font-mono">{student.admissionNo}</span> · Joined{' '}
            {formatLongDate(student.admissionDate)}
          </p>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 pt-1.5">
            {canEdit && (
              <>
                <input
                  ref={chooser}
                  type="file"
                  accept="image/jpeg,image/png"
                  aria-label="Photo file"
                  tabIndex={-1}
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    // Clearing the box lets the same file be chosen again.
                    event.target.value = ''
                    void pick(file)
                  }}
                />
                <Button
                  variant="secondary"
                  saving={upload.isPending}
                  onClick={() => chooser.current?.click()}
                >
                  {student.hasPhoto ? 'Change photo' : 'Add a photo'}
                </Button>
                {student.hasPhoto && (
                  <Button variant="plain" onClick={() => setConfirming(true)}>
                    Remove photo
                  </Button>
                )}
              </>
            )}
            <span className="text-[13px] text-ink-soft">
              {student.hasPhoto ? '' : 'No photo yet. '}Only school staff can see the photo.
            </span>
          </div>
          {error && (
            <p role="alert" className="text-[13.5px] font-semibold text-bad">
              {error}
            </p>
          )}
        </div>
      </div>
      <ConfirmDialog
        open={confirming}
        title="Remove the photo?"
        message="The square with the first letters of the name is shown again."
        confirmLabel="Remove photo"
        danger
        saving={remove.isPending}
        onConfirm={() => void takeOff()}
        onCancel={() => setConfirming(false)}
      />
    </header>
  )
}
