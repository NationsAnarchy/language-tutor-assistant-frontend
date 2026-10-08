'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

/**
 * Route-level error boundary. `components/ui/error-boundary.tsx` catches
 * render errors anywhere in the tree; this catches errors thrown while
 * rendering or loading a route segment, which the class boundary above the
 * provider tree can miss (for example a failure in a layout).
 */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // A future /api/client-errors endpoint can POST this instead.
    console.error('[RouteError]', error)
  }, [error])

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-md w-full rounded-2xl border border-border bg-card p-8 shadow-sm text-center space-y-4">
        <div className="mx-auto size-12 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="size-6 text-destructive" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-foreground">Hmm, something went wrong</h1>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            The tutor hit a snag loading this page. This is usually a temporary
            glitch — give it another try.
          </p>
        </div>
        {process.env.NODE_ENV === 'development' && (
          <pre className="text-left text-[11px] text-muted-foreground bg-muted/50 rounded-lg p-3 overflow-x-auto max-h-32">
            {error.message}
          </pre>
        )}
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <RefreshCw className="size-4" aria-hidden="true" />
          Try again
        </button>
      </div>
    </main>
  )
}
