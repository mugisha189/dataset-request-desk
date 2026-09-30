import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { cn } from '../../lib/utils'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-ink text-white hover:bg-ink-soft active:bg-black disabled:bg-ink/40',
  secondary: 'bg-white text-ink border border-line hover:border-ink/30 hover:bg-surface-tint',
  ghost: 'bg-transparent text-ink hover:bg-surface-tint',
  danger: 'bg-danger text-white hover:brightness-110',
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-[15px] gap-2.5',
}

function classes(variant: ButtonVariant, size: ButtonSize, className?: string) {
  return cn(
    'inline-flex items-center justify-center rounded-lg font-semibold transition-colors',
    'disabled:cursor-not-allowed disabled:opacity-60',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30',
    VARIANTS[variant],
    SIZES[size],
    className,
  )
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', className, ...props },
  ref,
) {
  return <button ref={ref} className={classes(variant, size, className)} {...props} />
})

interface ButtonLinkProps extends LinkProps {
  variant?: ButtonVariant
  size?: ButtonSize
}

/** A link that looks like a button. A navigation is an anchor, not a button with an onClick. */
export function ButtonLink({ variant = 'primary', size = 'md', className, ...props }: ButtonLinkProps) {
  return <Link className={classes(variant, size, className)} {...props} />
}
