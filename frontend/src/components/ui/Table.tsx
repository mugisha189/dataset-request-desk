import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'
import { TableSkeleton } from './Skeleton'
import { EmptyState } from './Feedback'

export interface Column<T> {
  id: string
  header: string
  cell: (row: T) => ReactNode
  className?: string
}

/**
 * A plain table: no card view, no export, no row-action portal -- this app's lists are short
 * enough that those don't earn their complexity. What it keeps from a "real" data table is the
 * part that matters everywhere: a loading skeleton sized like the real rows, and one empty
 * state shared by every page instead of each page inventing its own.
 */
export function Table<T>({
  columns,
  data,
  keyExtractor,
  isLoading,
  emptyTitle = 'Nothing here yet',
  emptyLead,
  rowClassName,
}: {
  columns: Column<T>[]
  data: T[]
  keyExtractor: (row: T) => string
  isLoading?: boolean
  emptyTitle?: string
  emptyLead?: string
  rowClassName?: (row: T) => string | undefined
}) {
  return (
    <div className="overflow-x-auto rounded-card border border-line bg-white">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-surface-tint">
            {columns.map((column) => (
              <th
                key={column.id}
                className={cn('h-11 border-b border-line/70 text-left text-[13px] font-bold text-ink first:pl-4 last:pr-4', column.className)}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={columns.length}>
                <TableSkeleton cols={columns.length} />
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4">
                <EmptyState title={emptyTitle} lead={emptyLead} />
              </td>
            </tr>
          ) : (
            data.map((row, index) => (
              <tr
                key={keyExtractor(row)}
                className={cn(
                  'border-b border-line/60 transition-colors hover:bg-surface-tint/60',
                  index % 2 === 0 ? 'bg-white' : 'bg-surface-tint/25',
                  rowClassName?.(row),
                )}
              >
                {columns.map((column) => (
                  <td key={column.id} className={cn('px-3 py-2.5 text-sm text-ink first:pl-4 last:pr-4', column.className)}>
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
