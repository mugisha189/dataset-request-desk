import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useSession } from '../../auth/session-context'
import type { Role } from '../../api/types'

/** Blocks a route (and everything nested under it) until there is a signed-in user. Redirects
 * to /login with the original path remembered, so a bookmarked deep link comes back to life
 * after signing in instead of dumping the user on the home page. */
export function RequireAuth() {
  const { user, loading } = useSession()
  const location = useLocation()

  if (loading) {
    return (
      <div className="grid h-screen place-items-center bg-page text-sm text-ink-muted">Loading…</div>
    )
  }
  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }
  return <Outlet />
}

/** Blocks a route to everyone but the given roles. The server enforces this for real on every
 * endpoint -- this only spares a role that can't act on a screen the confusion of seeing it. */
export function RequireRole({ roles }: { roles: Role[] }) {
  const { user } = useSession()
  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/requests" replace />
  }
  return <Outlet />
}
