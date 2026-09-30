/**
 * The icon set, drawn inline.
 *
 * Inline rather than from an icon package: the shop uses about twenty glyphs, and a dependency
 * that ships a thousand costs more to load on a Conakry connection than it saves to maintain.
 * Every one is a 24×24 stroke icon so they sit together at any size.
 */
type IconProps = { className?: string; strokeWidth?: number }

function base(className?: string) {
  return `h-5 w-5 shrink-0 ${className ?? ''}`.trim()
}

const common = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export const Icon = {
  Search: ({ className, strokeWidth = 2 }: IconProps) => (
    <svg {...common} strokeWidth={strokeWidth} className={base(className)} aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.2-3.2" />
    </svg>
  ),
  Heart: ({ className, strokeWidth = 2 }: IconProps) => (
    <svg {...common} strokeWidth={strokeWidth} className={base(className)} aria-hidden="true">
      <path d="M12 20s-7-4.35-7-9a4 4 0 0 1 7-2.65A4 4 0 0 1 19 11c0 4.65-7 9-7 9Z" />
    </svg>
  ),
  HeartFilled: ({ className }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={base(className)} aria-hidden="true">
      <path d="M12 20s-7-4.35-7-9a4 4 0 0 1 7-2.65A4 4 0 0 1 19 11c0 4.65-7 9-7 9Z" />
    </svg>
  ),
  Grid: ({ className, strokeWidth = 2 }: IconProps) => (
    <svg {...common} strokeWidth={strokeWidth} className={base(className)} aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="2" />
      <rect x="14" y="3" width="7" height="7" rx="2" />
      <rect x="3" y="14" width="7" height="7" rx="2" />
      <rect x="14" y="14" width="7" height="7" rx="2" />
    </svg>
  ),
  Tag: ({ className, strokeWidth = 2 }: IconProps) => (
    <svg {...common} strokeWidth={strokeWidth} className={base(className)} aria-hidden="true">
      <path d="M3 12V5a2 2 0 0 1 2-2h7l9 9-9 9-9-9Z" />
      <circle cx="7.5" cy="7.5" r="1.4" />
    </svg>
  ),
  Inbox: ({ className, strokeWidth = 2 }: IconProps) => (
    <svg {...common} strokeWidth={strokeWidth} className={base(className)} aria-hidden="true">
      <path d="M4 12h4l2 3h4l2-3h4" />
      <path d="M4 12 5.5 5a1 1 0 0 1 1-.8h11a1 1 0 0 1 1 .8L20 12v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" />
    </svg>
  ),
  Film: ({ className, strokeWidth = 2 }: IconProps) => (
    <svg {...common} strokeWidth={strokeWidth} className={base(className)} aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4" />
    </svg>
  ),
  Store: ({ className, strokeWidth = 2 }: IconProps) => (
    <svg {...common} strokeWidth={strokeWidth} className={base(className)} aria-hidden="true">
      <path d="M3 9.5 4.5 4h15L21 9.5" />
      <path d="M3 9.5a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0" />
      <path d="M5 12v8h14v-8" />
      <path d="M10 20v-5h4v5" />
    </svg>
  ),
  News: ({ className, strokeWidth = 2 }: IconProps) => (
    <svg {...common} strokeWidth={strokeWidth} className={base(className)} aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M7 9h6M7 13h10M7 16h7" />
    </svg>
  ),
  Home: ({ className, strokeWidth = 2 }: IconProps) => (
    <svg {...common} strokeWidth={strokeWidth} className={base(className)} aria-hidden="true">
      <path d="m3 10 9-7 9 7v9a2 2 0 0 1-2 2h-4v-6h-6v6H5a2 2 0 0 1-2-2Z" />
    </svg>
  ),
  Pin: ({ className, strokeWidth = 2 }: IconProps) => (
    <svg {...common} strokeWidth={strokeWidth} className={base(className)} aria-hidden="true">
      <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.6" />
    </svg>
  ),
  Clock: ({ className, strokeWidth = 2 }: IconProps) => (
    <svg {...common} strokeWidth={strokeWidth} className={base(className)} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.2 1.9" />
    </svg>
  ),
  Arrow: ({ className, strokeWidth = 2 }: IconProps) => (
    <svg {...common} strokeWidth={strokeWidth} className={base(className)} aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  ),
  ArrowLeft: ({ className, strokeWidth = 2 }: IconProps) => (
    <svg {...common} strokeWidth={strokeWidth} className={base(className)} aria-hidden="true">
      <path d="M19 12H5M11 18l-6-6 6-6" />
    </svg>
  ),
  Chevron: ({ className, strokeWidth = 2 }: IconProps) => (
    <svg {...common} strokeWidth={strokeWidth} className={base(className)} aria-hidden="true">
      <path d="m9 6 6 6-6 6" />
    </svg>
  ),
  Close: ({ className, strokeWidth = 2 }: IconProps) => (
    <svg {...common} strokeWidth={strokeWidth} className={base(className)} aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  ),
  Menu: ({ className, strokeWidth = 2 }: IconProps) => (
    <svg {...common} strokeWidth={strokeWidth} className={base(className)} aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  ),
  Check: ({ className, strokeWidth = 2 }: IconProps) => (
    <svg {...common} strokeWidth={strokeWidth} className={base(className)} aria-hidden="true">
      <path d="m5 13 4 4L19 7" />
    </svg>
  ),
  Plus: ({ className, strokeWidth = 2 }: IconProps) => (
    <svg {...common} strokeWidth={strokeWidth} className={base(className)} aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  Minus: ({ className, strokeWidth = 2 }: IconProps) => (
    <svg {...common} strokeWidth={strokeWidth} className={base(className)} aria-hidden="true">
      <path d="M5 12h14" />
    </svg>
  ),
  Trash: ({ className, strokeWidth = 2 }: IconProps) => (
    <svg {...common} strokeWidth={strokeWidth} className={base(className)} aria-hidden="true">
      <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13h10l1-13" />
    </svg>
  ),
  Share: ({ className, strokeWidth = 2 }: IconProps) => (
    <svg {...common} strokeWidth={strokeWidth} className={base(className)} aria-hidden="true">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4" />
    </svg>
  ),
  Gamepad: ({ className, strokeWidth = 2 }: IconProps) => (
    <svg {...common} strokeWidth={strokeWidth} className={base(className)} aria-hidden="true">
      <path d="M7 8h10a5 5 0 0 1 4.6 7l-.9 2a2.4 2.4 0 0 1-4-.6L16 15H8l-.7 1.4a2.4 2.4 0 0 1-4 .6l-.9-2A5 5 0 0 1 7 8Z" />
      <path d="M7.5 11v2.2M6.4 12.1h2.2M15.6 11.4h.01M17.4 12.8h.01" />
    </svg>
  ),
  Box: ({ className, strokeWidth = 2 }: IconProps) => (
    <svg {...common} strokeWidth={strokeWidth} className={base(className)} aria-hidden="true">
      <path d="m3 8 9-4 9 4v8l-9 4-9-4Z" />
      <path d="m3 8 9 4 9-4M12 12v8" />
    </svg>
  ),
  Chart: ({ className, strokeWidth = 2 }: IconProps) => (
    <svg {...common} strokeWidth={strokeWidth} className={base(className)} aria-hidden="true">
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </svg>
  ),
  Users: ({ className, strokeWidth = 2 }: IconProps) => (
    <svg {...common} strokeWidth={strokeWidth} className={base(className)} aria-hidden="true">
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" />
      <path d="M16 5.5A3.2 3.2 0 0 1 16 12M18 20c0-2.4-1-4.2-2.6-5.2" />
    </svg>
  ),
  Receipt: ({ className, strokeWidth = 2 }: IconProps) => (
    <svg {...common} strokeWidth={strokeWidth} className={base(className)} aria-hidden="true">
      <path d="M5 3h14v18l-2.5-1.5L14 21l-2-1.5L10 21l-2.5-1.5L5 21Z" />
      <path d="M9 8h6M9 12h6" />
    </svg>
  ),
  Settings: ({ className, strokeWidth = 2 }: IconProps) => (
    <svg {...common} strokeWidth={strokeWidth} className={base(className)} aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.5v2.2M12 19.3v2.2M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6" />
    </svg>
  ),
  Alert: ({ className, strokeWidth = 2 }: IconProps) => (
    <svg {...common} strokeWidth={strokeWidth} className={base(className)} aria-hidden="true">
      <path d="M12 3 2.5 20h19Z" />
      <path d="M12 9v5M12 17h.01" />
    </svg>
  ),
  Logout: ({ className, strokeWidth = 2 }: IconProps) => (
    <svg {...common} strokeWidth={strokeWidth} className={base(className)} aria-hidden="true">
      <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
      <path d="M10 8 6 12l4 4M6 12h10" />
    </svg>
  ),
  Eye: ({ className, strokeWidth = 2 }: IconProps) => (
    <svg {...common} strokeWidth={strokeWidth} className={base(className)} aria-hidden="true">
      <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  EyeOff: ({ className, strokeWidth = 2 }: IconProps) => (
    <svg {...common} strokeWidth={strokeWidth} className={base(className)} aria-hidden="true">
      <path d="M4 4l16 16" />
      <path d="M10.6 6.2A9.9 9.9 0 0 1 12 5.5c6.4 0 10 6.5 10 6.5a17.7 17.7 0 0 1-3.4 4.2" />
      <path d="M6.4 8A17.6 17.6 0 0 0 2 12s3.6 6.5 10 6.5a9.9 9.9 0 0 0 3.5-.6" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </svg>
  ),
  MoreVertical: ({ className, strokeWidth = 2 }: IconProps) => (
    <svg {...common} strokeWidth={strokeWidth} className={base(className)} aria-hidden="true">
      <circle cx="12" cy="5" r="1.4" />
      <circle cx="12" cy="12" r="1.4" />
      <circle cx="12" cy="19" r="1.4" />
    </svg>
  ),
  Pencil: ({ className, strokeWidth = 2 }: IconProps) => (
    <svg {...common} strokeWidth={strokeWidth} className={base(className)} aria-hidden="true">
      <path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17z" />
      <path d="m14.5 6.5 3 3" />
    </svg>
  ),
  Undo: ({ className, strokeWidth = 2 }: IconProps) => (
    <svg {...common} strokeWidth={strokeWidth} className={base(className)} aria-hidden="true">
      <path d="M3 8h11a5 5 0 0 1 0 10h-4" />
      <path d="m7 4-4 4 4 4" />
    </svg>
  ),
  SortAsc: ({ className, strokeWidth = 2 }: IconProps) => (
    <svg {...common} strokeWidth={strokeWidth} className={base(className)} aria-hidden="true">
      <path d="M4 7h10M4 12h7M4 17h4" />
      <path d="m17 16 3 3 3-3M20 19V6" />
    </svg>
  ),
  Filter: ({ className, strokeWidth = 2 }: IconProps) => (
    <svg {...common} strokeWidth={strokeWidth} className={base(className)} aria-hidden="true">
      <path d="M3 5h18l-7 8v6l-4 2v-8z" />
    </svg>
  ),
  /** A tray with an arrow into it — the conventional download mark. */
  Download: ({ className, strokeWidth = 2 }: IconProps) => (
    <svg {...common} strokeWidth={strokeWidth} className={base(className)} aria-hidden="true">
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  ),
  Upload: ({ className, strokeWidth = 2 }: IconProps) => (
    <svg {...common} strokeWidth={strokeWidth} className={base(className)} aria-hidden="true">
      <path d="M12 16V4M7 9l5-5 5 5" />
      <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
    </svg>
  ),
  Print: ({ className, strokeWidth = 2 }: IconProps) => (
    <svg {...common} strokeWidth={strokeWidth} className={base(className)} aria-hidden="true">
      <path d="M7 9V3h10v6" />
      <rect x="3" y="9" width="18" height="8" rx="2" />
      <path d="M7 15h10v6H7z" />
    </svg>
  ),
  WhatsApp: ({ className }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={base(className)} aria-hidden="true">
      <path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2Zm0 18a8 8 0 0 1-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1 1 12 20Zm4.4-5.8c-.2-.1-1.4-.7-1.6-.8s-.4-.1-.5.1-.6.8-.7.9-.3.2-.5 0a6.5 6.5 0 0 1-1.9-1.2 7.3 7.3 0 0 1-1.4-1.7c-.1-.3 0-.4.1-.5l.4-.5.2-.4v-.4l-.7-1.7c-.2-.4-.4-.4-.5-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4 8.1 8.1 0 0 0 1.5.5 3.6 3.6 0 0 0 1.7.1 2.8 2.8 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.2-.2-.4-.3Z" />
    </svg>
  ),
}
