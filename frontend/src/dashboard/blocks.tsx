import type { ReactNode } from 'react'
import { cn } from '../lib/utils'
import { pct } from './palette'

export function StatCard({
  icon,
  tone = 'neutral',
  label,
  value,
  sub,
  onClick,
}: {
  icon: ReactNode
  tone?: 'neutral' | 'gold' | 'ok' | 'warn' | 'danger'
  label: ReactNode
  value: string | number
  sub?: string
  onClick?: () => void
}) {
  const tones = {
    neutral: 'bg-surface-tint text-ink-muted',
    gold: 'bg-gold-soft text-gold',
    ok: 'bg-ok/10 text-ok',
    warn: 'bg-warn/10 text-warn',
    danger: 'bg-danger/10 text-danger',
  }

  return (
    <div
      onClick={onClick}
      className={cn('flex min-h-[110px] flex-col justify-between rounded-card border border-line bg-white p-5 transition-all', onClick && 'cursor-pointer hover:border-gold/40 hover:shadow-raised')}
    >
      <div className="flex items-start justify-between">
        <span className={cn('grid h-12 w-12 place-items-center rounded-2xl', tones[tone])}>{icon}</span>
      </div>

      <div className="mt-3">
        <p className="tnum text-2xl font-bold leading-tight text-ink">{value}</p>
        <p className="mt-0.5 text-sm font-medium text-ink-muted">{label}</p>
        {sub && <p className="mt-1 text-xs text-ink-faint">{sub}</p>}
      </div>
    </div>
  )
}

export function SectionHeader({
  icon,
  title,
  tone = 'neutral',
  action,
}: {
  icon: ReactNode
  title: string
  tone?: 'neutral' | 'gold' | 'ok' | 'warn' | 'danger'
  action?: ReactNode
}) {
  const tones = {
    neutral: 'bg-surface-tint text-ink-muted',
    gold: 'bg-gold-soft text-gold',
    ok: 'bg-ok/10 text-ok',
    warn: 'bg-warn/10 text-warn',
    danger: 'bg-danger/10 text-danger',
  }

  return (
    <div className="mb-4 flex items-center gap-2.5">
      <span className={cn('grid h-7 w-7 place-items-center rounded-lg', tones[tone])}>{icon}</span>
      <h2 className="text-sm font-bold uppercase tracking-wide text-ink">{title}</h2>
      {action && <div className="ml-auto">{action}</div>}
    </div>
  )
}

export function ProgressBar({ label, value, total, color, formatted }: { label: string; value: number; total: number; color: string; formatted?: string }) {
  const share = pct(value, total)
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="truncate text-ink-muted">{label}</span>
        <span className="tnum shrink-0 font-medium text-ink">
          {formatted ?? value}
          <span className="text-ink-faint"> · {share}%</span>
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-sunk">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${share}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

export function Panel({ title, action, children, className }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn('overflow-hidden rounded-card border border-line bg-white', className)}>
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <h3 className="text-sm font-bold text-ink">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  )
}

export function StatCardSkeleton() {
  return <div className="h-[110px] animate-pulse rounded-card border border-line bg-surface-tint" />
}

export function SectionSkeleton({ cards = 4 }: { cards?: number }) {
  return (
    <div>
      <div className="mb-4 flex items-center gap-2.5">
        <div className="h-7 w-7 animate-pulse rounded-lg bg-surface-sunk" />
        <div className="h-3.5 w-24 animate-pulse rounded bg-surface-sunk" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: cards }, (_, index) => (
          <StatCardSkeleton key={index} />
        ))}
      </div>
    </div>
  )
}
