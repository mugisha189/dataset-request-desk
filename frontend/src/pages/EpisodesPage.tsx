import { useRef, useState, type FormEvent, type ReactNode } from 'react'
import { episodesApi } from '../api/client'
import type { Episode, ImportResult, Quality } from '../api/types'
import { PageHeader } from '../components/layout/AppLayout'
import { Button } from '../components/ui/Button'
import { QualityChip } from '../components/ui/Chip'
import { DataTable, type DataTableAction, type DataTableColumn } from '../components/ui/DataTable'
import { Alert } from '../components/ui/Feedback'
import { Icon } from '../components/ui/Icons'
import { Sheet, SheetContent, SheetFooter, SheetTrigger } from '../components/ui/Sheet'
import { cn } from '../lib/utils'
import { formatDateTime } from '../lib/format'
import { useAsync, useDebounced } from '../lib/useAsync'

const QUALITY_OPTIONS = [
  { label: 'Good', value: 'good' },
  { label: 'Usable', value: 'usable' },
  { label: 'Bad', value: 'bad' },
]

const SORT_OPTIONS = [
  { label: 'Recorded (newest)', value: 'recorded_at,desc' },
  { label: 'Recorded (oldest)', value: 'recorded_at,asc' },
  { label: 'Duration', value: 'duration_seconds,desc' },
  { label: 'Task name', value: 'task_name,asc' },
  { label: 'Robot', value: 'robot_id,asc' },
]

const PAGE_SIZE = 20

export function EpisodesPage() {
  const [searchValue, setSearchValue] = useState('')
  const [quality, setQuality] = useState<Quality | ''>('')
  const [sort, setSort] = useState('')
  const [pageIndex, setPageIndex] = useState(0)
  const [viewEpisode, setViewEpisode] = useState<Episode | null>(null)
  const debouncedTask = useDebounced(searchValue, 300)

  const {
    data: episodePage,
    loading,
    error,
    reload,
  } = useAsync(
    (signal) =>
      episodesApi.list(
        { task_name: debouncedTask || undefined, quality: quality || undefined, sort: sort || undefined, page: pageIndex, page_size: PAGE_SIZE },
        signal,
      ),
    [debouncedTask, quality, sort, pageIndex],
  )
  const episodes = episodePage?.items ?? []
  const pageCount = Math.max(1, Math.ceil((episodePage?.total ?? 0) / PAGE_SIZE))

  const columns: DataTableColumn<Episode>[] = [
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

  const actions: DataTableAction<Episode>[] = [
    { name: 'View', icon: <Icon.Eye className="h-4 w-4" />, action: (e) => setViewEpisode(e) },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Episodes" lead="Recorded episode metadata, imported from the recording system's CSV export." />

      {error && <Alert className="mb-3">{error}</Alert>}

      <DataTable
        columns={columns}
        data={episodes}
        keyExtractor={(e) => e.id}
        isLoading={loading}
        search={{
          value: searchValue,
          onChange: (v) => {
            setSearchValue(v)
            setPageIndex(0)
          },
          placeholder: 'Search episode, task or operator…',
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
        sort={{ options: SORT_OPTIONS, value: sort, onChange: (v) => { setSort(v); setPageIndex(0) } }}
        pagination={{
          pageIndex,
          pageSize: PAGE_SIZE,
          totalCount: episodePage?.total ?? 0,
          pageCount,
          onPageChange: setPageIndex,
        }}
        onClearFilters={() => {
          setSearchValue('')
          setQuality('')
          setSort('')
          setPageIndex(0)
        }}
        actions={actions}
        cardRenderer={(e) => <EpisodeCard episode={e} />}
        titleActions={<ImportButton onImported={reload} />}
        export={{
          getDownloadUrl: () => episodesApi.exportUrl({ task_name: debouncedTask || undefined, quality: quality || undefined }),
          defaultFilename: 'episodes',
        }}
        noDataComponent={<div className="py-16 text-center text-sm text-ink-muted">No episodes match this filter</div>}
      />

      <EpisodeDetailSheet episode={viewEpisode} onOpenChange={(open) => !open && setViewEpisode(null)} />
    </div>
  )
}

function EpisodeCard({ episode }: { episode: Episode }) {
  return (
    <div className="flex h-full flex-col gap-2 rounded-card border border-line bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-ink">{episode.episode_id}</p>
        <QualityChip quality={episode.quality} />
      </div>
      <p className="text-[13px] text-ink-muted">{episode.robot_id} · {episode.task_name}</p>
      <div className="mt-auto flex items-center justify-between gap-2 pr-9 text-[13px] text-ink-muted">
        <span className="truncate">{episode.duration_seconds}s · {episode.operator_name}</span>
        <span className="whitespace-nowrap">{episode.is_assigned ? 'Assigned' : '—'}</span>
      </div>
    </div>
  )
}

function EpisodeDetailSheet({ episode, onOpenChange }: { episode: Episode | null; onOpenChange: (open: boolean) => void }) {
  return (
    <Sheet open={episode != null} onOpenChange={onOpenChange}>
      <SheetContent title="Episode" description={episode?.episode_id} width="w-full sm:w-[420px]">
        {episode && (
          <div className="space-y-4 px-6 py-5">
            <DetailRow label="Episode ID" value={episode.episode_id} />
            <DetailRow label="Robot" value={episode.robot_id} />
            <DetailRow label="Task" value={episode.task_name} />
            <DetailRow label="Recorded" value={formatDateTime(episode.recorded_at)} />
            <DetailRow label="Duration" value={`${episode.duration_seconds}s`} />
            <DetailRow label="Operator" value={episode.operator_name} />
            <DetailRow label="Quality" value={<QualityChip quality={episode.quality} />} />
            <DetailRow label="Assigned" value={episode.is_assigned ? 'Yes' : 'No'} />
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line/60 pb-3 text-sm">
      <span className="font-semibold text-ink-muted">{label}</span>
      <span className="text-right text-ink">{value}</span>
    </div>
  )
}

/** An icon button that opens a sheet, matching the export button's footprint in the toolbar. */
function ImportButton({ onImported }: { onImported: () => void }) {
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)

  function reset() {
    setFileName(null)
    setResult(null)
    setError(null)
    if (inputRef.current) inputRef.current.value = ''
  }

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
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) reset()
      }}
    >
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Import"
          title="Import CSV"
          className="grid h-9 w-9 place-items-center rounded-lg border border-line bg-white text-ink-muted transition-colors hover:border-ink/30 hover:text-ink"
        >
          <Icon.Upload className="h-4 w-4" />
        </button>
      </SheetTrigger>
      <SheetContent
        title="Import episode metadata"
        description="From the recording system's CSV export."
        width="w-full sm:w-[480px]"
      >
        <form id="episode-import-form" onSubmit={onSubmit} className="space-y-4 px-6 py-5">
          <p className="text-[13px] text-ink-muted">
            Re-importing the same file is safe: rows already in the database are reported as duplicates, not re-added.
          </p>

          <label
            htmlFor="episode-import-file"
            className="flex cursor-pointer flex-col items-center gap-2 rounded-card border border-dashed border-line bg-surface-tint px-4 py-8 text-center transition-colors hover:border-ink/30"
          >
            <Icon.Upload className="h-6 w-6 text-ink-faint" />
            <span className="text-sm font-semibold text-ink">{fileName ?? 'Choose a CSV file'}</span>
            <span className="text-xs text-ink-faint">or drag it here</span>
          </label>
          <input
            id="episode-import-file"
            ref={inputRef}
            type="file"
            accept=".csv"
            className="sr-only"
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
          />

          {error && <Alert>{error}</Alert>}

          {result && (
            <div className="space-y-3">
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
        </form>
        <SheetFooter>
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
            {result ? 'Done' : 'Cancel'}
          </Button>
          {!result && (
            <Button type="submit" form="episode-import-form" disabled={importing || !fileName}>
              {importing ? 'Importing…' : 'Import CSV'}
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

function Stat({ label, value, tone }: { label: string; value: number; tone: 'ok' | 'warn' | 'neutral' }) {
  return (
    <div>
      <p className={cn('text-lg font-bold', tone === 'ok' ? 'text-ok' : tone === 'warn' ? 'text-warn' : 'text-ink')}>{value}</p>
      <p className="text-[11px] uppercase tracking-wide text-ink-faint">{label}</p>
    </div>
  )
}
