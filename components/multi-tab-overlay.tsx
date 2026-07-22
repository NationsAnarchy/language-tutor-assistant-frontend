'use client'

import { AlertTriangle, ArrowRight, XCircle } from 'lucide-react'
import { LinguaLogo } from './lingua-logo'

interface MultiTabOverlayProps {
  /** Called when the user clicks "Use this tab". */
  onElectThisTab: () => void
}

/**
 * Full-screen overlay shown when the app detects multiple open tabs.
 * Blocks the app content and asks the user to pick one tab to continue.
 */
export function MultiTabOverlay({ onElectThisTab }: MultiTabOverlayProps) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background p-4">
      {/* Subtle background grid pattern */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.025]"
        aria-hidden="true"
        style={{
          backgroundImage:
            'linear-gradient(to right, var(--color-foreground) 1px, transparent 1px), linear-gradient(to bottom, var(--color-foreground) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="w-full max-w-md flex flex-col items-center gap-6 text-center relative">
        {/* Icon */}
        <div className="size-16 rounded-2xl bg-amber-500/10 flex items-center justify-center ring-2 ring-amber-500/20">
          <AlertTriangle className="size-8 text-amber-500" aria-hidden="true" />
        </div>

        {/* Logo */}
        <LinguaLogo size="sm" />

        {/* Heading */}
        <div>
          <h1 className="text-xl font-bold text-foreground">App already open</h1>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed text-pretty">
            LinguaAI is already running in another tab or window.
            Using it in multiple tabs at once can cause session conflicts and
            unexpected behavior.
          </p>
        </div>

        {/* Action */}
        <button
          type="button"
          onClick={onElectThisTab}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 shadow-sm"
        >
          Use this tab
          <ArrowRight className="size-4" aria-hidden="true" />
        </button>

        {/* Instructions */}
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-border bg-card/60 text-left w-full">
          <XCircle className="size-4 text-muted-foreground shrink-0 mt-0.5" aria-hidden="true" />
          <div className="text-xs text-muted-foreground leading-relaxed">
            <p className="font-medium text-foreground mb-1">What to do:</p>
            <ol className="list-decimal pl-4 space-y-1">
              <li>Click <strong>"Use this tab"</strong> above to make this the active window.</li>
              <li>Close the other tab — you can identify it by the warning screen.</li>
              <li>Only one tab will remain active at a time.</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}