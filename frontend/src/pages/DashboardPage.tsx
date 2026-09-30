import { useMemo, useState } from 'react'
import { analyticsApi } from '../api/client'
import { ChipButton, StatusChip } from '../components/ui/Chip'
import { DataTable, type DataTableColumn } from '../components/ui/DataTable'
import { ErrorState } from '../components/ui/Feedback'
import { Field } from '../components/ui/Field'
import { Icon } from '../components/ui/Icons'
import { BarChart, LineChart, PieChart } from '../dashboard/charts'
import { Panel, ProgressBar, SectionHeader, SectionSkeleton, StatCard } from '../dashboard/blocks'
import { QUALITY_COLOR, ROBOT_COLOR } from '../dashboard/palette'
import { formatHours, formatNumber } from '../lib/format'
import { useAsync } from '../lib/useAsync'
import type { RequestStatus } from '../api/types'

type Period = 'day' | 'week' | 'month' | 'year' | 'custom'

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** Turns a period into a concrete [from, to] range, ending today. */
function rangeFor(period: Period, customFrom: string, customTo: string): { from?: string; to?: string } {
  if (period === 'custom') return { from: customFrom || undefined, to: customTo || undefined }
  const to = new Date()
  const from = new Date()
  if (period === 'day') {
    // from === to: the API's BETWEEN is inclusive of the whole day either end.
  } else if (period === 'week') {
    from.setDate(from.getDate() - 6)
  } else if (period === 'month') {
    from.setDate(from.getDate() - 29)
  } else if (period === 'year') {
    from.setFullYear(from.getFullYear() - 1)
  }
  return { from: isoDate(from), to: isoDate(to) }
}

const STATUS_ORDER: RequestStatus[] = ['submitted', 'in_progress', 'delivered', 'accepted', 'rejected']

export function DashboardPage() {
  const [period, setPeriod] = useState<Period>('month')
  const [customFrom, setCustomFrom] = useState(isoDate(new Date(Date.now() - 29 * 86400_000)))
  const [customTo, setCustomTo] = useState(isoDate(new Date()))

  const range = useMemo(() => rangeFor(period, customFrom, customTo), [period, customFrom, customTo])

  const { data, loading, error, reload } = useAsync(
    (signal) => analyticsApi.get({ date_from: range.from, date_to: range.to }, signal),
    [range.from, range.to],
  )

  const periods: { key: Period; label: string }[] = [
    { key: 'day', label: 'Today' },
    { key: 'week', label: 'This week' },
    { key: 'month', label: 'This month' },
    { key: 'year', label: 'This year' },
    { key: 'custom', label: 'Custom' },
  ]

  const statusCounts = useMemo(() => {
    const map = new Map(data?.requests_by_status.map((row) => [row.status, row.count]) ?? [])
    return STATUS_ORDER.map((status) => ({ status, count: map.get(status) ?? 0 }))
  }, [data])

  const dailyColumns: DataTableColumn<{ day: string; robot_id: string; count: number }>[] = [
    { id: 'day', header: 'Day', cell: (row) => row.day },
    { id: 'robot', header: 'Robot', cell: (row) => row.robot_id },
    { id: 'count', header: 'Episodes recorded', cell: (row) => formatNumber(row.count) },
  ]

  return (
    <div className="space-y-10 pb-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Dashboard</h1>
          <p className="mt-0.5 text-sm text-ink-muted">
            {range.from && range.to ? `${range.from} — ${range.to}` : 'Today'}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {periods.map((one) => (
            <ChipButton key={one.key} active={period === one.key} onClick={() => setPeriod(one.key)}>
              {one.label}
            </ChipButton>
          ))}
        </div>
        {period === 'custom' && (
          <div className="grid max-w-md gap-3 sm:grid-cols-2">
            <Field label="From" type="date" value={customFrom} max={customTo} onChange={(e) => setCustomFrom(e.target.value)} />
            <Field label="To" type="date" value={customTo} min={customFrom} onChange={(e) => setCustomTo(e.target.value)} />
          </div>
        )}
      </div>

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : loading || !data ? (
        <>
          <SectionSkeleton />
          <SectionSkeleton cards={3} />
        </>
      ) : (
        <>
          {/* ── Fulfilment ─────────────────────────────────────────────────── */}
          <section>
            <SectionHeader icon={<Icon.Inbox className="h-4 w-4" />} tone="gold" title="Fulfilment" />

            <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
              {statusCounts.map((row) => (
                <StatCard
                  key={row.status}
                  icon={<Icon.Inbox className="h-6 w-6" />}
                  tone={row.status === 'rejected' ? 'danger' : row.status === 'accepted' ? 'ok' : row.status === 'in_progress' ? 'warn' : 'neutral'}
                  label={<StatusChip status={row.status} />}
                  value={row.count}
                />
              ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
              <Panel title="Requests created per day">
                <div className="p-4">
                  <LineChart
                    points={data.requests_created_per_day.map((row) => row.day.slice(5))}
                    series={[{ name: 'Requests', values: data.requests_created_per_day.map((row) => row.count), color: '#B8932E' }]}
                    height={240}
                  />
                </div>
              </Panel>

              <Panel title="Median submitted → delivered">
                <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
                  <p className="tnum text-4xl font-bold text-ink">
                    {data.median_submitted_to_delivered_hours != null ? formatHours(data.median_submitted_to_delivered_hours) : '—'}
                  </p>
                  <p className="text-sm text-ink-muted">across every request delivered in this range</p>
                </div>
              </Panel>
            </div>
          </section>

          {/* ── Episodes ───────────────────────────────────────────────────── */}
          <section>
            <SectionHeader icon={<Icon.Film className="h-4 w-4" />} title="Episodes" />

            <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard icon={<Icon.Film className="h-6 w-6" />} label="Recorded" value={formatNumber(data.episode_funnel.total)} />
              <StatCard icon={<Icon.Check className="h-6 w-6" />} tone="ok" label="Assigned" value={formatNumber(data.episode_funnel.assigned)} />
              <StatCard icon={<Icon.Inbox className="h-6 w-6" />} tone="warn" label="Unassigned" value={formatNumber(data.episode_funnel.unassigned)} />
              <StatCard
                icon={<Icon.Chart className="h-6 w-6" />}
                tone="gold"
                label="Top task (good episodes)"
                value={data.top_tasks_by_good_episodes[0]?.task_name ?? '—'}
                sub={data.top_tasks_by_good_episodes[0] ? `${data.top_tasks_by_good_episodes[0].good_episode_count} good` : undefined}
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1.2fr]">
              <Panel title="Quality">
                <div className="p-4">
                  <PieChart
                    slices={data.quality_breakdown.map((row) => ({ label: row.quality, value: row.count, color: QUALITY_COLOR[row.quality] }))}
                    height={220}
                  />
                </div>
              </Panel>

              <Panel title="Episodes per robot">
                <div className="p-4">
                  <BarChart
                    bars={Object.entries(
                      data.episodes_per_day_per_robot.reduce<Record<string, number>>((totals, row) => {
                        totals[row.robot_id] = (totals[row.robot_id] ?? 0) + row.count
                        return totals
                      }, {}),
                    ).map(([robot_id, count]) => ({ label: robot_id, value: count, color: ROBOT_COLOR[robot_id] }))}
                    height={220}
                  />
                </div>
              </Panel>

              <Panel title="Average duration by robot (s)">
                <div className="space-y-3 p-4">
                  {data.avg_duration_by_robot.length === 0 ? (
                    <p className="py-6 text-center text-xs text-ink-faint">No data for this range</p>
                  ) : (
                    data.avg_duration_by_robot.map((row) => (
                      <ProgressBar
                        key={row.robot_id}
                        label={row.robot_id}
                        value={row.avg_duration_seconds}
                        total={Math.max(...data.avg_duration_by_robot.map((r) => r.avg_duration_seconds), 1)}
                        color={ROBOT_COLOR[row.robot_id] ?? '#0E0E10'}
                        formatted={`${row.avg_duration_seconds}s`}
                      />
                    ))
                  )}
                </div>
              </Panel>
            </div>
          </section>

          {/* ── Top tasks ──────────────────────────────────────────────────── */}
          <section>
            <SectionHeader icon={<Icon.Tag className="h-4 w-4" />} title="Top tasks by good episodes" />
            <Panel title="Top 5">
              <div className="p-4">
                <BarChart bars={data.top_tasks_by_good_episodes.map((row) => ({ label: row.task_name, value: row.good_episode_count }))} height={220} />
              </div>
            </Panel>
          </section>

          {/* ── Operators and clients ──────────────────────────────────────── */}
          <section>
            <SectionHeader icon={<Icon.Users className="h-4 w-4" />} title="Operators and clients" />
            <div className="grid gap-4 lg:grid-cols-2">
              <Panel title="Episodes recorded, by operator">
                <div className="p-4">
                  <BarChart bars={data.operator_productivity.map((row) => ({ label: row.operator_name, value: row.count }))} height={Math.max(140, data.operator_productivity.length * 32)} />
                </div>
              </Panel>
              <Panel title="Requests, by client">
                <div className="p-4">
                  <BarChart bars={data.clients_by_requests.map((row) => ({ label: row.client_name, value: row.count }))} height={Math.max(140, data.clients_by_requests.length * 32)} />
                </div>
              </Panel>
            </div>
          </section>

          {/* ── Day by day, exportable ─────────────────────────────────────── */}
          <section>
            <SectionHeader icon={<Icon.Clock className="h-4 w-4" />} title="Episodes recorded per day, per robot" />
            <DataTable
              columns={dailyColumns}
              data={data.episodes_per_day_per_robot}
              keyExtractor={(row) => `${row.day}-${row.robot_id}`}
              export={{ getDownloadUrl: () => analyticsApi.dailyExportUrl({ date_from: range.from, date_to: range.to }), defaultFilename: 'episodes-per-day' }}
              noDataComponent={<div className="py-16 text-center text-sm text-ink-muted">No episodes in this range</div>}
            />
          </section>
        </>
      )}
    </div>
  )
}
