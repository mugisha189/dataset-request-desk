import type { SVGProps } from 'react'

/** A small inline icon set. No icon font/library: every icon here is used at least twice,
 * and stroke-based SVGs inherit `currentColor` so they always match surrounding text. */
function base(props: SVGProps<SVGSVGElement>) {
  return {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    ...props,
  }
}

export const Icon = {
  Home: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base(p)}><path d="M3 11.5 12 4l9 7.5" /><path d="M5 10v9a1 1 0 0 0 1 1h5v-6h2v6h5a1 1 0 0 0 1-1v-9" /></svg>
  ),
  Inbox: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base(p)}><path d="M4 12h4l2 3h4l2-3h4" /><path d="M4 12 5.5 5a1 1 0 0 1 1-.8h11a1 1 0 0 1 1 .8L20 12v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" /></svg>
  ),
  Film: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base(p)}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4" /></svg>
  ),
  Chart: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base(p)}><path d="M4 19h16M8 19v-6M13 19V8M18 19v-9" /></svg>
  ),
  Users: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base(p)}><circle cx="9" cy="8" r="3.2" /><path d="M3.5 20a6 6 0 0 1 11 0" /><circle cx="17" cy="9" r="2.6" /><path d="M15.5 13.2A5 5 0 0 1 20.5 20" /></svg>
  ),
  Logout: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base(p)}><path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /></svg>
  ),
  Chevron: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base(p)}><path d="m9 18 6-6-6-6" /></svg>
  ),
  Close: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base(p)}><path d="M18 6 6 18M6 6l12 12" /></svg>
  ),
  Menu: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base(p)}><path d="M4 7h16M4 12h16M4 17h16" /></svg>
  ),
  Plus: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base(p)}><path d="M12 5v14M5 12h14" /></svg>
  ),
  Search: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base(p)}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
  ),
  Upload: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base(p)}><path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" /></svg>
  ),
  Check: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base(p)}><path d="m5 12 5 5 9-9" /></svg>
  ),
  Alert: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base(p)}><path d="M10.3 3.9 1.9 18a2 2 0 0 0 1.7 3h16.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" /></svg>
  ),
  Trash: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base(p)}><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>
  ),
  Sparkle: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base(p)}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" /></svg>
  ),
}
