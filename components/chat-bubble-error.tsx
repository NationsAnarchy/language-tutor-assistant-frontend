'use client'

import { AlertCircle, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChatBubbleErrorProps {
  message: string
  onRetry?: () => void
  onDismiss?: () => void
  className?: string
}

/**
 * Inline error pill rendered beneath a failed user message.
 * Shows a friendly message with optional Retry and Dismiss actions.
 */
export function ChatBubbleError({
  message,
  onRetry,
  onDismiss,
  className,
}: ChatBubbleErrorProps) {
  return (
    <div
      className={cn(
        'flex items-start gap-2 px-3 py-2 mt-1.5 rounded-xl border border-destructive/30 bg-destructive/5 text-xs text-destructive max-w-[78%] sm:max-w-[65%] ml-auto',
        className,
      )}
      role="alert"
    >
      <AlertCircle className="size-3.5 shrink-0 mt-0.5" aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <p className="leading-relaxed">{message}</p>
        <div className="flex items-center gap-2 mt-1.5">
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-destructive/10 hover:bg-destructive/20 text-destructive font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <RefreshCw className="size-3" aria-hidden="true" />
              Retry
            </button>
          )}
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="text-[11px] opacity-70 hover:opacity-100 underline underline-offset-2 hover:no-underline transition-opacity"
            >
              Dismiss
            </button>
          )}
        </div>
      </div>
    </div>
  )
}