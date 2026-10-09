import { api, setToken } from '@/api/client'
import type { AdmissionResult } from '@/features/admissions/types'
import type { LoadBoardRow } from '@/features/routes/types'
import type {
  Guardian,
  HistoryEntry,
  Student,
  StudentPage,
  TransportEnrolment,
  TransportSaved,
} from '@/features/students/types'

function loginAs(userId: number): void {
  setToken(`mock-token-${userId}`)
}
const OWNER = 1
const OFFICE_ADMIN = 2
const TRANSPORT = 3
const ADMISSIONS = 4

const ISHAAN = 1
const ARYAN = 2
const SIYA = 3

describe('mock students', () => {
  it('has about 60 students on 9 routes, Ishaan without a bus and Aryan with a photo', async () => {
    loginAs(OWNER)
    const page = await api<StudentPage>('GET', '/students')
    expect(page.total).toBeGreaterThanOrEqual(58)
    expect(page.items).toHaveLength(25)
    expect(page.usesBus + page.noBus).toBe(page.total)
    const ishaan = await api<Student>('GET', `/students/${ISHAAN}`)
    expect(ishaan).toMatchObject({
      name: 'Ishaan Sharma',
      admissionNo: 'A-2026-118',
      transport: { usesBus: false },
    })
    expect((await api<Student>('GET', `/students/${ARYAN}`)).hasPhoto).toBe(true)
    const routes = new Set<string>()
    for (let p = 1; p <= 3; p++) {
      const next = await api<StudentPage>('GET', `/students?page=${p}`)
      for (const row of next.items) if (row.route) routes.add(row.route)
    }
    expect(routes.size).toBe(9)
  })

  it('shows a phone as the server masks it', async () => {
    loginAs(OWNER)
    const ishaan = await api<Student>('GET', `/students/${ISHAAN}`)
    expect(ishaan.guardians.map((g) => g.phone)).toEqual(['98XXX XX340', '97XXX XX615'])
  })

  it('filters by name, class, village, bus and route, and pages 25 at a time', async () => {
    loginAs(OWNER)
    expect((await api<StudentPage>('GET', '/students?q=ishaan')).items.map((s) => s.name)).toEqual([
      'Ishaan Sharma',
    ])
    expect((await api<StudentPage>('GET', '/students?q=A-2026-118')).total).toBe(1)
    expect((await api<StudentPage>('GET', '/students?q=98123')).items.length).toBeGreaterThan(0)
    expect(
      (await api<StudentPage>('GET', '/students?village=Jakhal')).items.map((s) => s.village),
    ).toSatisfy((v: string[]) => v.length > 0 && v.every((x) => x === 'Jakhal'))
    expect((await api<StudentPage>('GET', '/students?className=UKG')).total).toBeGreaterThan(0)
    const noBus = await api<StudentPage>('GET', '/students?bus=NO')
    expect(noBus.items.every((s) => !s.usesBus)).toBe(true)
    const route4 = await api<StudentPage>('GET', '/students?routeId=4')
    expect(route4.items.every((s) => s.route === 'Route 4')).toBe(true)
    const page2 = await api<StudentPage>('GET', '/students?page=2')
    expect(page2.page).toBe(2)
    expect(page2.items).toHaveLength(page2.total - 25 > 25 ? 25 : page2.total - 25)
  })

  it('lists the villages for the filter', async () => {
    loginAs(OWNER)
    const { villages } = await api<StudentPage>('GET', '/students')
    expect(villages).toContain('Jakhal')
    expect(villages).toEqual([...villages].sort((a, b) => a.localeCompare(b)))
  })

  it('gives brother and sister one shared phone', async () => {
    loginAs(OWNER)
    const aryan = await api<Student>('GET', `/students/${ARYAN}`)
    const siya = await api<Student>('GET', `/students/${SIYA}`)
    expect(aryan.guardians[0]?.phone).toBe(siya.guardians[0]?.phone)
  })

  it('lets a view-only role read but not change', async () => {
    loginAs(TRANSPORT) // STUDENTS_VIEW only
    expect((await api<StudentPage>('GET', '/students')).total).toBeGreaterThan(0)
    await expect(
      api('POST', `/students/${ISHAAN}/guardians`, {
        name: 'X',
        relation: 'OTHER',
        phone: '9812300000',
        receivesSms: false,
      }),
    ).rejects.toMatchObject({ status: 403 })
    loginAs(OFFICE_ADMIN)
    await expect(api('GET', '/students/9999')).rejects.toMatchObject({ status: 404 })
  })

  it('adds a phone, and refuses the same number twice', async () => {
    loginAs(OFFICE_ADMIN)
    const body = {
      name: 'Ramkumar Sharma',
      relation: 'GRANDFATHER',
      phone: '94 123 45208',
      receivesSms: true,
    }
    const added = await api<Guardian>('POST', `/students/${ISHAAN}/guardians`, body)
    expect(added.phone).toBe('94XXX XX208')
    expect((await api<Student>('GET', `/students/${ISHAAN}`)).guardians).toHaveLength(3)
    await expect(api('POST', `/students/${ISHAAN}/guardians`, body)).rejects.toMatchObject({
      status: 409,
      code: 'PHONE_ALREADY_LINKED',
    })
    await expect(
      api('POST', `/students/${ISHAAN}/guardians`, { ...body, phone: '12345' }),
    ).rejects.toMatchObject({ status: 400, fields: { phone: expect.any(String) } })
  })

  it('refuses to remove the last phone with LAST_GUARDIAN', async () => {
    loginAs(OFFICE_ADMIN)
    const mohit = (await api<StudentPage>('GET', '/students?q=Mohit')).items[0]
    const student = await api<Student>('GET', `/students/${mohit?.id}`)
    expect(student.guardians).toHaveLength(1)
    await expect(
      api('DELETE', `/students/${student.id}/guardians/${student.guardians[0]?.id}`),
    ).rejects.toMatchObject({ status: 409, code: 'LAST_GUARDIAN' })
    // Ishaan has two numbers, so one can go.
    const ishaan = await api<Student>('GET', `/students/${ISHAAN}`)
    await api('DELETE', `/students/${ISHAAN}/guardians/${ishaan.guardians[1]?.id}`)
    expect((await api<Student>('GET', `/students/${ISHAAN}`)).guardians).toHaveLength(1)
  })

  it('starts the bus later and warns when the route is full, but saves', async () => {
    loginAs(OFFICE_ADMIN)
    const before = (await api<LoadBoardRow[]>('GET', '/routes/load-board')).find(
      (r) => r.routeId === 9,
    )
    expect(before).toMatchObject({ children: 45, seats: 26 })
    const route9 = await api<{ stops: { id: number }[] }>('GET', '/routes/9')
    const answer = await api<TransportSaved>('PUT', `/students/${ISHAAN}/transport`, {
      usesBus: true,
      routeId: 9,
      stopId: route9.stops[0]?.id,
      fromDate: '2026-11-02',
      busFee: 4000,
    })
    expect(answer.saved).toBe(true)
    expect(answer.warning).toMatchObject({
      code: 'ROUTE_FULL',
      message: 'Route 9 has 46 children on 26 seats.',
    })
    const ishaan = await api<Student>('GET', `/students/${ISHAAN}`)
    expect(ishaan.transport.usesBus).toBe(false)
    expect(ishaan.upcomingTransport).toMatchObject({ route: 'Route 9', since: '2026-11-02' })
    const history = await api<TransportEnrolment[]>('GET', `/students/${ISHAAN}/transport`)
    expect(history).toHaveLength(2)
    const after = (await api<LoadBoardRow[]>('GET', '/routes/load-board')).find(
      (r) => r.routeId === 9,
    )
    expect(after?.children).toBe(46)
  })

  it('does not warn for a route with room, and refuses a stop of another route', async () => {
    loginAs(OWNER)
    // Every sample route is over its seats, so make a new route with a new van.
    const van = await api<{ id: number }>('POST', '/vehicles', {
      name: 'Van 10',
      registrationNo: 'HR 23 XX 1110',
      vehicleType: 'SMALL_VAN',
      seats: 14,
      monthlyCost: 30300,
    })
    const roomy = await api<{ id: number }>('POST', '/routes', {
      name: 'Route 10',
      vehicleId: van.id,
    })
    const withStop = await api<{ stops: { id: number }[] }>('PUT', `/routes/${roomy.id}/stops`, [
      { name: 'Ratia', morningTime: '07:30' },
    ])
    const route2 = await api<{ stops: { id: number }[] }>('GET', '/routes/2')
    const ok = await api<TransportSaved>('PUT', `/students/${ISHAAN}/transport`, {
      usesBus: true,
      routeId: roomy.id,
      stopId: withStop.stops[0]?.id,
      fromDate: '2026-10-07',
      busFee: 8800,
    })
    expect(ok.warning).toBeUndefined()
    await expect(
      api('PUT', `/students/${ISHAAN}/transport`, {
        usesBus: true,
        routeId: roomy.id,
        stopId: route2.stops[0]?.id,
        fromDate: '2026-10-07',
        busFee: 8800,
      }),
    ).rejects.toMatchObject({ status: 409, code: 'STOP_NOT_ON_ROUTE' })
  })

  it('stops the bus with only a date', async () => {
    loginAs(OFFICE_ADMIN)
    await api('PUT', `/students/${ARYAN}/transport`, { usesBus: false, fromDate: '2026-12-01' })
    const aryan = await api<Student>('GET', `/students/${ARYAN}`)
    expect(aryan.upcomingTransport).toMatchObject({ usesBus: false, since: '2026-12-01' })
  })

  it('changes details and writes the change history, newest first', async () => {
    loginAs(OFFICE_ADMIN)
    const ishaan = await api<Student>('GET', `/students/${ISHAAN}`)
    await api('PUT', `/students/${ISHAAN}`, {
      name: ishaan.name,
      dateOfBirth: ishaan.dateOfBirth,
      gender: ishaan.gender,
      className: 'Class 5',
      section: 'A',
      village: ishaan.village,
      address: ishaan.address,
      fatherOccupation: ishaan.fatherOccupation,
    })
    const history = await api<HistoryEntry[]>('GET', `/students/${ISHAAN}/history`)
    expect(history[0]?.text).toBe('Class changed from Class 4 to Class 5')
    expect(history[0]?.by).toBe('Neelam')
    expect(history.map((h) => h.text)).toContain('Section changed from B to A')
    await expect(
      api('PUT', `/students/${ISHAAN}`, { ...ishaan, name: '', section: 'A' }),
    ).rejects.toMatchObject({ status: 400, fields: { name: expect.any(String) } })
  })

  it('marks a child as left, and the child leaves the list', async () => {
    loginAs(OFFICE_ADMIN)
    const ishaan = await api<Student>('GET', `/students/${ISHAAN}`)
    await api('PUT', `/students/${ISHAAN}`, { ...ishaan, leftOn: '2026-10-07' })
    expect((await api<StudentPage>('GET', '/students?q=Ishaan')).total).toBe(0)
    await expect(api('GET', `/students/${ISHAAN}`)).rejects.toMatchObject({ status: 404 })
  })

  it('removes the photo', async () => {
    loginAs(OFFICE_ADMIN)
    await api('DELETE', `/students/${ARYAN}/photo`)
    expect((await api<Student>('GET', `/students/${ARYAN}`)).hasPhoto).toBe(false)
  })
})

describe('mock admissions', () => {
  const base = {
    name: 'Kavya Goyal',
    dateOfBirth: '2021-08-14',
    gender: 'GIRL',
    className: 'UKG',
    village: 'Tohana town',
    fatherOccupation: 'SHOPKEEPER_TRADER',
    fatherName: 'Rakesh Goyal',
    fatherPhone: '9812300771',
    usesBus: false,
  }

  it('admits a child with no bus and gives the next number', async () => {
    loginAs(ADMISSIONS)
    const result = await api<AdmissionResult>('POST', '/admissions', base)
    expect(result.admissionNo).toBe('A-2026-119')
    const student = await api<Student>('GET', `/students/${result.studentId}`)
    expect(student).toMatchObject({ name: 'Kavya Goyal', transport: { usesBus: false } })
    expect(student.guardians).toHaveLength(1)
    const second = await api<AdmissionResult>('POST', '/admissions', { ...base, name: 'Other' })
    expect(second.admissionNo).toBe('A-2026-120')
  })

  it('returns field errors in the body', async () => {
    loginAs(ADMISSIONS)
    await expect(
      api('POST', '/admissions', { ...base, name: '', fatherPhone: '123' }),
    ).rejects.toMatchObject({
      status: 400,
      fields: { name: expect.any(String), fatherPhone: expect.any(String) },
    })
  })

  it('copies the parents of a brother or sister', async () => {
    loginAs(ADMISSIONS)
    const result = await api<AdmissionResult>('POST', '/admissions', {
      name: 'Younger Punia',
      dateOfBirth: '2022-01-01',
      gender: 'BOY',
      className: 'LKG',
      village: 'Jakhal',
      fatherOccupation: 'FARMER_LARGE',
      siblingStudentId: ARYAN,
      usesBus: false,
    })
    const student = await api<Student>('GET', `/students/${result.studentId}`)
    expect(student.guardians.map((g) => g.name)).toEqual(['Rajender Punia'])
  })

  it('admits onto a full route with a warning', async () => {
    loginAs(ADMISSIONS)
    // The Admissions desk has ROUTES_VIEW (decision of 9 Oct 2026), so it can list the stops.
    const route9 = await api<{ stops: { id: number }[] }>('GET', '/routes/9')
    const result = await api<AdmissionResult>('POST', '/admissions', {
      ...base,
      usesBus: true,
      routeId: 9,
      stopId: route9.stops[0]?.id,
    })
    expect(result.warning?.code).toBe('ROUTE_FULL')
  })

  it('needs the ADMISSIONS_CREATE permission', async () => {
    loginAs(TRANSPORT)
    await expect(api('POST', '/admissions', base)).rejects.toMatchObject({ status: 403 })
  })
})

describe('mock import', () => {
  const csv = [
    'name,dateOfBirth,gender,className,section,village,fatherName,fatherPhone',
    'Meera Dalal,2016-04-05,GIRL,Class 5,A,Jakhal,Ajit Dalal,9812311111',
    'Bad Phone,2016-04-05,BOY,Class 5,A,Jakhal,Ajit Dalal,981231111',
    'Sonu Dalal,2016-04-05,BOY,Class 5,A,Jakhal,Ajit Dalal,9812322222',
  ].join('\n')

  function upload(dryRun: boolean) {
    const form = new FormData()
    form.append('file', new File([csv], 'students.csv', { type: 'text/csv' }))
    return fetch(
      `${import.meta.env.VITE_API_BASE}/students/import${dryRun ? '?dryRun=true' : ''}`,
      { method: 'POST', body: form, headers: { Authorization: 'Bearer mock-token-2' } },
    ).then((r) => r.json())
  }

  it('checks without saving, and lists the problem lines', async () => {
    const result = await upload(true)
    expect(result).toMatchObject({
      dryRun: true,
      okLines: 2,
      skippedLines: 1,
      problems: [{ line: 3, message: 'phone has 9 digits' }],
    })
    loginAs(OFFICE_ADMIN)
    expect((await api<StudentPage>('GET', '/students?q=Meera')).total).toBe(0)
  })

  it('saves the good lines', async () => {
    await upload(false)
    loginAs(OFFICE_ADMIN)
    expect((await api<StudentPage>('GET', '/students?q=Meera')).total).toBe(1)
    expect((await api<StudentPage>('GET', '/students?q=Bad Phone')).total).toBe(0)
  })
})
