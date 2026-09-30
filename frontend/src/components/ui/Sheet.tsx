import * as DialogPrimitive from '@radix-ui/react-dialog'
import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'
import { Icon } from './Icons'

/**
 * A side panel for a form or detail view that needs more room than a Dialog but shouldn't take
 * over the whole screen -- ported from the reference design system's Sheet. Built on the same
 * Radix dialog primitive as Dialog.tsx, just anchored to the right edge instead of centred.
 */
export const Sheet = DialogPrimitive.Root
export const SheetTrigger = DialogPrimitive.Trigger
export const SheetClose = DialogPrimitive.Close

function SheetOverlay() {
  return (
    <DialogPrimitive.Overlay
      className={cn(
        'fixed inset-0 z-50 bg-ink/40 backdrop-blur-[2px]',
        'data-[state=open]:animate-overlay-in data-[state=closed]:animate-overlay-out',
      )}
    />
  )
}

export function SheetContent({
  children,
  className,
  title,
  description,
  width = 'w-full sm:w-[480px]',
}: {
  children: ReactNode
  className?: string
  title?: string
  description?: string
  /** Width class; defaults to `w-full sm:w-[480px]`. */
  width?: string
}) {
  return (
    <DialogPrimitive.Portal>
      <SheetOverlay />
      <DialogPrimitive.Content
        className={cn(
          'fixed right-0 top-0 z-50 flex h-full flex-col border-l border-line bg-white shadow-raised',
          'data-[state=open]:animate-sheet-in data-[state=closed]:animate-sheet-out',
          width,
          className,
        )}
      >
        {(title || description) && (
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-line px-6 py-4">
            <div className="space-y-0.5">
              {title && <DialogPrimitive.Title className="text-base font-bold text-ink">{title}</DialogPrimitive.Title>}
              {description && (
                <DialogPrimitive.Description className="text-[13px] text-ink-muted">{description}</DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.Close
              aria-label="Close"
              className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-faint transition-colors hover:bg-surface-tint hover:text-ink"
            >
              <Icon.Close className="h-4 w-4" />
            </DialogPrimitive.Close>
          </div>
        )}
        <div className="flex-1 overflow-y-auto">{children}</div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

/** Sticky footer for a Sheet's actions -- keeps Save/Cancel visible under a long scrolling body. */
export function SheetFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex shrink-0 items-center justify-end gap-2 border-t border-line bg-white px-6 py-4', className)}>
      {children}
    </div>
  )
}
