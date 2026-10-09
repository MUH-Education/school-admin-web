import { sampleUsers, type MockUser } from './data/users'

/** In-memory data. A POST changes it, so the next GET shows the change. */
export const db = {
  users: [] as MockUser[],
  otpAttempts: new Map<string, number>(),
  nextUserId: 100,
}

export function resetMockDb(): void {
  db.users = sampleUsers.map((u) => ({ ...u }))
  db.otpAttempts = new Map()
  db.nextUserId = 100
}

resetMockDb()
