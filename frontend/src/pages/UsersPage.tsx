import { useState, type FormEvent } from 'react'
import { usersApi } from '../api/client'
import type { Role, User } from '../api/types'
import { PageHeader } from '../components/layout/AppLayout'
import { Button } from '../components/ui/Button'
import { Chip } from '../components/ui/Chip'
import { ConfirmActionDialog } from '../components/ui/ConfirmActionDialog'
import { DataTable, type DataTableAction, type DataTableColumn } from '../components/ui/DataTable'
import { Dialog, DialogContent, DialogTrigger } from '../components/ui/Dialog'
import { Alert } from '../components/ui/Feedback'
import { Field, PasswordField, Select } from '../components/ui/Field'
import { Icon } from '../components/ui/Icons'
import { SelectComponent } from '../components/ui/Select'
import { Sheet, SheetContent, SheetFooter } from '../components/ui/Sheet'
import { formatDate } from '../lib/format'
import { useAsync, useDebounced } from '../lib/useAsync'

const ROLE_OPTIONS = [
  { label: 'Client', value: 'client' },
  { label: 'Operator', value: 'operator' },
  { label: 'Admin', value: 'admin' },
]

const SORT_OPTIONS = [
  { label: 'Created (newest)', value: 'created_at,desc' },
  { label: 'Created (oldest)', value: 'created_at,asc' },
  { label: 'Name', value: 'name,asc' },
  { label: 'Role', value: 'role,asc' },
]

const PAGE_SIZE = 20

export function UsersPage() {
  const [createOpen, setCreateOpen] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [searchValue, setSearchValue] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [sort, setSort] = useState('')
  const [pageIndex, setPageIndex] = useState(0)
  const [roleSheetUser, setRoleSheetUser] = useState<User | null>(null)
  const [confirmUser, setConfirmUser] = useState<{ user: User; type: 'activate' | 'deactivate' } | null>(null)
  const [confirmPending, setConfirmPending] = useState(false)
  const debouncedSearch = useDebounced(searchValue, 250)

  const {
    data: userPage,
    loading,
    error,
    reload,
  } = useAsync(
    (signal) =>
      usersApi.list(
        { search: debouncedSearch || undefined, role: roleFilter || undefined, sort: sort || undefined, page: pageIndex, page_size: PAGE_SIZE },
        signal,
      ),
    [debouncedSearch, roleFilter, sort, pageIndex],
  )
  const users = userPage?.items ?? []
  const pageCount = Math.max(1, Math.ceil((userPage?.total ?? 0) / PAGE_SIZE))

  function resetToFirstPage() {
    setPageIndex(0)
  }

  async function confirmToggleActive() {
    if (!confirmUser) return
    setActionError(null)
    setConfirmPending(true)
    try {
      await usersApi.update(confirmUser.user.id, { is_active: confirmUser.type === 'activate' })
      setConfirmUser(null)
      reload()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not update that user.')
    } finally {
      setConfirmPending(false)
    }
  }

  const columns: DataTableColumn<User>[] = [
    { id: 'name', header: 'Name', cell: (u) => <span className="font-semibold">{u.name}</span> },
    { id: 'email', header: 'Email', cell: (u) => u.email },
    { id: 'role', header: 'Role', cell: (u) => <span className="capitalize">{u.role}</span> },
    { id: 'created', header: 'Created', cell: (u) => formatDate(u.created_at) },
    { id: 'status', header: 'Status', cell: (u) => <Chip tone={u.is_active ? 'ok' : 'neutral'}>{u.is_active ? 'Active' : 'Inactive'}</Chip> },
  ]

  const actions: DataTableAction<User>[] = [
    {
      name: 'Edit role',
      icon: <Icon.Pencil className="h-4 w-4" />,
      action: (u) => setRoleSheetUser(u),
    },
    {
      name: 'Activate',
      icon: <Icon.Check className="h-4 w-4" />,
      visible: (u) => !u.is_active,
      action: (u) => setConfirmUser({ user: u, type: 'activate' }),
    },
    {
      name: 'Deactivate',
      icon: <Icon.Close className="h-4 w-4" />,
      destructive: true,
      visible: (u) => u.is_active,
      action: (u) => setConfirmUser({ user: u, type: 'deactivate' }),
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
              <Button size="sm" variant="gold">
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
      {actionError && <Alert className="mb-4">{actionError}</Alert>}
      <DataTable
        columns={columns}
        data={users}
        keyExtractor={(u) => u.id}
        isLoading={loading}
        search={{
          value: searchValue,
          onChange: (v) => {
            setSearchValue(v)
            resetToFirstPage()
          },
          placeholder: 'Search name or email…',
        }}
        filters={[
          {
            label: 'Role',
            value: roleFilter,
            onChange: (v) => {
              setRoleFilter(v)
              resetToFirstPage()
            },
            options: ROLE_OPTIONS,
          },
        ]}
        sort={{ options: SORT_OPTIONS, value: sort, onChange: (v) => { setSort(v); resetToFirstPage() } }}
        pagination={{
          pageIndex,
          pageSize: PAGE_SIZE,
          totalCount: userPage?.total ?? 0,
          pageCount,
          onPageChange: setPageIndex,
        }}
        actions={actions}
        cardRenderer={(u) => <UserCard user={u} />}
        onClearFilters={() => {
          setSearchValue('')
          setRoleFilter('')
          setSort('')
          resetToFirstPage()
        }}
        export={{ getDownloadUrl: () => usersApi.exportUrl({ search: debouncedSearch || undefined, role: roleFilter || undefined }), defaultFilename: 'users' }}
        noDataComponent={<div className="py-16 text-center text-sm text-ink-muted">No users match this filter</div>}
      />

      <EditRoleSheet
        key={roleSheetUser?.id ?? 'none'}
        user={roleSheetUser}
        onOpenChange={(open) => !open && setRoleSheetUser(null)}
        onSaved={() => {
          setRoleSheetUser(null)
          reload()
        }}
        onError={(message) => setActionError(message)}
      />

      <ConfirmActionDialog
        type={confirmUser?.type ?? 'deactivate'}
        entityLabel={confirmUser?.user.name}
        open={confirmUser != null}
        onOpenChange={(open) => !open && setConfirmUser(null)}
        onConfirm={confirmToggleActive}
        isPending={confirmPending}
      />
    </div>
  )
}

function UserCard({ user }: { user: User }) {
  return (
    <div className="flex h-full flex-col gap-2 rounded-card border border-line bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-ink">{user.name}</p>
        <Chip tone={user.is_active ? 'ok' : 'neutral'}>{user.is_active ? 'Active' : 'Inactive'}</Chip>
      </div>
      <p className="text-[13px] text-ink-muted">{user.email}</p>
      <div className="mt-auto flex items-center justify-between text-[13px] text-ink-muted">
        <span className="capitalize">{user.role}</span>
        <span>{formatDate(user.created_at)}</span>
      </div>
    </div>
  )
}

/**
 * Changing a user's role now opens this aside instead of an inline `<select>` in the table row:
 * a role change is consequential enough (it changes what someone is authorized to do) that it
 * deserves an explicit "Save" rather than firing the moment a dropdown value changes.
 */
function EditRoleSheet({
  user,
  onOpenChange,
  onSaved,
  onError,
}: {
  user: User | null
  onOpenChange: (open: boolean) => void
  onSaved: () => void
  onError: (message: string) => void
}) {
  const [role, setRole] = useState<Role>(user?.role ?? 'client')
  const [saving, setSaving] = useState(false)

  async function onSave() {
    if (!user) return
    setSaving(true)
    try {
      await usersApi.update(user.id, { role })
      onSaved()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not update that user.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={user != null} onOpenChange={onOpenChange}>
      <SheetContent title="Edit role" description={user ? `${user.name} · ${user.email}` : undefined} width="w-full sm:w-[420px]">
        {user && (
          <>
            <div className="space-y-4 px-6 py-5">
              <div>
                <div className="mb-1.5 text-[13px] font-semibold text-ink">Role</div>
                <SelectComponent value={role} onValueChange={(v) => setRole(v as Role)} options={ROLE_OPTIONS} aria-label="Role" />
                <p className="mt-1.5 text-xs text-ink-muted">
                  {role === 'admin'
                    ? 'Can create users, change roles, and do everything an operator can.'
                    : role === 'operator'
                      ? 'Can view all requests, assign episodes, and import episode metadata.'
                      : 'Can create requests and accept or reject their own deliveries.'}
                </p>
              </div>
            </div>
            <SheetFooter>
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={saving}>
                Cancel
              </Button>
              <Button type="button" onClick={onSave} disabled={saving || role === user.role}>
                {saving ? 'Saving…' : 'Save role'}
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
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
      <PasswordField label="Password" required minLength={8} hint="At least 8 characters." value={password} onChange={(e) => setPassword(e.target.value)} />
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
