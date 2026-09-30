import { useState, type FormEvent } from 'react'
import { usersApi } from '../api/client'
import type { Role, User } from '../api/types'
import { PageHeader } from '../components/layout/AppLayout'
import { Button } from '../components/ui/Button'
import { Chip } from '../components/ui/Chip'
import { Dialog, DialogContent, DialogTrigger } from '../components/ui/Dialog'
import { Alert } from '../components/ui/Feedback'
import { Field, Select } from '../components/ui/Field'
import { Icon } from '../components/ui/Icons'
import { Table, type Column } from '../components/ui/Table'
import { formatDate } from '../lib/format'
import { useAsync } from '../lib/useAsync'

export function UsersPage() {
  const [createOpen, setCreateOpen] = useState(false)
  const { data: users, loading, error, reload } = useAsync((signal) => usersApi.list(signal), [])

  async function toggleActive(user: User) {
    await usersApi.update(user.id, { is_active: !user.is_active })
    reload()
  }

  async function changeRole(user: User, role: Role) {
    await usersApi.update(user.id, { role })
    reload()
  }

  const columns: Column<User>[] = [
    { id: 'name', header: 'Name', cell: (u) => <span className="font-semibold">{u.name}</span> },
    { id: 'email', header: 'Email', cell: (u) => u.email },
    {
      id: 'role',
      header: 'Role',
      cell: (u) => (
        <Select value={u.role} onChange={(event) => changeRole(u, event.target.value as Role)} className="h-8 w-32 text-[13px]" aria-label={`Role for ${u.name}`}>
          <option value="client">client</option>
          <option value="operator">operator</option>
          <option value="admin">admin</option>
        </Select>
      ),
    },
    { id: 'created', header: 'Created', cell: (u) => formatDate(u.created_at) },
    { id: 'status', header: 'Status', cell: (u) => <Chip tone={u.is_active ? 'ok' : 'neutral'}>{u.is_active ? 'Active' : 'Inactive'}</Chip> },
    {
      id: 'actions',
      header: '',
      className: 'text-right',
      cell: (u) => (
        <Button variant="secondary" size="sm" onClick={() => toggleActive(u)}>
          {u.is_active ? 'Deactivate' : 'Activate'}
        </Button>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Users"
        lead="Create accounts and manage roles."
        actions={
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Icon.Plus className="h-4 w-4" />
                New user
              </Button>
            </DialogTrigger>
            <DialogContent title="New user" description="They can sign in immediately with the password you set here.">
              <CreateUserForm
                onCreated={() => {
                  setCreateOpen(false)
                  reload()
                }}
              />
            </DialogContent>
          </Dialog>
        }
      />
      {error && <Alert className="mb-4">{error}</Alert>}
      <Table columns={columns} data={users ?? []} keyExtractor={(u) => u.id} isLoading={loading} emptyTitle="No users yet" />
    </div>
  )
}

function CreateUserForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>('client')
  const [organisation, setOrganisation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await usersApi.create({ name, email, password, role, organisation: organisation || null })
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the user.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Name" required value={name} onChange={(e) => setName(e.target.value)} />
      <Field label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      <Field label="Password" type="password" required minLength={8} hint="At least 8 characters." value={password} onChange={(e) => setPassword(e.target.value)} />
      <div className="grid grid-cols-2 gap-3">
        <Select label="Role" value={role} onChange={(e) => setRole(e.target.value as Role)}>
          <option value="client">client</option>
          <option value="operator">operator</option>
          <option value="admin">admin</option>
        </Select>
        <Field label="Organisation" placeholder="Clients only" value={organisation} onChange={(e) => setOrganisation(e.target.value)} />
      </div>
      {error && <Alert>{error}</Alert>}
      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? 'Creating…' : 'Create user'}
      </Button>
    </form>
  )
}
