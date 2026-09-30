import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useSession } from '../../auth/session-context'
import { cn } from '../../lib/utils'
import { Icon } from '../ui/Icons'
import type { Role } from '../../api/types'

interface Entry {
  to: string
  label: string
  icon: keyof typeof Icon
  end?: boolean
  needs?: Role[]
}

const ENTRIES: Entry[] = [
  { to: '/dashboard', label: 'Dashboard', icon: 'Chart', needs: ['operator', 'admin'] },
  { to: '/requests', label: 'Requests', icon: 'Inbox', end: true },
  { to: '/episodes', label: 'Episodes', icon: 'Film', needs: ['operator', 'admin'] },
  { to: '/users', label: 'Users', icon: 'Users', needs: ['admin'] },
]

const ROLE_LABEL: Record<Role, string> = { client: 'Client', operator: 'Operator', admin: 'Admin' }

/**
 * The app shell: a fixed sidebar with role-gated navigation, and the account card at its foot.
 * Only one shell for the whole app -- unlike the reference this project is based on, there is no
 * separate public storefront to keep out of the sidebar's way; every role signs in and lands
 * here, and the sidebar simply shows fewer links to a client than to an operator.
 */
export function AppLayout() {
  const { user, signOut } = useSession()
  const [open, setOpen] = useState(false)
  const location = useLocation()

  useEffect(() => setOpen(false), [location.pathname])

  if (!user) return null
  const visible = ENTRIES.filter((entry) => !entry.needs || entry.needs.includes(user.role))

  return (
    <div className="flex h-screen overflow-hidden bg-page">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col border-r border-line bg-white',
          'transition-transform lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 shrink-0 items-center gap-2 border-b border-line px-4">
          <span className="text-sm font-bold">Dataset Request Desk</span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="ml-auto grid h-8 w-8 place-items-center rounded-lg text-ink-muted lg:hidden"
            aria-label="Close menu"
          >
            <Icon.Close className="h-4 w-4" />
          </button>
        </div>

        <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto p-3">
          {visible.map((entry) => {
            const Glyph = Icon[entry.icon]
            return (
              <NavLink
                key={entry.to}
                to={entry.to}
                end={entry.end}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] font-bold transition-colors',
                    isActive ? 'bg-ink text-white' : 'text-ink-muted hover:bg-surface-tint hover:text-ink',
                  )
                }
              >
                <Glyph className="h-4 w-4" />
                {entry.label}
              </NavLink>
            )
          })}
        </nav>

        <div className="shrink-0 border-t border-line p-2">
          <AccountCard name={user.name} role={ROLE_LABEL[user.role]} onSignOut={signOut} />
        </div>
      </aside>

      {open && <div className="fixed inset-0 z-40 bg-ink/40 lg:hidden" onClick={() => setOpen(false)} aria-hidden="true" />}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-line bg-white px-4 lg:hidden">
          <button type="button" onClick={() => setOpen(true)} className="grid h-9 w-9 place-items-center rounded-lg text-ink" aria-label="Open menu">
            <Icon.Menu className="h-5 w-5" />
          </button>
          <span className="text-sm font-bold">Dataset Request Desk</span>
        </header>

        <main className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function AccountCard({ name, role, onSignOut }: { name: string; role: string; onSignOut: () => Promise<void> }) {
  const navigate = useNavigate()
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink text-[11px] font-bold text-white">{initials}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-bold text-ink">{name}</span>
        <span className="block truncate text-[11px] text-ink-muted">{role}</span>
      </span>
      <button
        type="button"
        onClick={async () => {
          await onSignOut()
          navigate('/login', { replace: true })
        }}
        aria-label="Sign out"
        title="Sign out"
        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-danger/10 hover:text-danger"
      >
        <Icon.Logout className="h-4 w-4" />
      </button>
    </div>
  )
}

/** Page heading used across the app, so every screen starts the same way. */
export function PageHeader({ title, lead, actions }: { title: string; lead?: string; actions?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h1>
        {lead && <p className="mt-1 text-[13px] text-ink-muted">{lead}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  )
}
