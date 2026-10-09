import { useState } from 'react'
import { api } from '@/api/client'
import { sampleUsers } from '@/mocks/data/users'
import { Button } from '@/ui/Button'
import { roleLabel } from './roles'
import type { LoginResponse } from './types'

/** Mock mode only: one button per sample person. This file is not in the production build. */
export default function SampleLogins({ onLogin }: { onLogin: (response: LoginResponse) => void }) {
  const [busy, setBusy] = useState<string | null>(null)

  async function loginAs(phone: string) {
    setBusy(phone)
    try {
      await api('POST', '/auth/otp/request', { phone })
      onLogin(await api<LoginResponse>('POST', '/auth/otp/verify', { phone, otp: '000000' }))
    } finally {
      setBusy(null)
    }
  }

  return (
    <section aria-label="Sample logins" className="mt-8 border-t border-rule pt-5">
      <h2 className="text-[15px] font-semibold">Sample logins</h2>
      <p className="mb-3 text-[13px] text-ink-soft">Mock mode only. One click, no code needed.</p>
      <div className="flex flex-wrap gap-2">
        {sampleUsers
          .filter((u) => u.active)
          .map((u) => (
            <Button
              key={u.id}
              variant="plain"
              disabled={busy !== null}
              onClick={() => void loginAs(u.phone)}
            >
              {u.name} · {roleLabel(u.role)}
            </Button>
          ))}
      </div>
    </section>
  )
}
