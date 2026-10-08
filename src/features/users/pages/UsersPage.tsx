import { useState } from 'react'
import { roleLabel } from '@/auth/roles'
import { Button } from '@/ui/Button'
import { DataTable, type Column } from '@/ui/DataTable'
import { EmptyState } from '@/ui/EmptyState'
import { ErrorState } from '@/ui/ErrorState'
import { LoadingBlock } from '@/ui/LoadingBlock'
import { PageHeader } from '@/ui/PageHeader'
import { StatusDot } from '@/ui/StatusDot'
import { useRoles, useUsers } from '../api'
import { MenuExamples } from '../components/MenuExamples'
import { RoleTable } from '../components/RoleTable'
import { UserFormDialog } from '../components/UserFormDialog'
import type { User } from '../types'

type DialogState = { kind: 'closed' } | { kind: 'add' } | { kind: 'edit'; user: User }

export function UsersPage() {
  const users = useUsers()
  const roles = useRoles()
  const [dialog, setDialog] = useState<DialogState>({ kind: 'closed' })

  const header = (
    <PageHeader
      label="Settings · Who can open what"
      title="Users and roles"
      description="A role decides which pages a person can open. Each person gets one role. Only the owner can change this page."
      action={roles.data && <Button onClick={() => setDialog({ kind: 'add' })}>Add user</Button>}
    />
  )

  if (users.isPending || roles.isPending) {
    return (
      <>
        {header}
        <LoadingBlock />
      </>
    )
  }
  if (users.isError || roles.isError) {
    return (
      <>
        {header}
        <ErrorState
          error={users.error ?? roles.error}
          onRetry={() => {
            void users.refetch()
            void roles.refetch()
          }}
        />
      </>
    )
  }

  const columns: Column<User>[] = [
    { header: 'Name', cell: (u) => <span className="font-semibold">{u.name ?? '—'}</span> },
    { header: 'Mobile number', cell: (u) => u.phone, mono: true },
    { header: 'Role', cell: (u) => roleLabel(u.role) },
    { header: 'Route', cell: (u) => u.route ?? '—' },
    {
      header: 'Login',
      cell: (u) =>
        u.active ? (
          <StatusDot tone="good">On</StatusDot>
        ) : (
          <StatusDot tone="muted">Turned off</StatusDot>
        ),
    },
    {
      header: 'Edit',
      headerHidden: true,
      cell: (u) => (
        <button
          type="button"
          onClick={() => setDialog({ kind: 'edit', user: u })}
          aria-label={`Edit ${u.name ?? u.phone}`}
          className="cursor-pointer text-canal underline"
        >
          Edit
        </button>
      ),
    },
  ]

  return (
    <>
      {header}
      <RoleTable roles={roles.data} />
      <MenuExamples />
      <section aria-label="Users" className="flex flex-col gap-2.5">
        <h2 className="text-[15px] font-semibold">People with a login</h2>
        {users.data.length === 0 ? (
          <EmptyState
            title="No logins yet"
            hint="Press Add user to give the first person a login."
          />
        ) : (
          <DataTable
            caption="People with a login"
            columns={columns}
            rows={users.data}
            getRowKey={(u) => u.id}
          />
        )}
        <p className="text-[12.5px] text-ink-soft">
          {users.data.length} logins. When a person leaves the school, turn the login off. Do not
          delete it, so old records keep the name.
        </p>
      </section>

      <UserFormDialog
        open={dialog.kind !== 'closed'}
        user={dialog.kind === 'edit' ? dialog.user : undefined}
        roles={roles.data}
        onClose={() => setDialog({ kind: 'closed' })}
      />
    </>
  )
}
