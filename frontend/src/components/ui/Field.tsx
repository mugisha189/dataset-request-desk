import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { useId } from 'react'
import { cn } from '../../lib/utils'
import { CONTROL } from './control'

interface Wrap {
  label?: string
  hint?: string
  error?: string
  required?: boolean
  className?: string
}

function Shell({ id, label, hint, error, required, className, children }: Wrap & { id: string; children: ReactNode }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label htmlFor={id} className="block text-[13px] font-semibold text-ink">
          {label}
          {required && <span className="ml-1 text-danger">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="text-xs text-ink-muted">{hint}</p>}
      {error && (
        <p className="text-xs font-semibold text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

export function Field({ label, hint, error, required, className, ...props }: Wrap & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId()
  return (
    <Shell id={id} label={label} hint={hint} error={error} required={required} className={className}>
      <input
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        className={cn(CONTROL, error && 'border-danger focus:border-danger focus:ring-danger/10')}
        {...props}
      />
    </Shell>
  )
}

export function TextArea({
  label,
  hint,
  error,
  required,
  className,
  rows = 3,
  ...props
}: Wrap & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId()
  return (
    <Shell id={id} label={label} hint={hint} error={error} required={required} className={className}>
      <textarea
        id={id}
        rows={rows}
        required={required}
        aria-invalid={error ? true : undefined}
        className={cn(CONTROL, 'h-auto resize-y py-2', error && 'border-danger')}
        {...props}
      />
    </Shell>
  )
}

export function Select({
  label,
  hint,
  error,
  required,
  className,
  children,
  ...props
}: Wrap & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId()
  return (
    <Shell id={id} label={label} hint={hint} error={error} required={required} className={className}>
      <select
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        className={cn(CONTROL, 'appearance-none bg-no-repeat pr-9', error && 'border-danger')}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23666A78' stroke-width='2' stroke-linecap='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
          backgroundPosition: 'right 0.65rem center',
          backgroundSize: '1.1rem',
        }}
        {...props}
      >
        {children}
      </select>
    </Shell>
  )
}
