import { useMemo, useState } from 'react'
import { analyticsApi } from '../api/client'
import { PageHeader } from '../components/layout/AppLayout'
import { StatusChip } from '../components/ui/Chip'
import { Alert } from '../components/ui/Feedback'
import { Field } from '../components/ui/Field'
import { Skeleton } from '../components/ui/Skeleton'
import { formatHours, formatNumber } from '../lib/format'
import { useAsync } from '../lib/useAsync'
import type { RequestStatus } from '../api/types'

export function AnalyticsPage() {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const { data, loading, error } = useAsync(
    (signal) => analyticsApi.get({ date_from: dateFrom || undefined, date_to: dateTo || undefined }, signal),
    [dateFrom, dateTo],
  )

  const perRobot = useMemo(() => {
    if (!data) return new Map<string, number>()
    const totals = new Map<string, number>()
    for (const row of data.episodes_per_day_per_robot) {
      totals.set(row.robot_id, (totals.get(row.robot_id) ?? 0) + row.count)
    }
    return totals
  }, [data])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        lead="All aggregation runs in the database -- see NOTES.md for how these queries behave at volume."
        actions={
          <>
            <Field label="From" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
            <Field label="To" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
          </>
        }
      />

      {error && <Alert className="mb-4">{error}</Alert>}

      {loading || !data ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Median submitted → delivered" value={data.median_submitted_to_delivered_hours != null ? formatHours(data.median_submitted_to_delivered_hours) : '—'} />
            {data.requests_by_status.map((row) => (
              <StatCardStatus key={row.status} status={row.status} count={row.count} />
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-card border border-line bg-white p-5">
              <h2 className="mb-3 text-sm font-bold text-ink">Top 5 tasks by good episodes</h2>
              <ul className="space-y-2">
                {data.top_tasks_by_good_episodes.map((task) => {
                  const max = data.top_tasks_by_good_episodes[0]?.good_episode_count || 1
                  return (
                    <li key={task.task_name}>
                      <div className="mb-1 flex justify-between text-[13px]">
                        <span className="font-semibold">{task.task_name}</span>
                        <span className="text-ink-muted">{formatNumber(task.good_episode_count)}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-surface-tint">
                        <div className="h-full rounded-full bg-brand" style={{ width: `${(task.good_episode_count / max) * 100}%` }} />
                      </div>
                    </li>
                  )
                })}
                {data.top_tasks_by_good_episodes.length === 0 && <p className="text-sm text-ink-muted">No good episodes in this range.</p>}
              </ul>
            </section>

            <section className="rounded-card border border-line bg-white p-5">
              <h2 className="mb-3 text-sm font-bold text-ink">Episodes recorded per robot</h2>
              <ul className="space-y-2">
                {[...perRobot.entries()].map(([robot, count]) => {
                  const max = Math.max(...perRobot.values(), 1)
                  return (
                    <li key={robot}>
                      <div className="mb-1 flex justify-between text-[13px]">
                        <span className="font-semibold">{robot}</span>
                        <span className="text-ink-muted">{formatNumber(count)}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-surface-tint">
                        <div className="h-full rounded-full bg-ink" style={{ width: `${(count / max) * 100}%` }} />
                      </div>
                    </li>
                  )
                })}
                {perRobot.size === 0 && <p className="text-sm text-ink-muted">No episodes in this range.</p>}
              </ul>
            </section>
          </div>
        </>
      )}
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border border-line bg-white p-4">
      <p className="text-xl font-bold text-ink">{value}</p>
      <p className="mt-0.5 text-[12px] text-ink-muted">{label}</p>
    </div>
  )
}

function StatCardStatus({ status, count }: { status: RequestStatus; count: number }) {
  return (
    <div className="rounded-card border border-line bg-white p-4">
      <p className="text-xl font-bold text-ink">{count}</p>
      <div className="mt-1">
        <StatusChip status={status} />
      </div>
    </div>
  )
}
