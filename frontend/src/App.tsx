import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { SessionProvider } from './auth/SessionProvider'
import { AppLayout } from './components/layout/AppLayout'
import { RequireAuth, RequireRole } from './components/layout/RequireAuth'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { EpisodesPage } from './pages/EpisodesPage'
import { LoginPage } from './pages/LoginPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { RequestDetailPage } from './pages/RequestDetailPage'
import { RequestsPage } from './pages/RequestsPage'
import { UsersPage } from './pages/UsersPage'

export default function App() {
  return (
    <SessionProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<RequireAuth />}>
            <Route element={<AppLayout />}>
              <Route index element={<Navigate to="/requests" replace />} />
              <Route path="requests" element={<RequestsPage />} />
              <Route path="requests/:id" element={<RequestDetailPage />} />

              <Route element={<RequireRole roles={['operator', 'admin']} />}>
                <Route path="episodes" element={<EpisodesPage />} />
                <Route path="analytics" element={<AnalyticsPage />} />
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
