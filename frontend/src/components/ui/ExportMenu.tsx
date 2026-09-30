import { useState } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { cn } from '../../lib/utils'
import { Icon } from './Icons'

export type ExportFormat = 'xlsx' | 'pdf' | 'csv'

export interface DataTableExportConfig {
  /** Given a format, the endpoint to fetch the file from. */
  getDownloadUrl: (format: ExportFormat) => { path: string; params: Record<string, unknown> }
  /** Used only if the browser cannot read the filename the server sent. */
  defaultFilename?: string
}

const FORMATS: { format: ExportFormat; label: string }[] = [
  { format: 'xlsx', label: 'Export as Excel' },
  { format: 'pdf', label: 'Export as PDF' },
  { format: 'csv', label: 'Export as CSV' },
]

/**
 * One button that opens a short list of formats.
 *
 * Ported from the reference app's back office: a single download icon that opens a popover of
 * formats, rather than a row of labelled buttons competing with the table's other actions for
 * the same corner.
 */
export function ExportMenu({ onDownload }: { onDownload: (format: ExportFormat) => Promise<void> }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState<ExportFormat | null>(null)
  const [failed, setFailed] = useState(false)

  async function run(format: ExportFormat) {
    setBusy(format)
    setFailed(false)
    try {
      await onDownload(format)
      setOpen(false)
    } catch {
      // Kept open on failure: closing the menu would leave the person with no file and no
      // explanation of why.
      setFailed(true)
    } finally {
      setBusy(null)
    }
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label="Export"
          title="Export"
          className={cn(
            'grid h-9 w-9 place-items-center rounded-lg border transition-colors',
            open ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink-muted hover:border-ink/30 hover:text-ink',
          )}
        >
          <Icon.Download className="h-4 w-4" />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content align="end" sideOffset={6} className="z-50 w-48 rounded-card border border-line bg-white p-1 shadow-raised">
          <p className="px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-faint">Export</p>
          {FORMATS.map(({ format, label }) => (
            <button
              key={format}
              type="button"
              onClick={() => void run(format)}
              disabled={busy !== null}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-bold text-ink-muted transition-colors hover:bg-surface-tint hover:text-ink disabled:opacity-50"
            >
              <Icon.Download className="h-3.5 w-3.5 shrink-0" />
              {label}
              {busy === format && <span className="ml-auto h-3 w-3 animate-spin rounded-full border-2 border-ink/20 border-t-ink" />}
            </button>
          ))}
          {failed && <p className="px-2.5 pb-1.5 pt-1 text-[11px] text-danger">Export failed. Try again.</p>}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
