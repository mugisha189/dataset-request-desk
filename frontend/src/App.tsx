import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { SessionProvider } from './auth/SessionProvider'
import { useSession } from './auth/session-context'
import { AppLayout } from './components/layout/AppLayout'
import { RequireAuth, RequireRole } from './components/layout/RequireAuth'
import { DashboardPage } from './pages/DashboardPage'
import { EpisodesPage } from './pages/EpisodesPage'
import { LoginPage } from './pages/LoginPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { RequestDetailPage } from './pages/RequestDetailPage'
import { RequestsPage } from './pages/RequestsPage'
import { UsersPage } from './pages/UsersPage'

/** Dashboard is the sidebar's first entry and the default landing page -- but only for the roles
 *  that can see it at all; a client signing in still lands on their own requests. */
function DefaultRoute() {
  const { hasRole } = useSession()
  return <Navigate to={hasRole('operator', 'admin') ? '/dashboard' : '/requests'} replace />
}

export default function App() {
  return (
    <SessionProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<RequireAuth />}>
            <Route element={<AppLayout />}>
              <Route index element={<DefaultRoute />} />
              <Route path="requests" element={<RequestsPage />} />
              <Route path="requests/:id" element={<RequestDetailPage />} />

              <Route element={<RequireRole roles={['operator', 'admin']} />}>
                <Route path="episodes" element={<EpisodesPage />} />
                <Route path="dashboard" element={<DashboardPage />} />
              </Route>

              <Route element={<RequireRole roles={['admin']} />}>
                <Route path="users" element={<UsersPage />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </SessionProvider>
  )
}
