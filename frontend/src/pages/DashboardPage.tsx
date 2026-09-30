import { useMemo, useState } from 'react'
import { analyticsApi } from '../api/client'
import { Button } from '../components/ui/Button'
import { StatusChip } from '../components/ui/Chip'
import { DataTable, type DataTableColumn } from '../components/ui/DataTable'
import { ErrorState } from '../components/ui/Feedback'
import { Field } from '../components/ui/Field'
import { Icon } from '../components/ui/Icons'
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/Popover'
import { cn } from '../lib/utils'
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

const PERIODS: { key: Period; label: string }[] = [
  { key: 'day', label: 'Today' },
  { key: 'week', label: 'This week' },
  { key: 'month', label: 'This month' },
  { key: 'year', label: 'This year' },
  { key: 'custom', label: 'Custom' },
]

export function DashboardPage() {
  const [period, setPeriod] = useState<Period>('month')
  const [customFrom, setCustomFrom] = useState(isoDate(new Date(Date.now() - 29 * 86400_000)))
  const [customTo, setCustomTo] = useState(isoDate(new Date()))
  const [periodMenuOpen, setPeriodMenuOpen] = useState(false)

  const range = useMemo(() => rangeFor(period, customFrom, customTo), [period, customFrom, customTo])

  const { data, loading, error, reload } = useAsync(
    (signal) => analyticsApi.get({ date_from: range.from, date_to: range.to }, signal),
    [range.from, range.to],
  )

  const statusCounts = useMemo(() => {
    const map = new Map(data?.requests_by_status.map((row) => [row.status, row.count]) ?? [])
    return STATUS_ORDER.map((status) => ({ status, count: map.get(status) ?? 0 }))
  }, [data])

  // Derived from the same status counts already fetched for the row above -- no extra request.
  const statusMap = useMemo(() => new Map(statusCounts.map((row) => [row.status, row.count])), [statusCounts])
  const totalRequests = statusCounts.reduce((sum, row) => sum + row.count, 0)
  const accepted = statusMap.get('accepted') ?? 0
  const rejected = statusMap.get('rejected') ?? 0
  const acceptanceRate = accepted + rejected > 0 ? Math.round((accepted / (accepted + rejected)) * 100) : null
  const awaitingAction = (statusMap.get('submitted') ?? 0) + (statusMap.get('in_progress') ?? 0)

  const dailyColumns: DataTableColumn<{ day: string; robot_id: string; count: number }>[] = [
    { id: 'day', header: 'Day', cell: (row) => row.day },
    { id: 'robot', header: 'Robot', cell: (row) => row.robot_id },
    { id: 'count', header: 'Episodes recorded', cell: (row) => formatNumber(row.count) },
  ]

  const currentLabel = PERIODS.find((one) => one.key === period)?.label ?? 'This month'

  return (
    <div className="space-y-10 pb-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Dashboard</h1>
          <p className="mt-0.5 text-sm text-ink-muted">
            {range.from && range.to ? `${range.from} — ${range.to}` : 'Today'}
          </p>
        </div>

        <Popover open={periodMenuOpen} onOpenChange={setPeriodMenuOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex h-9 items-center gap-2 rounded-lg border border-line bg-white px-3 text-[13px] font-bold text-ink transition-colors hover:border-ink/30"
            >
              <Icon.Clock className="h-4 w-4 text-ink-faint" />
              {currentLabel}
              <Icon.Chevron className="h-3.5 w-3.5 rotate-90 text-ink-faint" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64">
            <div className="space-y-1">
              {PERIODS.map((one) => (
                <button
                  key={one.key}
                  type="button"
                  onClick={() => {
                    setPeriod(one.key)
                    if (one.key !== 'custom') setPeriodMenuOpen(false)
                  }}
                  className={cn(
                    'flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-semibold transition-colors',
                    period === one.key ? 'bg-ink text-white' : 'text-ink hover:bg-surface-tint',
                  )}
                >
                  {one.label}
                  {period === one.key && <Icon.Check className="h-4 w-4" />}
                </button>
              ))}
            </div>

            {period === 'custom' && (
              <div className="mt-3 space-y-3 border-t border-line pt-3">
                <Field label="From" type="date" value={customFrom} max={customTo} onChange={(e) => setCustomFrom(e.target.value)} />
                <Field label="To" type="date" value={customTo} min={customFrom} onChange={(e) => setCustomTo(e.target.value)} />
                <Button type="button" size="sm" className="w-full" onClick={() => setPeriodMenuOpen(false)}>
                  Apply
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>
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

            <div className="grid gap-4 lg:grid-cols-[1.8fr_1fr]">
              <Panel title="Requests created per day">
                <div className="p-4">
                  <LineChart
                    points={data.requests_created_per_day.map((row) => row.day.slice(5))}
                    series={[{ name: 'Requests', values: data.requests_created_per_day.map((row) => row.count), color: '#B8932E' }]}
                    height={240}
                  />
                </div>
              </Panel>

              <div className="grid grid-cols-2 gap-3">
                <MiniStat label="Median submitted → delivered" value={data.median_submitted_to_delivered_hours != null ? formatHours(data.median_submitted_to_delivered_hours) : '—'} />
                <MiniStat label="Total requests" value={formatNumber(totalRequests)} />
                <MiniStat label="Acceptance rate" value={acceptanceRate != null ? `${acceptanceRate}%` : '—'} />
                <MiniStat label="Awaiting action" value={formatNumber(awaitingAction)} />
              </div>
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
              cardRenderer={(row) => (
                <div className="flex h-full flex-col gap-2 rounded-card border border-line bg-white p-4">
                  <p className="font-semibold text-ink">{row.day}</p>
                  <p className="text-[13px] text-ink-muted">{row.robot_id}</p>
                  <p className="mt-auto text-2xl font-bold text-ink">{formatNumber(row.count)}</p>
                </div>
              )}
              export={{ getDownloadUrl: () => analyticsApi.dailyExportUrl({ date_from: range.from, date_to: range.to }), defaultFilename: 'episodes-per-day' }}
              noDataComponent={<div className="py-16 text-center text-sm text-ink-muted">No episodes in this range</div>}
            />
          </section>
        </>
      )}
    </div>
  )
}

/** A compact stat block, sized to sit four-to-a-panel rather than one huge number in a lot of
 *  empty space -- used next to the daily-requests chart so that panel earns its own height. */
function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col justify-center rounded-card border border-line bg-white p-4">
      <p className="tnum text-2xl font-bold text-ink">{value}</p>
      <p className="mt-1 text-[13px] leading-snug text-ink-muted">{label}</p>
    </div>
  )
}
