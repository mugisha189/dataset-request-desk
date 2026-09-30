import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useSession } from '../auth/session-context'
import { ApiError } from '../api/client'
import { Button } from '../components/ui/Button'
import { Field } from '../components/ui/Field'
import { Alert } from '../components/ui/Feedback'
import { Icon } from '../components/ui/Icons'

export function LoginPage() {
  const { user, signIn } = useSession()
  const navigate = useNavigate()
  const location = useLocation() as { state?: { from?: string } }
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (user) return <Navigate to={location.state?.from ?? '/requests'} replace />

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await signIn(email, password)
      navigate(location.state?.from ?? '/requests', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-page px-4">
      <div className="w-full max-w-sm rounded-card border border-line bg-white p-7 shadow-card">
        <div className="mb-6 flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-ink">
            <Icon.Sparkle className="h-4 w-4 text-brand-bright" />
          </span>
          <div>
            <p className="text-sm font-bold text-ink">Dataset Request Desk</p>
            <p className="text-xs text-ink-muted">Sign in to continue</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <Field
            label="Email"
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
          />
          <Field
            label="Password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          {error && <Alert>{error}</Alert>}
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </div>
    </div>
  )
}
