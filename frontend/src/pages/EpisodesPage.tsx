import { useRef, useState, type FormEvent } from 'react'
import { episodesApi } from '../api/client'
import type { Episode, ImportResult, Quality } from '../api/types'
import { PageHeader } from '../components/layout/AppLayout'
import { Button } from '../components/ui/Button'
import { QualityChip } from '../components/ui/Chip'
import { Alert } from '../components/ui/Feedback'
import { Select } from '../components/ui/Field'
import { Icon } from '../components/ui/Icons'
import { Table, type Column } from '../components/ui/Table'
import { formatDateTime } from '../lib/format'
import { useAsync, useDebounced } from '../lib/useAsync'

export function EpisodesPage() {
  const [taskFilter, setTaskFilter] = useState('')
  const [quality, setQuality] = useState<Quality | ''>('')
  const debouncedTask = useDebounced(taskFilter, 300)

  const {
    data: episodes,
    loading,
    error,
    reload,
  } = useAsync(
    (signal) => episodesApi.list({ task_name: debouncedTask || undefined, quality: quality || undefined, limit: 300 }, signal),
    [debouncedTask, quality],
  )

  const columns: Column<Episode>[] = [
    { id: 'id', header: 'Episode', cell: (e) => <span className="font-semibold">{e.episode_id}</span> },
    { id: 'robot', header: 'Robot', cell: (e) => e.robot_id },
    { id: 'task', header: 'Task', cell: (e) => e.task_name },
    { id: 'recorded', header: 'Recorded', cell: (e) => formatDateTime(e.recorded_at) },
    { id: 'duration', header: 'Duration (s)', cell: (e) => e.duration_seconds },
    { id: 'operator', header: 'Operator', cell: (e) => e.operator_name },
    { id: 'quality', header: 'Quality', cell: (e) => <QualityChip quality={e.quality} /> },
    {
      id: 'assigned',
      header: 'Assigned',
      cell: (e) => (e.is_assigned ? <span className="text-ink-muted">yes</span> : <span className="text-ink-faint">—</span>),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Episodes" lead="Recorded episode metadata, imported from the recording system's CSV export." />

      <ImportPanel onImported={reload} />

      <section>
        <div className="mb-3 flex flex-wrap gap-2">
          <input
            value={taskFilter}
            onChange={(event) => setTaskFilter(event.target.value)}
            placeholder="Filter by task name"
            className="h-9 w-56 rounded-lg border border-line bg-white px-3 text-sm focus:border-ink/30 focus:outline-none focus:ring-2 focus:ring-brand/15"
          />
          <Select value={quality} onChange={(event) => setQuality(event.target.value as Quality | '')} className="w-40">
            <option value="">Any quality</option>
            <option value="good">Good</option>
            <option value="usable">Usable</option>
            <option value="bad">Bad</option>
          </Select>
        </div>

        {error && <Alert className="mb-3">{error}</Alert>}

        <Table columns={columns} data={episodes ?? []} keyExtractor={(e) => e.id} isLoading={loading} emptyTitle="No episodes match this filter" />
      </section>
    </div>
  )
}

function ImportPanel({ onImported }: { onImported: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const file = inputRef.current?.files?.[0]
    if (!file) return
    setError(null)
    setResult(null)
    setImporting(true)
    try {
      const outcome = await episodesApi.import(file)
      setResult(outcome)
      onImported()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The import failed.')
    } finally {
      setImporting(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <section className="rounded-card border border-line bg-white p-5">
      <h2 className="mb-1 text-sm font-bold text-ink">Import episode metadata</h2>
      <p className="mb-4 text-[13px] text-ink-muted">
        Re-importing the same file is safe: rows already in the database are reported as duplicates, not re-added.
      </p>
      <form onSubmit={onSubmit} className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-surface-tint file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-ink"
        />
        <Button type="submit" size="sm" disabled={importing}>
          <Icon.Upload className="h-4 w-4" />
          {importing ? 'Importing…' : 'Import CSV'}
        </Button>
      </form>

      {error && <Alert className="mt-4">{error}</Alert>}

      {result && (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-4 text-sm">
            <Stat label="Imported" value={result.imported_count} tone="ok" />
            <Stat label="Skipped" value={result.skipped_count} tone="warn" />
            <Stat label="Duplicates" value={result.duplicate_count} tone="neutral" />
            <Stat label="Total rows" value={result.total_rows} tone="neutral" />
          </div>
          {result.details.length > 0 && (
            <div className="max-h-64 overflow-y-auto rounded-lg border border-line">
              <table className="min-w-full text-[13px]">
                <thead className="sticky top-0 bg-surface-tint">
                  <tr>
                    <th className="px-3 py-2 text-left font-bold">Row</th>
                    <th className="px-3 py-2 text-left font-bold">Episode</th>
                    <th className="px-3 py-2 text-left font-bold">Outcome</th>
                    <th className="px-3 py-2 text-left font-bold">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {result.details.map((d, index) => (
                    <tr key={index} className="border-t border-line/60">
                      <td className="px-3 py-1.5 text-ink-muted">{d.row_number || '—'}</td>
                      <td className="px-3 py-1.5">{d.episode_id ?? '—'}</td>
                      <td className="px-3 py-1.5 capitalize">{d.outcome}</td>
                      <td className="px-3 py-1.5 text-ink-muted">{d.reason ?? ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

function Stat({ label, value, tone }: { label: string; value: number; tone: 'ok' | 'warn' | 'neutral' }) {
  const toneClass = tone === 'ok' ? 'text-ok' : tone === 'warn' ? 'text-warn' : 'text-ink'
  return (
    <div>
      <p className={`text-lg font-bold ${toneClass}`}>{value}</p>
      <p className="text-[11px] uppercase tracking-wide text-ink-faint">{label}</p>
    </div>
  )
}
