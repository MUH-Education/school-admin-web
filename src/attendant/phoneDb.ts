import { deleteDB, openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { AuthUser } from '@/auth/types'
import type { Manifest, Tap, TapProblem } from './types'

// The only things the phone keeps (docs/07-attendant-offline.md): today's manifest, the taps the
// server has not confirmed, the taps the server refused, and who is logged in (so the app can open
// with no network). No parents' phone numbers, no photos.

const DB_NAME = 'school-bus'

export interface PhoneDb extends DBSchema {
  manifest: { key: string; value: Manifest }
  /** One unsent tap for each child, event and day. The key says which (see tapKey). */
  tapQueue: { key: string; value: Tap }
  tapProblems: { key: string; value: TapProblem }
  session: { key: string; value: AuthUser }
}

let opening: Promise<IDBPDatabase<PhoneDb>> | null = null

export function phoneDb(): Promise<IDBPDatabase<PhoneDb>> {
  opening ??= openDB<PhoneDb>(DB_NAME, 1, {
    upgrade(db) {
      db.createObjectStore('manifest')
      db.createObjectStore('tapQueue')
      db.createObjectStore('tapProblems', { keyPath: 'id' })
      db.createObjectStore('session')
    },
  })
  return opening
}

/** For tests: forget everything. */
export async function resetPhoneDb(): Promise<void> {
  if (opening) (await opening).close()
  opening = null
  await deleteDB(DB_NAME)
}
