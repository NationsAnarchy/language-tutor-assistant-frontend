'use client'

import { cn } from '@/lib/utils'

interface TypingIndicatorProps {
  className?: string
}

/**
 * Animated three-dot typing indicator for streaming agent responses.
 * Shown inside the agent bubble while tokens are still arriving.
 */
export function TypingIndicator({ className }: TypingIndicatorProps) {
  return (
    <div
      className={cn('flex items-center gap-1.5 py-1 px-1', className)}
      role="status"
      aria-label="Tutor is typing"
    >
      <span className="sr-only">Tutor is typing</span>
      <span className="size-2 rounded-full bg-muted-foreground/40 animate-typing-dot-1" />
      <span className="size-2 rounded-full bg-muted-foreground/40 animate-typing-dot-2" />
      <span className="size-2 rounded-full bg-muted-foreground/40 animate-typing-dot-3" />
    </div>
  )
}