import * as DialogPrimitive from '@radix-ui/react-dialog'
import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'
import { Icon } from './Icons'

/**
 * A modal dialog, on Radix's primitive rather than hand-rolled: the parts that matter here are
 * the ones that are tedious to get right -- the focus trap, restoring focus to whatever opened
 * it, Escape, the inert background, and `aria-modal` with a labelled title.
 */
export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close

function Overlay() {
  return (
    <DialogPrimitive.Overlay
      className={cn(
        'fixed inset-0 z-50 bg-ink/40 backdrop-blur-[2px]',
        'data-[state=open]:animate-overlay-in data-[state=closed]:animate-overlay-out',
      )}
    />
  )
}

export function DialogContent({
  children,
  className,
  title,
  description,
  dismissible = true,
}: {
  children: ReactNode
  className?: string
  title: string
  description?: string
  dismissible?: boolean
}) {
  return (
    <DialogPrimitive.Portal>
      <Overlay />
      <DialogPrimitive.Content
        onInteractOutside={(event) => {
          if (!dismissible) event.preventDefault()
        }}
        onEscapeKeyDown={(event) => {
          if (!dismissible) event.preventDefault()
        }}
        className={cn(
          'fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2',
          'max-h-[calc(100vh-4rem)] overflow-y-auto rounded-card border border-line bg-white shadow-raised',
          'data-[state=open]:animate-dialog-in data-[state=closed]:animate-dialog-out',
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <DialogPrimitive.Title className="text-[15px] font-bold text-ink">{title}</DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="mt-1 text-[13px] leading-relaxed text-ink-muted">
                {description}
              </DialogPrimitive.Description>
            ) : (
              <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
            )}
          </div>
          {dismissible && (
            <DialogPrimitive.Close
              aria-label="Close"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-surface-tint hover:text-ink"
            >
              <Icon.Close className="h-4 w-4" />
            </DialogPrimitive.Close>
          )}
        </div>
        <div className="px-5 py-5">{children}</div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}
