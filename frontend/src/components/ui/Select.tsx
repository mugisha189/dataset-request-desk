import * as React from 'react'
import * as SelectPrimitive from '@radix-ui/react-select'
import { Icon } from './Icons'
import { cn } from '../../lib/utils'

/**
 * A styled dropdown on Radix's Select primitive -- ported from the reference design system.
 * `Field.tsx`'s plain `<Select>` (a native `<select>`) still covers most in-form pickers; reach
 * for this one where a native select can't do the job, e.g. a trigger that needs to sit inside a
 * DataTable filter row at a fixed height next to other controls.
 */
export const SelectRoot = SelectPrimitive.Root
export const SelectGroup = SelectPrimitive.Group
export const SelectValue = SelectPrimitive.Value

export const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      'flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none transition-colors',
      'hover:border-ink/30 focus-visible:ring-2 focus-visible:ring-gold/20 disabled:cursor-not-allowed disabled:opacity-50',
      '[&>span]:line-clamp-1 [&>span]:truncate',
      className,
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <Icon.Chevron className="h-4 w-4 shrink-0 rotate-90 opacity-60" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
))
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName

export const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = 'popper', ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      position={position}
      className={cn(
        'relative z-50 max-h-64 min-w-[8rem] overflow-hidden rounded-lg border border-line bg-white shadow-raised',
        'data-[state=open]:animate-menu-in data-[state=closed]:animate-menu-out',
        position === 'popper' &&
          'data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1',
        className,
      )}
      {...props}
    >
      <SelectPrimitive.Viewport
        className={cn(
          'p-1',
          position === 'popper' && 'h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]',
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
))
SelectContent.displayName = SelectPrimitive.Content.displayName

export const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      'relative flex w-full cursor-default select-none items-center rounded-md py-2 pl-3 pr-8 text-sm text-ink outline-none',
      'focus:bg-surface-tint data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className,
    )}
    {...props}
  >
    <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Icon.Check className="h-4 w-4 text-gold" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
))
SelectItem.displayName = SelectPrimitive.Item.displayName

export interface SelectOption {
  label: string
  value: string
}

export interface SelectComponentProps {
  value: string
  onValueChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  className?: string
  triggerClassName?: string
  disabled?: boolean
  id?: string
  'aria-label'?: string
}

/** The common case: value + options in, `onValueChange` out. Reach for the parts above directly
 *  only when an item needs custom content (an icon, a description line). */
export function SelectComponent({
  value,
  onValueChange,
  options,
  placeholder = 'Select…',
  className,
  triggerClassName,
  disabled,
  id,
  'aria-label': ariaLabel,
}: SelectComponentProps) {
  return (
    <SelectRoot value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger id={id} aria-label={ariaLabel} className={cn('w-full', triggerClassName)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className={className}>
        <SelectGroup>
          {options
            .filter((option) => option.value !== '')
            .map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
        </SelectGroup>
      </SelectContent>
    </SelectRoot>
  )
}
