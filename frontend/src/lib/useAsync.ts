import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from '../api/client'

export interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
  reload: () => void
}

const GENERIC_ERROR = 'Something went wrong. Please try again.'

/**
 * Loads something once, and again whenever `deps` change.
 *
 * The request is aborted when the dependencies change or the component unmounts -- without
 * that, typing in a search box leaves a queue of in-flight requests and whichever answers last
 * wins, which is usually not the one matching what is on screen.
 */
export function useAsync<T>(loader: (signal: AbortSignal) => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)

  const loaderRef = useRef(loader)
  loaderRef.current = loader

  useEffect(() => {
    const controller = new AbortController()
    let cancelled = false

    setLoading(true)
    setError(null)

    loaderRef
      .current(controller.signal)
      .then((result) => {
        if (cancelled) return
        setData(result)
        setLoading(false)
      })
      .catch((caught) => {
        if (cancelled || (caught instanceof DOMException && caught.name === 'AbortError')) return
        setError(displayable(caught))
        setLoading(false)
      })

    return () => {
      cancelled = true
      controller.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce])

  return { data, loading, error, reload: useCallback(() => setNonce((n) => n + 1), []) }
}

/** Waits for typing to stop before letting a value through, so a filter doesn't fire a request
 * per keystroke. */
export function useDebounced<T>(value: T, delay = 300): T {
  const [settled, setSettled] = useState(value)
  useEffect(() => {
    const timer = window.setTimeout(() => setSettled(value), delay)
    return () => window.clearTimeout(timer)
  }, [value, delay])
  return settled
}

/** A 4xx is the server telling the reader something specific and actionable; a dropped
 * connection or a 5xx carries nothing they can act on, so it gets the generic line instead. */
function displayable(caught: unknown): string {
  if (!(caught instanceof ApiError)) return GENERIC_ERROR
  if (caught.status >= 400 && caught.status < 500) return caught.message
  return GENERIC_ERROR
}
