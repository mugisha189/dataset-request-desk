import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../../lib/utils'
import { Button } from './Button'
import { Select } from './Field'
import { downloadExport } from '../../api/client'
import { Icon } from './Icons'
import { ExportMenu, type DataTableExportConfig } from './ExportMenu'

/**
 * The table used across every listing in the app -- ported from the reference design system so
 * every screen that shows rows of data behaves the same: the same toolbar, the same collapsible
 * filter panel, the same export menu, the same row-action portal.
 *
 * Everything is controlled -- search, filters, sort and pagination report changes and render
 * what they're given. Nothing filters in the browser, so a listing of many thousand rows costs
 * the same as one of a dozen.
 */

const ACTIONS_MENU_ESTIMATE_HEIGHT = 200
const ACTIONS_MENU_WIDTH = 176

export interface DataTableColumn<T> {
  id: string
  header: string
  accessor?: (row: T) => unknown
  cell?: (row: T) => ReactNode
  className?: string
}

export interface DataTablePaginationConfig {
  pageIndex: number
  pageSize: number
  totalCount: number
  pageCount: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (size: number) => void
}

export interface DataTableSearchConfig {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export interface DataTableAction<T> {
  name: string
  icon: ReactNode
  action: (row: T) => void
  /** When false, the action is hidden for that row. Defaults to true. */
  visible?: (row: T) => boolean
  /** When true, the action is shown but not clickable. Defaults to false. */
  disabled?: (row: T) => boolean
  /** Drawn in red. For anything that removes or reverses. */
  destructive?: boolean
}

export interface DataTableFilterOption {
  label: string
  value: string
}

export interface DataTableFilterConfig {
  label: string
  value: string
  onChange: (value: string) => void
  options?: DataTableFilterOption[]
  /** A control of its own, when a plain select will not do. */
  render?: (props: { value: string; onChange: (value: string) => void }) => ReactNode
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[]
  data: T[]
  keyExtractor: (row: T) => string | number
  pagination?: DataTablePaginationConfig
  search?: DataTableSearchConfig
  filters?: DataTableFilterConfig[]
  actions?: DataTableAction<T>[]
  titleActions?: ReactNode
  export?: DataTableExportConfig
  defaultFiltersOpen?: boolean
  isLoading?: boolean
  loadingText?: string
  noDataComponent?: ReactNode
  onClearFilters?: () => void
  /** Card layout for one row in card view. Row actions are overlaid automatically as a floating
   *  button (bottom-right) -- a card renderer just lays out the row's own content. */
  cardRenderer?: (row: T) => ReactNode
  /** Which view a table with a `cardRenderer` opens in. Defaults to 'table' on a wide screen and
   *  'cards' below the sm breakpoint, where columns stop fitting comfortably. */
  defaultViewMode?: 'table' | 'cards'
  /** Grid column classes for card view. Defaults to a 1/2/3/4-column ramp. */
  cardGridClassName?: string
}

function EmptyDataIllustration({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 400 280" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <circle cx="200" cy="130" r="100" className="fill-gold/[0.06]" />
      <circle cx="200" cy="128" r="78" className="fill-gold/[0.04]" />
      <rect x="100" y="48" width="200" height="165" rx="12" className="fill-white" />
      <rect x="100" y="48" width="200" height="165" rx="12" className="stroke-gold/20" strokeWidth="1.5" fill="none" />
      <rect x="100" y="48" width="200" height="36" rx="12" className="fill-gold/10" />
      <rect x="116" y="60" width="8" height="8" rx="4" className="fill-gold/25" />
      <rect x="130" y="60" width="8" height="8" rx="4" className="fill-gold/20" />
      <rect x="144" y="60" width="8" height="8" rx="4" className="fill-gold/15" />
      <line x1="120" y1="100" x2="280" y2="100" className="stroke-gold/15" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="120" y1="118" x2="260" y2="118" className="stroke-gold/[0.12]" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="120" y1="136" x2="270" y2="136" className="stroke-gold/[0.12]" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="120" y1="154" x2="240" y2="154" className="stroke-gold/10" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="200" cy="175" r="32" className="fill-gold/10" />
      <path d="M200 162v26M200 194v4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-gold/60" />
      <circle cx="200" cy="158" r="3" fill="currentColor" className="text-gold/50" />
      <circle cx="310" cy="85" r="16" className="fill-gold/10" />
      <circle cx="88" cy="195" r="12" className="fill-gold/[0.08]" />
    </svg>
  )
}

export function DataTableNoData({ title, description }: { title?: string; description?: string }) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mx-auto flex w-full max-w-[280px] justify-center">
        <EmptyDataIllustration className="h-auto max-h-[200px] w-full text-gold" />
      </div>
      <div className="mx-auto mt-6 max-w-md space-y-2">
        <h2 className="text-lg font-bold text-ink">{title ?? 'Nothing here yet'}</h2>
        <p className="text-sm leading-relaxed text-ink-muted">{description ?? 'Once there is data, it will show up here.'}</p>
      </div>
    </div>
  )
}

/** First, last, current ± 1, with ellipsis for the gaps. */
function buildPageButtons(current: number, total: number): (number | '…')[] {
  if (total <= 5) return Array.from({ length: total }, (_, index) => index)

  const pages = new Set<number>([0, total - 1, current])
  if (current > 0) pages.add(current - 1)
  if (current < total - 1) pages.add(current + 1)

  const sorted = [...pages].sort((a, b) => a - b)
  const result: (number | '…')[] = []
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push('…')
    result.push(sorted[i])
  }
  return result
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  pagination,
  search,
  filters,
  actions,
  titleActions,
  export: exportConfig,
  defaultFiltersOpen = false,
  isLoading = false,
  loadingText,
  noDataComponent,
  onClearFilters,
  cardRenderer,
  defaultViewMode = 'table',
  cardGridClassName = 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
}: DataTableProps<T>) {
  const numberFormat = useMemo(() => new Intl.NumberFormat('en-GB'), [])

  const [viewMode, setViewMode] = useState<'table' | 'cards'>(() => {
    if (cardRenderer && typeof window !== 'undefined' && window.innerWidth < 640) return 'cards'
    return defaultViewMode
  })
  const [openActionRow, setOpenActionRow] = useState<string | number | null>(null)
  const [actionMenuRect, setActionMenuRect] = useState<DOMRect | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(defaultFiltersOpen)

  useEffect(() => {
    if (openActionRow == null) setActionMenuRect(null)
  }, [openActionRow])

  // A card renderer forces card view under the sm breakpoint -- a table's columns stop fitting
  // comfortably there, and a phone rotated back to landscape returns to whatever was picked.
  useEffect(() => {
    if (!cardRenderer) return
    const query = window.matchMedia('(max-width: 639px)')
    const onChange = (event: MediaQueryListEvent) => setViewMode(event.matches ? 'cards' : defaultViewMode)
    if (query.matches) setViewMode('cards')
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [cardRenderer, defaultViewMode])

  const cell = useCallback((row: T, column: DataTableColumn<T>): ReactNode => {
    if (column.cell) return column.cell(row)
    if (column.accessor) {
      const value = column.accessor(row)
      return value != null ? String(value) : ''
    }
    return ''
  }, [])

  const hasActions = Boolean(actions && actions.length > 0)
  const colSpan = columns.length + (hasActions ? 1 : 0)
  const showFilterToggle = (filters?.length ?? 0) > 0

  return (
    <div className="space-y-2">
      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2 sm:flex-row">
        {search && (
          <div className="min-w-[180px] max-w-[300px] flex-1">
            <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-ink-faint">Search</div>
            <div className="flex items-center gap-2">
              <div className="relative min-w-0 flex-1">
                <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint">
                  <Icon.Search className="h-4 w-4" />
                </span>
                <input
                  type="search"
                  value={search.value}
                  onChange={(event) => search.onChange(event.target.value)}
                  placeholder={search.placeholder ?? 'Search…'}
                  aria-label={search.placeholder ?? 'Search'}
                  className="h-9 w-full rounded-lg border border-line bg-surface-tint pl-9 pr-3 text-sm text-ink placeholder:text-ink-faint focus:border-ink/30 focus:outline-none focus:ring-2 focus:ring-gold/15"
                />
              </div>
              {showFilterToggle && <FilterToggle open={filtersOpen} onToggle={() => setFiltersOpen((was) => !was)} />}
            </div>
          </div>
        )}

        {!search && showFilterToggle && <FilterToggle open={filtersOpen} onToggle={() => setFiltersOpen((was) => !was)} />}

        <div className="ml-auto flex shrink-0 items-end gap-2">
          {titleActions}
          <div className="flex items-center gap-2">
            {exportConfig && (
              <ExportMenu
                onDownload={async (format) => {
                  const { path, params } = exportConfig.getDownloadUrl(format)
                  await downloadExport(path, { ...params, format }, `${exportConfig.defaultFilename ?? 'export'}.${format}`)
                }}
              />
            )}
            {cardRenderer && (
              <>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  aria-label="Table view"
                  aria-pressed={viewMode === 'table'}
                  className={cn(
                    'grid h-9 w-9 place-items-center rounded-lg border transition-colors',
                    viewMode === 'table' ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink-muted hover:border-ink/30 hover:text-ink',
                  )}
                >
                  <Icon.List className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('cards')}
                  aria-label="Card view"
                  aria-pressed={viewMode === 'cards'}
                  className={cn(
                    'grid h-9 w-9 place-items-center rounded-lg border transition-colors',
                    viewMode === 'cards' ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink-muted hover:border-ink/30 hover:text-ink',
                  )}
                >
                  <Icon.Grid className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Filters, collapsed until asked for ─────────────────────────────── */}
      {showFilterToggle && (
        <div
          className="grid transition-[grid-template-rows] duration-300 ease-in-out"
          style={{ gridTemplateRows: filtersOpen ? '1fr' : '0fr' }}
        >
          <div className="overflow-hidden">
            <div className="flex flex-wrap items-end gap-3 rounded-lg border-b border-line/50 bg-white/50 p-2">
              {filters?.map((filter) => (
                <div key={filter.label} className="min-w-[160px]">
                  <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-ink-faint">{filter.label}</div>
                  {filter.render ? (
                    filter.render({ value: filter.value, onChange: filter.onChange })
                  ) : (
                    <Select value={filter.value} onChange={(event) => filter.onChange(event.target.value)} aria-label={filter.label}>
                      <option value="">All</option>
                      {filter.options?.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  )}
                </div>
              ))}

              {onClearFilters && (
                <div className="ml-auto flex items-center">
                  <Button type="button" variant="secondary" size="sm" onClick={onClearFilters} className="h-9 gap-2 rounded-lg">
                    <Icon.Close className="h-4 w-4" />
                    Clear filters
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Table ────────────────────────────────────────────────────────── */}
      {viewMode === 'table' && (
      <div className="overflow-x-auto rounded-card border border-line bg-white">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="bg-surface-tint">
              {columns.map((column) => (
                <th key={column.id} className={cn('h-12 border-b border-line/50 text-left text-sm font-bold text-ink first:pl-4 last:pr-4', column.className)}>
                  {column.header}
                </th>
              ))}
              {hasActions && <th className="h-12 w-[100px] border-b border-line/50 pr-4 text-right text-sm font-bold text-ink">Actions</th>}
            </tr>
          </thead>

          <tbody>
            {isLoading ? (
              <>
                <tr className="sr-only">
                  <td colSpan={colSpan}>{loadingText ?? 'Loading…'}</td>
                </tr>
                {Array.from({ length: 10 }, (_, index) => (
                  <tr key={index} className={cn('border-b border-line/50', index % 2 === 0 ? 'bg-white' : 'bg-surface-tint/35')}>
                    {columns.map((column, columnIndex) => (
                      <td key={column.id} className="h-11 px-2 py-2 first:pl-4 last:pr-4">
                        <div className={cn('h-3 animate-pulse rounded bg-ink/10', columnIndex === 0 ? 'w-24' : columnIndex === 1 ? 'w-40' : 'w-28')} />
                      </td>
                    ))}
                    {hasActions && (
                      <td className="h-11 w-[100px] px-2 py-2 pr-4">
                        <div className="flex items-center justify-center">
                          <div className="h-9 w-9 animate-pulse rounded-full bg-ink/10" />
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </>
            ) : data.length === 0 ? (
              <tr className="bg-white">
                <td colSpan={colSpan} className="px-4">
                  {noDataComponent ?? <DataTableNoData />}
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => (
                <tr key={keyExtractor(row)} className={cn('border-b border-line/50 transition-colors hover:bg-surface-tint/45', rowIndex % 2 === 0 ? 'bg-white' : 'bg-surface-tint/35')}>
                  {columns.map((column) => (
                    <td key={column.id} className={cn('h-11 px-2 py-2 text-sm text-ink first:pl-4 last:pr-4', column.className)}>
                      {cell(row, column)}
                    </td>
                  ))}
                  {hasActions && (
                    <td className="h-11 w-[100px] px-2 py-2 pr-4">
                      <div className="flex items-center justify-center">
                        <ActionButton
                          onOpen={(rect) => {
                            const key = keyExtractor(row)
                            if (openActionRow === key) {
                              setOpenActionRow(null)
                              return
                            }
                            setActionMenuRect(rect)
                            setOpenActionRow(key)
                          }}
                        />
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      )}

      {/* ── Cards ────────────────────────────────────────────────────────── */}
      {viewMode === 'cards' && (
        isLoading ? (
          <div className={cn('grid gap-3', cardGridClassName)}>
            <span className="sr-only">{loadingText ?? 'Loading…'}</span>
            {Array.from({ length: 8 }, (_, index) => (
              <div key={index} className="overflow-hidden rounded-card border border-line bg-white">
                <div className="h-20 animate-pulse bg-surface-tint" />
                <div className="space-y-2 p-4">
                  <div className="h-3.5 w-32 animate-pulse rounded bg-ink/10" />
                  <div className="h-3 w-24 animate-pulse rounded bg-ink/10" />
                </div>
              </div>
            ))}
          </div>
        ) : data.length === 0 ? (
          noDataComponent ?? <DataTableNoData />
        ) : (
          <div className={cn('grid gap-3', cardGridClassName)}>
            {data.map((row) => {
              const key = keyExtractor(row)
              const visibleActions = actions?.filter((one) => one.visible == null || one.visible(row)) ?? []
              return (
                <div key={key} className="group relative h-full [&>*:first-child]:h-full">
                  {cardRenderer ? cardRenderer(row) : <DefaultCard columns={columns} row={row} cell={cell} />}
                  {visibleActions.length > 0 && (
                    <button
                      type="button"
                      aria-label="Actions"
                      onClick={(event) => {
                        const rect = event.currentTarget.getBoundingClientRect()
                        if (openActionRow === key) {
                          setOpenActionRow(null)
                          return
                        }
                        setActionMenuRect(rect)
                        setOpenActionRow(key)
                      }}
                      className="absolute bottom-3 right-3 z-10 grid h-8 w-8 place-items-center rounded-full border border-line bg-white/90 text-ink-muted opacity-100 shadow-card backdrop-blur-sm transition-all hover:bg-white hover:text-ink sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                    >
                      <Icon.MoreVertical className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )
      )}

      {/* ── The row menu, in a portal so no row can clip it ──────────────── */}
      {hasActions && openActionRow != null && actionMenuRect != null && (
        <ActionsPortal rect={actionMenuRect} actions={actions!} row={data.find((one) => keyExtractor(one) === openActionRow)} onClose={() => setOpenActionRow(null)} />
      )}

      {/* ── Pagination ───────────────────────────────────────────────────── */}
      {pagination && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-white p-2 sm:p-3">
          <div className="flex items-center gap-3">
            <div className="text-sm text-ink-muted" dir="auto">
              Showing {numberFormat.format(pagination.pageIndex * pagination.pageSize + 1)}–
              {numberFormat.format(Math.min((pagination.pageIndex + 1) * pagination.pageSize, pagination.totalCount))} of{' '}
              {numberFormat.format(pagination.totalCount)}
            </div>

            {pagination.onPageSizeChange && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-ink-muted">Show</span>
                <select
                  value={pagination.pageSize}
                  onChange={(event) => pagination.onPageSizeChange?.(Number(event.target.value))}
                  aria-label="Rows per page"
                  className="h-9 w-20 rounded-lg border border-line bg-white px-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink/20"
                >
                  {[10, 25, 50, 100].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => pagination.onPageChange(pagination.pageIndex - 1)} disabled={pagination.pageIndex <= 0} className="h-10 rounded-lg">
              Previous
            </Button>

            {buildPageButtons(pagination.pageIndex, pagination.pageCount).map((item, index) =>
              item === '…' ? (
                <span key={`gap-${index}`} className="flex h-10 min-w-[42px] select-none items-center justify-center text-sm text-ink-faint">
                  …
                </span>
              ) : (
                <button
                  key={item}
                  type="button"
                  onClick={() => pagination.onPageChange(item)}
                  aria-current={item === pagination.pageIndex ? 'page' : undefined}
                  className={cn(
                    'h-10 min-w-[42px] rounded-lg border text-sm font-bold transition-colors',
                    item === pagination.pageIndex ? 'border-ink bg-ink text-white' : 'border-line bg-surface-tint text-ink hover:bg-line',
                  )}
                >
                  {item + 1}
                </button>
              ),
            )}

            <Button
              variant="secondary"
              size="sm"
              onClick={() => pagination.onPageChange(pagination.pageIndex + 1)}
              disabled={pagination.pageIndex >= pagination.pageCount - 1}
              className="h-10 rounded-lg"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function FilterToggle({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-label={open ? 'Hide filters' : 'Show filters'}
      className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-lg border transition-colors', open ? 'border-ink bg-ink text-white' : 'border-line bg-surface-tint text-ink hover:bg-line/40')}
    >
      <Icon.Filter className="h-4 w-4" />
    </button>
  )
}

/** Falls back to this when card view is on but the caller didn't shape a card of its own --
 *  every column's header/value as a stacked field list. */
function DefaultCard<T>({ columns, row, cell }: { columns: DataTableColumn<T>[]; row: T; cell: (row: T, column: DataTableColumn<T>) => ReactNode }) {
  return (
    <div className="h-full space-y-2 rounded-card border border-line bg-white p-4">
      {columns.map((column) => (
        <div key={column.id}>
          <div className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">{column.header}</div>
          <div className="text-sm text-ink">{cell(row, column)}</div>
        </div>
      ))}
    </div>
  )
}

function ActionButton({ onOpen }: { onOpen: (rect: DOMRect) => void }) {
  return (
    <button
      type="button"
      onClick={(event) => onOpen(event.currentTarget.getBoundingClientRect())}
      aria-label="Actions"
      className="grid h-9 w-9 place-items-center rounded-full bg-ink text-white transition-colors hover:bg-ink-soft"
    >
      <Icon.MoreVertical className="h-5 w-5" />
    </button>
  )
}

/** The row menu, rendered into `document.body` so a table cell can't clip it. Positioned by
 * hand rather than by CSS: it flips above the button when there's no room below, which is
 * exactly where a table's last row always is. */
function ActionsPortal<T>({ rect, actions, row, onClose }: { rect: DOMRect; actions: DataTableAction<T>[]; row: T | undefined; onClose: () => void }) {
  if (!row) return null

  const spaceBelow = typeof window !== 'undefined' ? window.innerHeight - rect.bottom : 999
  const above = spaceBelow < ACTIONS_MENU_ESTIMATE_HEIGHT && rect.top > spaceBelow
  const left = Math.max(8, Math.min(rect.right - ACTIONS_MENU_WIDTH, typeof window !== 'undefined' ? window.innerWidth - ACTIONS_MENU_WIDTH - 8 : rect.right))

  const style: CSSProperties = above
    ? { left, bottom: window.innerHeight - rect.top + 4, maxHeight: 'min(280px, 50vh)' }
    : { left, top: rect.bottom + 4, maxHeight: 'min(280px, 50vh)' }

  const visible = actions.filter((one) => one.visible == null || one.visible(row))

  return createPortal(
    <>
      <div className="fixed inset-0 z-40" aria-hidden onClick={onClose} />
      <div role="menu" className="fixed z-50 min-w-[160px] overflow-y-auto rounded-xl border border-line bg-white py-1 shadow-raised" style={style}>
        {visible.map((action) => {
          const disabled = action.disabled?.(row) ?? false
          return (
            <button
              key={action.name}
              type="button"
              role="menuitem"
              disabled={disabled}
              onClick={() => {
                if (disabled) return
                onClose()
                setTimeout(() => action.action(row), 0)
              }}
              className={cn(
                'flex w-full items-center gap-2 px-4 py-2 text-left text-sm transition-colors',
                action.destructive ? 'text-danger hover:bg-danger/10' : 'text-ink hover:bg-surface-tint',
                disabled && 'cursor-not-allowed opacity-50 hover:bg-transparent',
              )}
            >
              {action.icon}
              {action.name}
            </button>
          )
        })}
      </div>
    </>,
    document.body,
  )
}
