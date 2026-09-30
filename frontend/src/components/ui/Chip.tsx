import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'
import type { Quality, RequestStatus } from '../../api/types'

export type ChipTone = 'neutral' | 'gold' | 'ok' | 'warn' | 'danger' | 'dark'

const TONES: Record<ChipTone, string> = {
  neutral: 'bg-surface-sunk text-ink-muted border-line',
  gold: 'bg-gold-soft text-gold border-gold/20',
  ok: 'bg-ok/10 text-ok border-ok/20',
  warn: 'bg-warn/10 text-warn border-warn/20',
  danger: 'bg-danger/10 text-danger border-danger/20',
  dark: 'bg-ink text-white border-transparent',
}

export function Chip({ children, tone = 'neutral', className }: { children: ReactNode; tone?: ChipTone; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-pill border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

/** A filter pill: the near-black fill when active, a hairline on white otherwise. */
export function ChipButton({
  children,
  active = false,
  onClick,
  className,
}: {
  children: ReactNode
  active?: boolean
  onClick: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-pill border px-3.5 py-1.5 text-[13px] font-bold transition-colors',
        active ? 'border-transparent bg-ink text-white' : 'border-line bg-white text-ink-muted hover:border-ink/25 hover:text-ink',
        className,
      )}
    >
      {children}
    </button>
  )
}

const STATUS_TONE: Record<RequestStatus, ChipTone> = {
  submitted: 'neutral',
  in_progress: 'warn',
  delivered: 'gold',
  accepted: 'ok',
  rejected: 'danger',
}

const STATUS_LABEL: Record<RequestStatus, string> = {
  submitted: 'Submitted',
  in_progress: 'In progress',
  delivered: 'Delivered',
  accepted: 'Accepted',
  rejected: 'Rejected',
}

export function StatusChip({ status, className }: { status: RequestStatus; className?: string }) {
  return (
    <Chip tone={STATUS_TONE[status]} className={className}>
      {STATUS_LABEL[status]}
    </Chip>
  )
}

const QUALITY_TONE: Record<Quality, ChipTone> = { good: 'ok', usable: 'warn', bad: 'danger' }

export function QualityChip({ quality, className }: { quality: Quality; className?: string }) {
  return (
    <Chip tone={QUALITY_TONE[quality]} className={className}>
      {quality}
    </Chip>
  )
}
