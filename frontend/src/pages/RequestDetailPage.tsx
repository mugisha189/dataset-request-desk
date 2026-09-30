import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { episodesApi, requestsApi } from '../api/client'
import type { Assignment, Episode, Quality, RequestStatus, Role, StatusEvent } from '../api/types'
import { useSession } from '../auth/session-context'
import { PageHeader } from '../components/layout/AppLayout'
import { Button } from '../components/ui/Button'
import { QualityChip, StatusChip } from '../components/ui/Chip'
import { DataTable, type DataTableAction, type DataTableColumn } from '../components/ui/DataTable'
import { Dialog, DialogClose, DialogContent } from '../components/ui/Dialog'
import { Alert, ErrorState } from '../components/ui/Feedback'
import { Select } from '../components/ui/Field'
import { Icon } from '../components/ui/Icons'
import { Skeleton } from '../components/ui/Skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/Tabs'
import { formatDateTime } from '../lib/format'
import { useAsync, useDebounced } from '../lib/useAsync'

interface TransitionOption {
  to: RequestStatus
  label: string
  roles: Role[]
  destructive?: boolean
}

const NEXT_STATUS: Record<RequestStatus, TransitionOption[]> = {
  submitted: [{ to: 'in_progress', label: 'Start work', roles: ['operator', 'admin'] }],
  in_progress: [{ to: 'delivered', label: 'Mark delivered', roles: ['operator', 'admin'] }],
  delivered: [
    { to: 'accepted', label: 'Accept', roles: ['client'] },
    { to: 'rejected', label: 'Reject', roles: ['client'], destructive: true },
  ],
  rejected: [{ to: 'in_progress', label: 'Resume work (rework)', roles: ['operator', 'admin'] }],
  accepted: [],
}

const QUALITY_OPTIONS = [
  { label: 'Good', value: 'good' },
  { label: 'Usable', value: 'usable' },
  { label: 'Bad', value: 'bad' },
]

export function RequestDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useSession()
  const navigate = useNavigate()
  const [assignOpen, setAssignOpen] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const { data: req, loading, error, reload } = useAsync((signal) => requestsApi.get(id!, signal), [id])

  // Only the first load shows the skeleton -- reload() (after a status change or an
  // assignment) sets `loading` again too, and re-mounting the whole page under an operator's
  // cursor every time they click a button reads as a glitch rather than a refresh.
  if (loading && !req) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }
  if (error || !req) {
    return <ErrorState message={error ?? 'Request not found.'} onRetry={reload} />
  }

  const canOperate = user?.role === 'operator' || user?.role === 'admin'
  const statusActions = (NEXT_STATUS[req.status] ?? []).filter((t) => user && t.roles.includes(user.role))
  // Mirrors the server's ASSIGNABLE_REQUEST_STATUSES in app/services/assignments.py.
  const canAssign = canOperate && (['submitted', 'in_progress', 'rejected'] as RequestStatus[]).includes(req.status)

  async function changeStatus(to: RequestStatus) {
    setActionError(null)
    setBusy(true)
    try {
      await requestsApi.changeStatus(req!.id, to)
      reload()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not update the status.')
    } finally {
      setBusy(false)
    }
  }

  async function unassign(assignment: Assignment) {
    setActionError(null)
    try {
      await requestsApi.unassign(req!.id, assignment.id)
      reload()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not remove that assignment.')
    }
  }

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/requests')} className="text-[13px] font-semibold text-ink-muted hover:text-ink">
        ← Back to requests
      </button>

      <div className="rounded-card border border-line bg-white p-5">
        <PageHeader
          title={req.task_name}
          lead={`Requested by ${req.client_name ?? 'unknown'} · ${req.assigned_count} / ${req.episodes_requested} episodes assigned`}
          actions={
            <>
              <StatusChip status={req.status} />
              {canAssign && (
                <Button size="sm" variant="secondary" onClick={() => setAssignOpen(true)}>
                  <Icon.Plus className="h-4 w-4" />
                  Assign episodes
                </Button>
              )}
            </>
          }
        />
        {req.notes && <p className="mb-4 text-sm text-ink-muted">Notes: {req.notes}</p>}

        {statusActions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {statusActions.map((action) => (
              <Button key={action.to} variant={action.destructive ? 'danger' : 'primary'} size="sm" disabled={busy} onClick={() => changeStatus(action.to)}>
                {action.label}
              </Button>
            ))}
          </div>
        )}
        {actionError && <Alert className="mt-3">{actionError}</Alert>}
      </div>

      <Tabs defaultValue="episodes">
        <TabsList>
          <TabsTrigger value="episodes">Episodes ({req.assignments.length})</TabsTrigger>
          <TabsTrigger value="history">History ({req.status_events.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="episodes">
          <AssignedEpisodesTable assignments={req.assignments} canOperate={canOperate} onUnassign={unassign} />
        </TabsContent>

        <TabsContent value="history">
          <HistoryTimeline events={req.status_events} />
        </TabsContent>
      </Tabs>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent title="Assign episodes" description="Only unassigned, good or usable episodes can be assigned.">
          <AssignPanel requestId={req.id} taskName={req.task_name} onAssigned={reload} />
        </DialogContent>
      </Dialog>
    </div>
  )
}

/**
 * The request's own assigned episodes, through the same shared DataTable every top-level listing
 * uses -- search, a quality filter and pagination, all driven client-side here since the whole
 * list already arrives with the request (it's bounded by `episodes_requested`, never large enough
 * to need its own paginated endpoint the way the Episodes/Requests/Users listings do).
 */
function AssignedEpisodesTable({
  assignments,
  canOperate,
  onUnassign,
}: {
  assignments: Assignment[]
  canOperate: boolean
  onUnassign: (assignment: Assignment) => void
}) {
  const [searchValue, setSearchValue] = useState('')
  const [quality, setQuality] = useState<Quality | ''>('')
  const [pageIndex, setPageIndex] = useState(0)
  const pageSize = 10

  const filtered = useMemo(() => {
    let rows = assignments
    if (quality) rows = rows.filter((a) => a.episode.quality === quality)
    if (searchValue) {
      const needle = searchValue.toLowerCase()
      rows = rows.filter((a) => a.episode.episode_id.toLowerCase().includes(needle) || a.episode.robot_id.toLowerCase().includes(needle))
    }
    return rows
  }, [assignments, quality, searchValue])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const page = filtered.slice(pageIndex * pageSize, pageIndex * pageSize + pageSize)

  const columns: DataTableColumn<Assignment>[] = [
    { id: 'episode', header: 'Episode', cell: (a) => <span className="font-semibold">{a.episode.episode_id}</span> },
    { id: 'robot', header: 'Robot', cell: (a) => a.episode.robot_id },
    { id: 'quality', header: 'Quality', cell: (a) => <QualityChip quality={a.episode.quality} /> },
    { id: 'export', header: 'Export', cell: (a) => <span className="capitalize text-ink-muted">{a.export_status}</span> },
  ]

  const actions: DataTableAction<Assignment>[] = canOperate
    ? [{ name: 'Unassign', icon: <Icon.Close className="h-4 w-4" />, destructive: true, action: onUnassign }]
    : []

  return (
    <DataTable
      columns={columns}
      data={page}
      keyExtractor={(a) => a.id}
      search={{
        value: searchValue,
        onChange: (v) => {
          setSearchValue(v)
          setPageIndex(0)
        },
        placeholder: 'Search episode or robot…',
      }}
      filters={[
        {
          label: 'Quality',
          value: quality,
          onChange: (v) => {
            setQuality(v as Quality | '')
            setPageIndex(0)
          },
          options: QUALITY_OPTIONS,
        },
      ]}
      onClearFilters={() => {
        setSearchValue('')
        setQuality('')
        setPageIndex(0)
      }}
      pagination={{ pageIndex, pageSize, totalCount: filtered.length, pageCount, onPageChange: setPageIndex }}
      actions={actions}
      cardRenderer={(a) => (
        <div className="flex h-full flex-col gap-2 rounded-card border border-line bg-white p-4">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold text-ink">{a.episode.episode_id}</p>
            <QualityChip quality={a.episode.quality} />
          </div>
          <p className="text-[13px] text-ink-muted">{a.episode.robot_id}</p>
          <p className="mt-auto text-[13px] capitalize text-ink-muted">Export: {a.export_status}</p>
        </div>
      )}
      noDataComponent={<div className="py-16 text-center text-sm text-ink-muted">No episodes assigned yet</div>}
    />
  )
}

const EVENT_ICON: Record<RequestStatus, keyof typeof Icon> = {
  submitted: 'Inbox',
  in_progress: 'Clock',
  delivered: 'Box',
  accepted: 'Check',
  rejected: 'Close',
}

/**
 * The request's status history as a timeline -- ported (in spirit) from the reference design
 * system's log stream: an icon in a circle, a connecting line down to the next entry, and the
 * "what happened / who did it / when" on the right, rather than a plain table.
 */
function HistoryTimeline({ events }: { events: StatusEvent[] }) {
  if (events.length === 0) {
    return <div className="rounded-card border border-dashed border-line bg-white py-16 text-center text-sm text-ink-muted">No history yet</div>
  }

  return (
    <ul className="overflow-hidden rounded-card border border-line bg-white">
      {events.map((event, index) => {
        const Glyph = Icon[EVENT_ICON[event.to_status]]
        const isLast = index === events.length - 1
        return (
          <li key={index} className="flex gap-3 border-b border-line/60 p-4 last:border-b-0">
            <div className="flex flex-col items-center">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface-tint text-ink-muted">
                <Glyph className="h-4 w-4" />
              </span>
              {!isLast && <span className="mt-1 w-px flex-1 bg-line" aria-hidden />}
            </div>
            <div className="min-w-0 flex-1 pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-ink-muted">{event.from_status ?? 'created'} →</span>
                <StatusChip status={event.to_status} />
              </div>
              <p className="mt-1 text-[13px] text-ink-muted">
                {event.actor_name ?? 'unknown'} · {formatDateTime(event.created_at)}
              </p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function AssignPanel({ requestId, taskName, onAssigned }: { requestId: string; taskName: string; onAssigned: () => void }) {
  const [taskFilter, setTaskFilter] = useState(taskName)
  const [quality, setQuality] = useState<Quality | ''>('good')
  const [error, setError] = useState<string | null>(null)
  const [assigningId, setAssigningId] = useState<string | null>(null)
  const [assignedCount, setAssignedCount] = useState(0)
  const debouncedTask = useDebounced(taskFilter, 300)

  const {
    data: episodePage,
    loading,
    reload: reloadEpisodes,
  } = useAsync(
    (signal) =>
      episodesApi.list(
        { task_name: debouncedTask || undefined, quality: quality || undefined, unassigned_only: true, page_size: 50 },
        signal,
      ),
    [debouncedTask, quality],
  )
  const episodes = episodePage?.items ?? []

  // Assigning stays in this dialog rather than closing it after one pick, so an operator can
  // assign several episodes in a row -- closing on every click was the first version, and it
  // meant reopening "Assign episodes" once per episode to reach a request's target count.
  async function assign(episode: Episode) {
    setError(null)
    setAssigningId(episode.id)
    try {
      await requestsApi.assign(requestId, [episode.id])
      setAssignedCount((n) => n + 1)
      onAssigned()
      reloadEpisodes()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not assign that episode.')
    } finally {
      setAssigningId(null)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          value={taskFilter}
          onChange={(event) => setTaskFilter(event.target.value)}
          placeholder="Filter by task name"
          className="h-9 flex-1 rounded-lg border border-line bg-white px-3 text-sm focus:border-ink/30 focus:outline-none focus:ring-2 focus:ring-gold/20"
        />
        <Select value={quality} onChange={(event) => setQuality(event.target.value as Quality | '')} className="w-32">
          <option value="">Any quality</option>
          <option value="good">Good</option>
          <option value="usable">Usable</option>
          <option value="bad">Bad</option>
        </Select>
      </div>

      {error && <Alert>{error}</Alert>}

      <div className="max-h-80 overflow-y-auto rounded-lg border border-line">
        {loading ? (
          <div className="p-3 text-sm text-ink-muted">Loading…</div>
        ) : episodes.length === 0 ? (
          <div className="p-4 text-center text-sm text-ink-muted">No matching unassigned episodes.</div>
        ) : (
          <ul className="divide-y divide-line/70">
            {episodes.map((episode) => (
              <li key={episode.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{episode.episode_id}</p>
                  <p className="truncate text-[12px] text-ink-muted">
                    {episode.robot_id} · {episode.task_name}
                  </p>
                </div>
                <QualityChip quality={episode.quality} />
                <Button size="sm" variant="secondary" disabled={assigningId === episode.id} onClick={() => assign(episode)}>
                  Assign
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex items-center justify-between pt-1">
        <p className="text-[13px] text-ink-muted">
          {assignedCount > 0 ? `${assignedCount} assigned this session` : 'Assign as many as you need, then close.'}
        </p>
        <DialogClose asChild>
          <Button type="button" size="sm">
            Done
          </Button>
        </DialogClose>
      </div>
    </div>
  )
}
