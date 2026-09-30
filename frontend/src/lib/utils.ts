import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Tailwind classes that can be overridden by the caller without fighting specificity. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
