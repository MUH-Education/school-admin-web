import { useStudentPhoto } from '../api'
import { initials } from '../labels'

interface Props {
  id: number
  name: string
  hasPhoto: boolean
  /** `small`: 40px in the list. `large`: 104px on the student page. */
  size: 'small' | 'large'
}

const boxes = {
  small: 'size-10 text-[13px]',
  large: 'size-[104px] border border-canal text-[34px]',
}
const pictures = { small: 'size-10', large: 'size-[104px]' }

/** The photo when there is one, else a square with the first letters of the name. */
export function StudentPhoto({ id, name, hasPhoto, size }: Props) {
  const photo = useStudentPhoto(id, hasPhoto)
  if (hasPhoto && photo.data) {
    return (
      <img
        src={photo.data}
        alt={`Photo of ${name}`}
        className={`flex-none object-cover ${pictures[size]}`}
      />
    )
  }
  return (
    <div
      aria-hidden="true"
      className={`flex flex-none items-center justify-center bg-canal-soft font-semibold text-canal ${boxes[size]}`}
    >
      {initials(name)}
    </div>
  )
}
