import { useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { requestsApi } from '../api/client'
import type { DatasetRequest } from '../api/types'
import { useSession } from '../auth/session-context'
import { PageHeader } from '../components/layout/AppLayout'
import { Button } from '../components/ui/Button'
import { StatusChip } from '../components/ui/Chip'
import { DataTable, type DataTableColumn } from '../components/ui/DataTable'
import { Dialog, DialogContent, DialogTrigger } from '../components/ui/Dialog'
import { Alert } from '../components/ui/Feedback'
import { Field, TextArea } from '../components/ui/Field'
import { Icon } from '../components/ui/Icons'
import { formatDate } from '../lib/format'
import { useAsync, useDebounced } from '../lib/useAsync'

const STATUS_OPTIONS = [
  { label: 'Submitted', value: 'submitted' },
  { label: 'In progress', value: 'in_progress' },
  { label: 'Delivered', value: 'delivered' },
  { label: 'Accepted', value: 'accepted' },
  { label: 'Rejected', value: 'rejected' },
]

export function RequestsPage() {
  const { user } = useSession()
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState('')
  const [searchValue, setSearchValue] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const { data: requests, loading, error, reload } = useAsync((signal) => requestsApi.list(signal), [])
  const debouncedSearch = useDebounced(searchValue, 250)

  const isClient = user?.role === 'client'

  const filtered = useMemo(() => {
    if (!requests) return []
    let rows = requests
    if (statusFilter) rows = rows.filter((r) => r.status === statusFilter)
    if (debouncedSearch) {
      const needle = debouncedSearch.toLowerCase()
      rows = rows.filter((r) => r.task_name.toLowerCase().includes(needle) || (r.client_name ?? '').toLowerCase().includes(needle))
    }
    return rows
  }, [requests, statusFilter, debouncedSearch])

  const columns: DataTableColumn<DatasetRequest>[] = [
    { id: 'task', header: 'Task', cell: (r) => <span className="font-semibold">{r.task_name}</span> },
    ...(isClient ? [] : [{ id: 'client', header: 'Client', cell: (r: DatasetRequest) => r.client_name ?? '—' } as DataTableColumn<DatasetRequest>]),
    { id: 'progress', header: 'Assigned', cell: (r) => `${r.assigned_count} / ${r.episodes_requested}` },
    { id: 'deadline', header: 'Deadline', cell: (r) => formatDate(r.deadline) },
    { id: 'status', header: 'Status', cell: (r) => <StatusChip status={r.status} /> },
    {
      id: 'open',
      header: '',
      className: 'text-right',
      cell: (r) => (
        <Button variant="secondary" size="sm" onClick={() => navigate(`/requests/${r.id}`)}>
          Open
        </Button>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Requests"
        lead={isClient ? 'Your dataset requests and their current status.' : 'Every request in the system.'}
        actions={
          isClient && (
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="gold">
                  <Icon.Plus className="h-4 w-4" />
                  New request
                </Button>
              </DialogTrigger>
              <DialogContent title="New request" description="Describe the dataset you need. An operator will pick it up.">
                <CreateRequestForm
                  onCreated={() => {
                    setCreateOpen(false)
                    reload()
                  }}
                />
              </DialogContent>
            </Dialog>
          )
        }
      />

      {error && <Alert className="mb-4">{error}</Alert>}

      <DataTable
        columns={columns}
        data={filtered}
        keyExtractor={(r) => r.id}
        isLoading={loading}
        search={{ value: searchValue, onChange: setSearchValue, placeholder: 'Search task or client…' }}
        filters={isClient ? undefined : [{ label: 'Status', value: statusFilter, onChange: setStatusFilter, options: STATUS_OPTIONS }]}
        onClearFilters={isClient ? undefined : () => setStatusFilter('')}
        export={{ getDownloadUrl: () => requestsApi.exportUrl(), defaultFilename: 'requests' }}
        noDataComponent={
          <div className="py-16 text-center">
            <p className="text-base font-bold text-ink">{isClient ? 'No requests yet' : 'No requests match this filter'}</p>
            {isClient && <p className="mt-1.5 text-sm text-ink-muted">Create your first request with the button above.</p>}
          </div>
        }
      />
    </div>
  )
}

function CreateRequestForm({ onCreated }: { onCreated: () => void }) {
  const [taskName, setTaskName] = useState('')
  const [count, setCount] = useState('10')
  const [deadline, setDeadline] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await requestsApi.create({
        task_name: taskName,
        episodes_requested: parseInt(count, 10),
        deadline: new Date(deadline).toISOString(),
        notes: notes || null,
      })
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the request.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Task name" required placeholder="e.g. pick cup" value={taskName} onChange={(e) => setTaskName(e.target.value)} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Episodes requested" type="number" min={1} required value={count} onChange={(e) => setCount(e.target.value)} />
        <Field label="Deadline" type="date" required value={deadline} onChange={(e) => setDeadline(e.target.value)} />
      </div>
      <TextArea label="Notes" placeholder="Optional context for the operator" value={notes} onChange={(e) => setNotes(e.target.value)} />
      {error && <Alert>{error}</Alert>}
      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? 'Creating…' : 'Create request'}
      </Button>
    </form>
  )
}
