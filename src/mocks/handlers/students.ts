import { http, HttpResponse } from 'msw'
import {
  classNames,
  occupations,
  relations,
  PHOTO_MAX_BYTES,
  PHOTO_TYPES,
  type GuardianCreateBody,
  type GuardianUpdateBody,
  type ImportProblem,
  type ImportResult,
  type StudentListRow,
  type StudentPage,
  type StudentUpdateBody,
  type TransportBody,
  type TransportSaved,
} from '@/features/students/types'
import { formatDate } from '@/lib/format'
import type { MockStudent } from '../data/students'
import { db } from '../db'
import { authorize, errorResponse, wait } from '../http'
import {
  addHistory,
  childrenOnRoute,
  describeTransport,
  enrolmentsOf,
  guardiansOf,
  nextAdmissionNo,
  startEnrolment,
  today,
  stopById,
  studentById,
  tenDigits,
  toEnrolment,
  toGuardian,
  toListRow,
  toStudent,
} from '../studentLogic'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const PAGE_SIZE = 25

/** The name to write in the change history: the person who is logged in. */
function whoIs(user: { name: string | null; phone: string }): string {
  return user.name ?? user.phone
}

function notFound() {
  return errorResponse(404, 'NOT_FOUND', 'This student does not exist.')
}

function validation(fields: Record<string, string>) {
  return errorResponse(400, 'VALIDATION', 'Check the form.', { fields })
}

function matchesQuery(student: MockStudent, q: string): boolean {
  const text = q.trim().toLowerCase()
  if (!text) return true
  if (student.name.toLowerCase().includes(text)) return true
  if (student.admissionNo.toLowerCase().includes(text)) return true
  const digits = text.replace(/\D/g, '')
  return digits.length >= 3 && guardiansOf(student.id).some((g) => g.phone.includes(digits))
}

function filterStudents(url: URL): StudentListRow[] {
  const q = url.searchParams.get('q') ?? ''
  const className = url.searchParams.get('className') ?? ''
  const village = url.searchParams.get('village') ?? ''
  const routeId = Number(url.searchParams.get('routeId')) || null
  const bus = url.searchParams.get('bus') ?? ''
  return db.students
    .filter((s) => s.active)
    .filter((s) => matchesQuery(s, q))
    .filter((s) => !className || s.className === className)
    .filter((s) => !village || s.village === village)
    .sort((a, b) => a.name.localeCompare(b.name) || a.id - b.id)
    .map(toListRow)
    .filter((row) => (bus === 'YES' ? row.usesBus : bus === 'NO' ? !row.usesBus : true))
    .filter((row) => {
      if (routeId === null) return true
      const route = db.routes.find((r) => r.id === routeId)
      return route !== undefined && row.route === route.name
    })
}

function checkDetails(body: Partial<StudentUpdateBody>): Record<string, string> {
  const fields: Record<string, string> = {}
  if (!body.name?.trim()) fields.name = 'Enter the name.'
  if (!ISO_DATE.test(body.dateOfBirth ?? '')) fields.dateOfBirth = 'Enter the date of birth.'
  if (body.gender !== 'BOY' && body.gender !== 'GIRL') fields.gender = 'Pick boy or girl.'
  if (!classNames.includes(body.className as (typeof classNames)[number]))
    fields.className = 'Pick a class.'
  if (!body.village?.trim()) fields.village = 'Enter the village or locality.'
  if (body.fatherOccupation && !occupations.includes(body.fatherOccupation))
    fields.fatherOccupation = 'Pick an occupation.'
  if (body.leftOn && !ISO_DATE.test(body.leftOn)) fields.leftOn = 'Enter the date.'
  return fields
}

interface UploadedFile {
  type: string
  size: number
  text: () => Promise<string>
  arrayBuffer: () => Promise<ArrayBuffer>
}

/** Reads the uploaded file of a multipart request. */
async function readFile(request: Request): Promise<UploadedFile | null> {
  try {
    const file = (await request.formData()).get('file')
    // Not `instanceof Blob`: in the tests the page and the server use two different Blob classes.
    return typeof file === 'object' && file !== null && 'arrayBuffer' in file ? file : null
  } catch {
    return null
  }
}

function checkImportLine(cells: string[]): string | null {
  const [name, dob, gender, className, , village, fatherName, phone] = cells.map((c) => c.trim())
  if (!name) return 'name is empty'
  if (!ISO_DATE.test(dob ?? '')) return 'date of birth must look like 2017-03-12'
  if (gender !== 'BOY' && gender !== 'GIRL') return 'gender must be BOY or GIRL'
  if (!classNames.includes(className as (typeof classNames)[number]))
    return `class "${className ?? ''}" is not known`
  if (!village) return 'village is empty'
  if (!fatherName) return "father's name is empty"
  const digits = (phone ?? '').replace(/\D/g, '')
  if (digits.length !== 10) return `phone has ${digits.length} digits`
  if (!tenDigits(digits)) return 'phone must start with 6, 7, 8 or 9'
  return null
}

export const studentHandlers = [
  http.get('/api/v1/students', async ({ request }) => {
    await wait()
    const me = authorize(request, 'STUDENTS_VIEW')
    if (me instanceof Response) return me
    const url = new URL(request.url)
    const rows = filterStudents(url)
    const requested = Number(url.searchParams.get('page'))
    const page = Number.isInteger(requested) && requested > 0 ? requested : 1
    const body: StudentPage = {
      items: rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
      page,
      pageSize: PAGE_SIZE,
      total: rows.length,
      usesBus: rows.filter((r) => r.usesBus).length,
      noBus: rows.filter((r) => !r.usesBus).length,
      villages: [...new Set(db.students.filter((s) => s.active).map((s) => s.village))].sort(
        (a, b) => a.localeCompare(b),
      ),
    }
    return HttpResponse.json(body)
  }),

  // Before /students/:id, so "import" is not read as an id.
  http.post('/api/v1/students/import', async ({ request }) => {
    await wait()
    const me = authorize(request, 'STUDENTS_EDIT')
    if (me instanceof Response) return me
    const dryRun = new URL(request.url).searchParams.get('dryRun') === 'true'
    const file = await readFile(request)
    if (!file) {
      return errorResponse(400, 'VALIDATION', 'Choose a CSV file.', {
        fields: { file: 'Choose a CSV file.' },
      })
    }
    const lines = (await file.text()).split(/\r?\n/)
    const problems: ImportProblem[] = []
    const good: string[][] = []
    // Line 1 is the header; the first child is line 2.
    lines.forEach((text, index) => {
      if (index === 0 || text.trim() === '') return
      const cells = text.split(',')
      const message = checkImportLine(cells)
      if (message) problems.push({ line: index + 1, message })
      else good.push(cells.map((c) => c.trim()))
    })
    if (!dryRun) {
      for (const cells of good) {
        const [name, dob, gender, className, section, village, fatherName, phone] = cells
        const id = db.nextStudentId++
        db.students.push({
          id,
          admissionNo: nextAdmissionNo(),
          name: name ?? '',
          dateOfBirth: dob ?? '',
          gender: gender === 'GIRL' ? 'GIRL' : 'BOY',
          className: className as MockStudent['className'],
          section: section || null,
          admissionDate: today(),
          village: village ?? '',
          address: null,
          fatherOccupation: null,
          hasPhoto: false,
          active: true,
          leftOn: null,
        })
        db.guardians.push({
          id: db.nextGuardianId++,
          studentId: id,
          name: fatherName ?? '',
          relation: 'FATHER',
          phone: tenDigits(phone ?? '') ?? '',
          receivesSms: true,
        })
        db.enrolments.push({
          id: db.nextEnrolmentId++,
          studentId: id,
          usesBus: false,
          routeId: null,
          stopId: null,
          fromDate: today(),
          toDate: null,
          busFee: null,
        })
        addHistory(id, 'Added from a sheet', whoIs(me))
      }
    }
    const result: ImportResult = {
      dryRun,
      okLines: good.length,
      skippedLines: problems.length,
      problems,
    }
    return HttpResponse.json(result)
  }),

  http.get('/api/v1/students/:id', async ({ request, params }) => {
    await wait()
    const me = authorize(request, 'STUDENTS_VIEW')
    if (me instanceof Response) return me
    const student = studentById(params.id)
    if (!student) return notFound()
    return HttpResponse.json(toStudent(student))
  }),

  http.put('/api/v1/students/:id', async ({ request, params }) => {
    await wait()
    const me = authorize(request, 'STUDENTS_EDIT')
    if (me instanceof Response) return me
    const student = studentById(params.id)
    if (!student) return notFound()
    const body = (await request.json()) as StudentUpdateBody
    const fields = checkDetails(body)
    if (Object.keys(fields).length > 0) return validation(fields)

    const by = whoIs(me)
    const note = (label: string, before: string, after: string) => {
      if (before !== after)
        addHistory(student.id, `${label} changed from ${before} to ${after}`, by)
    }
    note('Name', student.name, body.name.trim())
    note('Date of birth', formatDate(student.dateOfBirth), formatDate(body.dateOfBirth))
    note('Class', student.className, body.className)
    note('Section', student.section ?? 'none', body.section ?? 'none')
    note('Village', student.village, body.village.trim())
    note('Address', student.address ?? 'empty', body.address?.trim() || 'empty')
    note(
      'Gender',
      student.gender === 'BOY' ? 'Boy' : 'Girl',
      body.gender === 'BOY' ? 'Boy' : 'Girl',
    )
    note("Father's occupation", student.fatherOccupation ?? 'none', body.fatherOccupation ?? 'none')

    student.name = body.name.trim()
    student.dateOfBirth = body.dateOfBirth
    student.gender = body.gender
    student.className = body.className
    student.section = body.section || null
    student.village = body.village.trim()
    student.address = body.address?.trim() || null
    student.fatherOccupation = body.fatherOccupation
    if (body.leftOn) {
      addHistory(student.id, `Marked as left the school on ${formatDate(body.leftOn)}`, by)
      student.leftOn = body.leftOn
      student.active = false
      // A child who left gives the seat back.
      const current = enrolmentsOf(student.id)[0]
      if (current?.usesBus) {
        const place = stopById(current.stopId)
        if (place) place.stop.children = Math.max(0, place.stop.children - 1)
      }
    }
    return HttpResponse.json(toStudent(student))
  }),

  http.post('/api/v1/students/:id/guardians', async ({ request, params }) => {
    await wait()
    const me = authorize(request, 'STUDENTS_EDIT')
    if (me instanceof Response) return me
    const student = studentById(params.id)
    if (!student) return notFound()
    const body = (await request.json()) as GuardianCreateBody
    const fields: Record<string, string> = {}
    if (!body.name?.trim()) fields.name = 'Enter the name.'
    if (!relations.includes(body.relation)) fields.relation = 'Pick the relation.'
    const phone = tenDigits(body.phone ?? '')
    if (!phone) fields.phone = 'Enter a 10-digit mobile number.'
    if (Object.keys(fields).length > 0 || !phone) return validation(fields)

    if (guardiansOf(student.id).some((g) => g.phone === phone)) {
      return errorResponse(
        409,
        'PHONE_ALREADY_LINKED',
        `This number is already saved for ${student.name}.`,
      )
    }
    const created = {
      id: db.nextGuardianId++,
      studentId: student.id,
      name: body.name.trim(),
      relation: body.relation,
      phone,
      receivesSms: Boolean(body.receivesSms),
    }
    db.guardians.push(created)
    addHistory(student.id, `Phone number added for ${created.name}`, whoIs(me))
    return HttpResponse.json(toGuardian(created), { status: 201 })
  }),

  http.put('/api/v1/students/:id/guardians/:guardianId', async ({ request, params }) => {
    await wait()
    const me = authorize(request, 'STUDENTS_EDIT')
    if (me instanceof Response) return me
    const student = studentById(params.id)
    if (!student) return notFound()
    const guardian = guardiansOf(student.id).find((g) => g.id === Number(params.guardianId))
    if (!guardian) return errorResponse(404, 'NOT_FOUND', 'This phone number does not exist.')
    const body = (await request.json()) as GuardianUpdateBody
    const fields: Record<string, string> = {}
    if (!body.name?.trim()) fields.name = 'Enter the name.'
    if (!relations.includes(body.relation)) fields.relation = 'Pick the relation.'
    if (Object.keys(fields).length > 0) return validation(fields)
    guardian.name = body.name.trim()
    guardian.relation = body.relation
    guardian.receivesSms = Boolean(body.receivesSms)
    addHistory(student.id, `Phone number of ${guardian.name} changed`, whoIs(me))
    return HttpResponse.json(toGuardian(guardian))
  }),

  http.delete('/api/v1/students/:id/guardians/:guardianId', async ({ request, params }) => {
    await wait()
    const me = authorize(request, 'STUDENTS_EDIT')
    if (me instanceof Response) return me
    const student = studentById(params.id)
    if (!student) return notFound()
    const all = guardiansOf(student.id)
    const guardian = all.find((g) => g.id === Number(params.guardianId))
    if (!guardian) return errorResponse(404, 'NOT_FOUND', 'This phone number does not exist.')
    if (all.length <= 1) {
      return errorResponse(
        409,
        'LAST_GUARDIAN',
        'A child must keep at least one phone number. Add another number first.',
      )
    }
    db.guardians = db.guardians.filter((g) => g.id !== guardian.id)
    addHistory(student.id, `Phone number of ${guardian.name} removed`, whoIs(me))
    return new HttpResponse(null, { status: 204 })
  }),

  http.get('/api/v1/students/:id/transport', async ({ request, params }) => {
    await wait()
    const me = authorize(request, 'STUDENTS_VIEW')
    if (me instanceof Response) return me
    const student = studentById(params.id)
    if (!student) return notFound()
    return HttpResponse.json(enrolmentsOf(student.id).map(toEnrolment))
  }),

  http.put('/api/v1/students/:id/transport', async ({ request, params }) => {
    await wait()
    const me = authorize(request, 'STUDENTS_EDIT')
    if (me instanceof Response) return me
    const student = studentById(params.id)
    if (!student) return notFound()
    const body = (await request.json()) as TransportBody

    const fields: Record<string, string> = {}
    if (!ISO_DATE.test(body.fromDate ?? '')) fields.fromDate = 'Enter the date.'
    if (body.usesBus) {
      if (!body.routeId) fields.routeId = 'Pick a route.'
      if (!body.stopId) fields.stopId = 'Pick a stop.'
      if (typeof body.busFee !== 'number' || body.busFee < 0) fields.busFee = 'Enter the bus fee.'
    }
    if (Object.keys(fields).length > 0) return validation(fields)

    const route = body.usesBus
      ? db.routes.find((r) => r.id === body.routeId && r.active)
      : undefined
    if (body.usesBus && !route) return validation({ routeId: 'Pick a route.' })
    const stop = route?.stops.find((s) => s.id === body.stopId)
    if (body.usesBus && route && !stop) {
      return errorResponse(409, 'STOP_NOT_ON_ROUTE', `That stop is not on ${route.name}.`)
    }

    startEnrolment(student.id, {
      usesBus: Boolean(body.usesBus),
      routeId: route?.id ?? null,
      stopId: stop?.id ?? null,
      fromDate: body.fromDate,
      busFee: body.busFee ?? null,
    })
    addHistory(
      student.id,
      describeTransport(Boolean(body.usesBus), route?.id ?? null, stop?.id ?? null, body.fromDate),
      whoIs(me),
    )

    const answer: TransportSaved = { saved: true }
    if (route) {
      const children = childrenOnRoute(route.id)
      const seats = db.vehicles.find((v) => v.id === route.vehicleId)?.seats ?? 0
      if (children > seats) {
        answer.warning = {
          code: 'ROUTE_FULL',
          message: `${route.name} has ${children} children on ${seats} seats.`,
        }
      }
    }
    return HttpResponse.json(answer)
  }),

  http.get('/api/v1/students/:id/photo', async ({ request, params }) => {
    await wait()
    const me = authorize(request, 'STUDENTS_VIEW')
    if (me instanceof Response) return me
    const student = studentById(params.id)
    const photo = student ? db.photos.get(student.id) : undefined
    if (!photo) return errorResponse(404, 'NOT_FOUND', 'This student has no photo.')
    return new HttpResponse(photo.bytes, { headers: { 'Content-Type': photo.type } })
  }),

  http.post('/api/v1/students/:id/photo', async ({ request, params }) => {
    await wait()
    const me = authorize(request, 'STUDENTS_EDIT')
    if (me instanceof Response) return me
    const student = studentById(params.id)
    if (!student) return notFound()
    const file = await readFile(request)
    if (!file) return validation({ file: 'Choose a photo.' })
    if (!PHOTO_TYPES.includes(file.type)) {
      return validation({ file: 'The photo must be a JPEG or PNG picture.' })
    }
    if (file.size > PHOTO_MAX_BYTES) {
      return validation({ file: 'The photo is too big. Choose one under 2 MB.' })
    }
    const bytes = new Uint8Array(await file.arrayBuffer())
    db.photos.set(student.id, { type: file.type, bytes })
    addHistory(student.id, 'Photo added', whoIs(me))
    return new HttpResponse(null, { status: 204 })
  }),

  http.delete('/api/v1/students/:id/photo', async ({ request, params }) => {
    await wait()
    const me = authorize(request, 'STUDENTS_EDIT')
    if (me instanceof Response) return me
    const student = studentById(params.id)
    if (!student) return notFound()
    db.photos.delete(student.id)
    addHistory(student.id, 'Photo removed', whoIs(me))
    return new HttpResponse(null, { status: 204 })
  }),

  http.get('/api/v1/students/:id/history', async ({ request, params }) => {
    await wait()
    const me = authorize(request, 'STUDENTS_VIEW')
    if (me instanceof Response) return me
    const student = studentById(params.id)
    if (!student) return notFound()
    const rows = db.history
      .filter((h) => h.studentId === student.id)
      .sort((a, b) => b.at.localeCompare(a.at) || b.id - a.id)
      .map((h) => ({ id: h.id, at: h.at, text: h.text, by: h.by }))
    return HttpResponse.json(rows)
  }),
]
