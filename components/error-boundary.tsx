'use client'

import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface ErrorBoundaryProps {
  children: React.ReactNode
  /** Optional fallback UI override. */
  fallback?: React.ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/**
 * React error boundary that catches render-time errors and shows a
 * friendly fallback with a Reload button. Mounted once in app/layout.tsx.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Log to console for now; a future /api/client-errors endpoint can POST this.
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary] Uncaught error:', error, info.componentStack)
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null })
    // Hard reload to reset any corrupted client state.
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
          <div className="max-w-md w-full rounded-2xl border border-border bg-card p-8 shadow-sm text-center space-y-4">
            <div className="mx-auto size-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="size-6 text-destructive" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Hmm, something went wrong
              </h2>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                The tutor hit a snag rendering this page. This is usually a
                temporary glitch — give it another try.
              </p>
            </div>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <pre className="text-left text-[11px] text-muted-foreground bg-muted/50 rounded-lg p-3 overflow-x-auto max-h-32">
                {this.state.error.message}
              </pre>
            )}
            <button
              type="button"
              onClick={this.handleReload}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <RefreshCw className="size-4" aria-hidden="true" />
              Reload the app
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}