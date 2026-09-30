import { ButtonLink } from '../components/ui/Button'

export function NotFoundPage() {
  return (
    <div className="grid min-h-screen place-items-center bg-page px-4 text-center">
      <div>
        <p className="text-5xl font-bold text-ink">404</p>
        <p className="mt-2 text-sm text-ink-muted">That page doesn't exist.</p>
        <ButtonLink to="/requests" className="mt-6">
          Back to requests
        </ButtonLink>
      </div>
    </div>
  )
}
