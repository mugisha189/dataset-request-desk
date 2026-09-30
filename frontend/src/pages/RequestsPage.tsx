import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { requestsApi } from '../api/client'
import type { DatasetRequest, RequestStatus } from '../api/types'
import { useSession } from '../auth/session-context'
import { PageHeader } from '../components/layout/AppLayout'
import { Button } from '../components/ui/Button'
import { StatusChip } from '../components/ui/Chip'
import { DataTable, type DataTableAction, type DataTableColumn } from '../components/ui/DataTable'
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

const SORT_OPTIONS = [
  { label: 'Created (newest)', value: 'created_at,desc' },
  { label: 'Created (oldest)', value: 'created_at,asc' },
  { label: 'Deadline', value: 'deadline,asc' },
  { label: 'Task name', value: 'task_name,asc' },
  { label: 'Status', value: 'status,asc' },
]

const PAGE_SIZE = 20

export function RequestsPage() {
  const { user } = useSession()
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState('')
  const [searchValue, setSearchValue] = useState('')
  const [sort, setSort] = useState('')
  const [pageIndex, setPageIndex] = useState(0)
  const [createOpen, setCreateOpen] = useState(false)
  const debouncedSearch = useDebounced(searchValue, 250)

  const isClient = user?.role === 'client'

  const {
    data: requestPage,
    loading,
    error,
    reload,
  } = useAsync(
    (signal) =>
      requestsApi.list(
        {
          search: debouncedSearch || undefined,
          status: (statusFilter as RequestStatus) || undefined,
          sort: sort || undefined,
          page: pageIndex,
          page_size: PAGE_SIZE,
        },
        signal,
      ),
    [debouncedSearch, statusFilter, sort, pageIndex],
  )
  const requests = requestPage?.items ?? []
  const pageCount = Math.max(1, Math.ceil((requestPage?.total ?? 0) / PAGE_SIZE))

  function resetToFirstPage() {
    setPageIndex(0)
  }

  const columns: DataTableColumn<DatasetRequest>[] = [
    { id: 'task', header: 'Task', cell: (r) => <span className="font-semibold">{r.task_name}</span> },
    ...(isClient ? [] : [{ id: 'client', header: 'Client', cell: (r: DatasetRequest) => r.client_name ?? '—' } as DataTableColumn<DatasetRequest>]),
    { id: 'progress', header: 'Assigned', cell: (r) => `${r.assigned_count} / ${r.episodes_requested}` },
    { id: 'deadline', header: 'Deadline', cell: (r) => formatDate(r.deadline) },
    { id: 'status', header: 'Status', cell: (r) => <StatusChip status={r.status} /> },
  ]

  const actions: DataTableAction<DatasetRequest>[] = [
    { name: 'View', icon: <Icon.Arrow className="h-4 w-4" />, action: (r) => navigate(`/requests/${r.id}`) },
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
        data={requests}
        keyExtractor={(r) => r.id}
        isLoading={loading}
        search={{
          value: searchValue,
          onChange: (v) => {
            setSearchValue(v)
            resetToFirstPage()
          },
          placeholder: 'Search task or client…',
        }}
        filters={
          isClient
            ? undefined
            : [
                {
                  label: 'Status',
                  value: statusFilter,
                  onChange: (v) => {
                    setStatusFilter(v)
                    resetToFirstPage()
                  },
                  options: STATUS_OPTIONS,
                },
              ]
        }
        sort={{ options: SORT_OPTIONS, value: sort, onChange: (v) => { setSort(v); resetToFirstPage() } }}
        pagination={{
          pageIndex,
          pageSize: PAGE_SIZE,
          totalCount: requestPage?.total ?? 0,
          pageCount,
          onPageChange: setPageIndex,
        }}
        onClearFilters={() => {
          setSearchValue('')
          setStatusFilter('')
          setSort('')
          resetToFirstPage()
        }}
        actions={actions}
        cardRenderer={(r) => <RequestCard request={r} isClient={isClient} />}
        export={{ getDownloadUrl: () => requestsApi.exportUrl({ search: debouncedSearch || undefined, status: (statusFilter as RequestStatus) || undefined }), defaultFilename: 'requests' }}
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

function RequestCard({ request, isClient }: { request: DatasetRequest; isClient: boolean }) {
  return (
    <div className="flex h-full flex-col gap-3 rounded-card border border-line bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-ink">{request.task_name}</p>
        <StatusChip status={request.status} />
      </div>
      {!isClient && <p className="text-[13px] text-ink-muted">{request.client_name ?? '—'}</p>}
      <div className="mt-auto flex items-center justify-between text-[13px] text-ink-muted">
        <span>{request.assigned_count} / {request.episodes_requested} assigned</span>
        <span>Due {formatDate(request.deadline)}</span>
      </div>
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
