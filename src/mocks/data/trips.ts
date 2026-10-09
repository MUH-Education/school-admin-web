import type { EventType, Outcome } from '@/attendant/types'

// All names are made up. Route 4 is the one in the phone designs, with Hindi names and stops.

export const schoolStarts = '08:10'
export const schoolEnds = '14:40'

/** The children of Route 4 are the 19 of BusDetail.dc.html (ids 400 to 418, as on Bus status). */
export const route4StudentIds = { first: 400, last: 418 }

/** Hindi spelling of the stop names and the first names of Route 4 (the phone designs show them). */
export const hindiStopNames: Record<string, string> = {
  Sadhanwas: 'साधनवास',
  Jakhal: 'जाखल',
  Kanheri: 'कन्हेड़ी',
  'Tohana town': 'टोहाना शहर',
}

export const hindiChildNames: Record<string, string> = {
  Mohit: 'मोहित',
  Anjali: 'अंजलि',
  Sahil: 'साहिल',
  Kirti: 'कीर्ति',
  Deepak: 'दीपक',
  Aryan: 'आर्यन',
  Siya: 'सिया',
  Manpreet: 'मनप्रीत',
  Tanvi: 'तन्वी',
  Harsh: 'हर्ष',
  Nikhil: 'निखिल',
  Pooja: 'पूजा',
  Yash: 'यश',
  Simran: 'सिमरन',
  Rohit: 'रोहित',
  Neha: 'नेहा',
  Vivek: 'विवेक',
  Riya: 'रिया',
  Aman: 'अमन',
}

/** What the server has stored for one tap. CLEARED stays, so an older tap cannot bring the answer back. */
export interface MockTapRecord {
  serviceDate: string
  studentId: number
  eventType: EventType
  outcome: Outcome
  occurredAt: string
  /** When the server got it. Tests use it to see that old taps keep their own time. */
  receivedAt: string
}
