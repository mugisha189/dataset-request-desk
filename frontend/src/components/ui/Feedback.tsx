import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'
import { Button } from './Button'
import { Icon } from './Icons'

export function Alert({
  tone = 'danger',
  children,
  className,
}: {
  tone?: 'danger' | 'warn' | 'ok' | 'info'
  children: ReactNode
  className?: string
}) {
  const tones = {
    danger: 'bg-danger/8 text-danger border-danger/20',
    warn: 'bg-warn/8 text-warn border-warn/20',
    ok: 'bg-ok/8 text-ok border-ok/20',
    info: 'bg-surface-tint text-ink-muted border-line',
  }
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={cn('rounded-lg border px-3.5 py-2.5 text-[13px] font-medium', tones[tone], className)}>
      {children}
    </div>
  )
}

export function EmptyState({
  title,
  lead,
  action,
  icon,
  className,
}: {
  title: string
  lead?: string
  action?: ReactNode
  icon?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-card border border-dashed border-line bg-white px-6 py-14 text-center',
        className,
      )}
    >
      {icon && <div className="mb-4 text-ink-faint">{icon}</div>}
      <p className="text-base font-bold text-ink">{title}</p>
      {lead && <p className="mt-1.5 max-w-sm text-sm text-ink-muted">{lead}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <EmptyState
      icon={<Icon.Alert className="h-8 w-8" />}
      title={message}
      action={
        onRetry ? (
          <Button variant="secondary" size="sm" onClick={onRetry}>
            Try again
          </Button>
        ) : undefined
      }
    />
  )
}
