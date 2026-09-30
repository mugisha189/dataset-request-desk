import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { episodesApi, requestsApi } from '../api/client'
import type { Assignment, Episode, Quality, RequestStatus, Role } from '../api/types'
import { useSession } from '../auth/session-context'
import { PageHeader } from '../components/layout/AppLayout'
import { Button } from '../components/ui/Button'
import { QualityChip, StatusChip } from '../components/ui/Chip'
import { Dialog, DialogClose, DialogContent } from '../components/ui/Dialog'
import { Alert, ErrorState } from '../components/ui/Feedback'
import { Select } from '../components/ui/Field'
import { Icon } from '../components/ui/Icons'
import { Table, type Column } from '../components/ui/Table'
import { Skeleton } from '../components/ui/Skeleton'
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
  const actions = (NEXT_STATUS[req.status] ?? []).filter((t) => user && t.roles.includes(user.role))
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

  const assignmentColumns: Column<Assignment>[] = [
    { id: 'episode', header: 'Episode', cell: (a) => a.episode.episode_id },
    { id: 'robot', header: 'Robot', cell: (a) => a.episode.robot_id },
    { id: 'quality', header: 'Quality', cell: (a) => <QualityChip quality={a.episode.quality} /> },
    { id: 'export', header: 'Export', cell: (a) => <span className="capitalize text-ink-muted">{a.export_status}</span> },
    ...(canOperate
      ? [
          {
            id: 'actions',
            header: '',
            className: 'text-right',
            cell: (a: Assignment) => (
              <Button variant="ghost" size="sm" onClick={() => unassign(a)}>
                Unassign
              </Button>
            ),
          } as Column<Assignment>,
        ]
      : []),
  ]

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

        {actions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {actions.map((action) => (
              <Button key={action.to} variant={action.destructive ? 'danger' : 'primary'} size="sm" disabled={busy} onClick={() => changeStatus(action.to)}>
                {action.label}
              </Button>
            ))}
          </div>
        )}
        {actionError && <Alert className="mt-3">{actionError}</Alert>}
      </div>

      <section>
        <h2 className="mb-2 text-sm font-bold text-ink">Assigned episodes</h2>
        <Table
          columns={assignmentColumns}
          data={req.assignments}
          keyExtractor={(a) => a.id}
          emptyTitle="No episodes assigned yet"
          emptyLead={canOperate ? 'Use "Assign episodes" above to add some.' : undefined}
        />
      </section>

      <section>
        <h2 className="mb-2 text-sm font-bold text-ink">History</h2>
        <div className="overflow-hidden rounded-card border border-line bg-white">
          <ul className="divide-y divide-line/70">
            {req.status_events.map((event, index) => (
              <li key={index} className="flex flex-wrap items-center gap-2 px-4 py-3 text-sm">
                <span className="text-ink-muted">{event.from_status ?? 'created'} →</span>
                <StatusChip status={event.to_status} />
                <span className="ml-auto text-[13px] text-ink-muted">
                  {event.actor_name ?? 'unknown'} · {formatDateTime(event.created_at)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent title="Assign episodes" description="Only unassigned, good or usable episodes can be assigned.">
          <AssignPanel requestId={req.id} taskName={req.task_name} onAssigned={reload} />
        </DialogContent>
      </Dialog>
    </div>
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
    data: episodes,
    loading,
    reload: reloadEpisodes,
  } = useAsync(
    (signal) =>
      episodesApi.list(
        { task_name: debouncedTask || undefined, quality: quality || undefined, unassigned_only: true, limit: 50 },
        signal,
      ),
    [debouncedTask, quality],
  )

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
          className="h-9 flex-1 rounded-lg border border-line bg-white px-3 text-sm focus:border-ink/30 focus:outline-none focus:ring-2 focus:ring-brand/15"
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
        ) : !episodes || episodes.length === 0 ? (
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
