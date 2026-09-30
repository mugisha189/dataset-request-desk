import type { ReactNode } from 'react'
import { Dialog, DialogContent } from './Dialog'
import { Button } from './Button'
import { cn } from '../../lib/utils'

/**
 * A confirmation step in front of an action that's awkward to undo -- ported from the reference
 * design system's ConfirmActionDialog. Used wherever a DataTable row action removes or reverses
 * something (deactivating a user, say) instead of firing on the click that opened the menu.
 */
export type ConfirmActionType = 'activate' | 'deactivate' | 'delete'

function ActivateIllustration({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 400 240" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <circle cx="200" cy="120" r="90" className="fill-ok/[0.08]" />
      <circle cx="200" cy="118" r="68" className="fill-ok/[0.05]" />
      <rect x="110" y="45" width="180" height="150" rx="14" className="fill-white" />
      <rect x="110" y="45" width="180" height="150" rx="14" className="stroke-ok/25" strokeWidth="1.5" fill="none" />
      <rect x="110" y="45" width="180" height="32" rx="14" className="fill-ok/10" />
      <circle cx="200" cy="118" r="38" className="fill-ok/10" />
      <circle cx="200" cy="118" r="34" className="fill-ok/5 stroke-ok" strokeWidth="2.5" />
      <path d="M200 98v20M200 124v8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-ok" />
      <path d="M188 112l8 8 16-18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-ok" />
      <circle cx="295" cy="70" r="14" className="fill-ok/[0.12]" />
      <circle cx="102" cy="175" r="12" className="fill-ok/10" />
    </svg>
  )
}

function DeactivateIllustration({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 400 240" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <circle cx="200" cy="120" r="90" className="fill-warn/[0.08]" />
      <circle cx="200" cy="118" r="68" className="fill-warn/[0.05]" />
      <rect x="110" y="45" width="180" height="150" rx="14" className="fill-white" />
      <rect x="110" y="45" width="180" height="150" rx="14" className="stroke-warn/25" strokeWidth="1.5" fill="none" />
      <rect x="110" y="45" width="180" height="32" rx="14" className="fill-warn/10" />
      <circle cx="200" cy="118" r="38" className="fill-warn/10" />
      <circle cx="200" cy="118" r="34" className="fill-warn/5 stroke-warn" strokeWidth="2.5" />
      <path d="M172 98l56 40M228 98l-56 40" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-warn" />
      <circle cx="295" cy="70" r="14" className="fill-warn/[0.12]" />
      <circle cx="102" cy="175" r="12" className="fill-warn/10" />
    </svg>
  )
}

function DeleteIllustration({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 400 240" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <circle cx="200" cy="120" r="90" className="fill-danger/[0.08]" />
      <circle cx="200" cy="118" r="68" className="fill-danger/[0.05]" />
      <rect x="110" y="45" width="180" height="150" rx="14" className="fill-white" />
      <rect x="110" y="45" width="180" height="150" rx="14" className="stroke-danger/25" strokeWidth="1.5" fill="none" />
      <rect x="110" y="45" width="180" height="32" rx="14" className="fill-danger/10" />
      <rect x="168" y="78" width="64" height="52" rx="6" className="fill-danger/10 stroke-danger/30" strokeWidth="1.5" />
      <path d="M178 78v-8a4 4 0 014-4h36a4 4 0 014 4v8" stroke="currentColor" className="stroke-danger/40" strokeWidth="1.5" fill="none" />
      <line x1="188" y1="98" x2="188" y2="118" className="stroke-danger" strokeWidth="2" strokeLinecap="round" />
      <line x1="200" y1="98" x2="200" y2="118" className="stroke-danger" strokeWidth="2" strokeLinecap="round" />
      <line x1="212" y1="98" x2="212" y2="118" className="stroke-danger" strokeWidth="2" strokeLinecap="round" />
      <circle cx="295" cy="70" r="14" className="fill-danger/[0.12]" />
      <circle cx="102" cy="175" r="12" className="fill-danger/10" />
    </svg>
  )
}

const CONFIG: Record<
  ConfirmActionType,
  { title: string; verb: string; confirmLabel: string; confirmClass: string; Illustration: (props: { className?: string }) => JSX.Element }
> = {
  activate: {
    title: 'Activate this account?',
    verb: 'activate',
    confirmLabel: 'Activate',
    confirmClass: 'bg-ok text-white hover:brightness-110',
    Illustration: ActivateIllustration,
  },
  deactivate: {
    title: 'Deactivate this account?',
    verb: 'deactivate',
    confirmLabel: 'Deactivate',
    confirmClass: 'bg-warn text-white hover:brightness-110',
    Illustration: DeactivateIllustration,
  },
  delete: {
    title: 'Delete this?',
    verb: 'delete',
    confirmLabel: 'Delete',
    confirmClass: 'bg-danger text-white hover:brightness-110',
    Illustration: DeleteIllustration,
  },
}

export interface ConfirmActionDialogProps {
  type: ConfirmActionType
  /** e.g. a person's name -- folded into the default description as "…deactivate {entityLabel}?" */
  entityLabel?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  isPending?: boolean
  title?: string
  description?: ReactNode
  confirmLabel?: string
  children?: ReactNode
}

export function ConfirmActionDialog({
  type,
  entityLabel,
  open,
  onOpenChange,
  onConfirm,
  isPending = false,
  title: titleOverride,
  description: descriptionOverride,
  confirmLabel: confirmLabelOverride,
  children,
}: ConfirmActionDialogProps) {
  const { title, verb, confirmLabel, confirmClass, Illustration } = CONFIG[type]
  const description =
    descriptionOverride ?? (entityLabel ? `This will ${verb} ${entityLabel}.` : `This will ${verb} the selected item.`)

  return (
    <Dialog open={open} onOpenChange={(next) => !isPending && onOpenChange(next)}>
      <DialogContent title={titleOverride || title} dismissible={!isPending} className="max-w-md">
        <div className="text-center">
          <div className="mx-auto mb-4 flex w-full max-w-[220px] justify-center">
            <Illustration className="h-auto max-h-[160px] w-full" />
          </div>
          <p className="text-[13px] text-ink-muted">{description}</p>
        </div>
        {children && <div className="py-4">{children}</div>}
        <div className={cn('mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-center')}>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button type="button" className={confirmClass} onClick={onConfirm} disabled={isPending}>
            {isPending ? 'Please wait…' : confirmLabelOverride || confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
