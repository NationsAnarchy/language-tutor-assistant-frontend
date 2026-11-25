'use client'

import { X, Plus, Globe } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Flag } from '@/components/ui/flag'
import { LANGUAGES } from '@/lib/types'
import type { Language, Session } from '@/lib/types'
import { SessionItem } from './session-item'

interface SessionSidebarProps {
  sessions: Session[]
  activeSessionId: string | null
  isOpen: boolean
  onToggle: () => void
  onSelectSession: (sessionId: string) => void
  onNewSession: () => void
  onRenameSession?: (sessionId: string, newTitle: string) => void
  onDeleteSession?: (sessionId: string, wasActive: boolean) => void
  disabled?: boolean
}

export function SessionSidebar({
  sessions,
  activeSessionId,
  isOpen,
  onToggle,
  onSelectSession,
  onNewSession,
  onRenameSession,
  onDeleteSession,
  disabled,
}: SessionSidebarProps) {
  const grouped: Record<Language, Session[]> = { english: [], korean: [], japanese: [] }
  for (const s of sessions) {
    if (s.session_id) grouped[s.language].push(s)
  }

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={onToggle} aria-hidden="true" />
      )}
      <aside
        className={cn(
          'fixed lg:static inset-y-0 left-0 z-50 w-72 bg-card border-r border-border flex flex-col transition-transform duration-200 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Globe className="size-4 text-primary" aria-hidden="true" />
            <span className="text-sm font-bold text-foreground">Sessions</span>
          </div>
          <button type="button" onClick={onToggle} className="lg:hidden p-1 rounded-md hover:bg-accent text-muted-foreground" aria-label="Close sidebar">
            <X className="size-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={onNewSession}
          disabled={disabled}
          className="mx-3 mt-3 flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border/60 text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-accent transition-colors disabled:opacity-40 disabled:pointer-events-none"
        >
          <Plus className="size-4" aria-hidden="true" />
          New session
        </button>

        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4" aria-label="Conversations">
          {(['korean', 'japanese', 'english'] as Language[]).map((lang) => {
            const langSessions = grouped[lang]
            if (langSessions.length === 0) return null
            const meta = LANGUAGES.find(l => l.value === lang)!
            return (
              <div key={lang}>
                <div className="flex items-center gap-1.5 px-1 mb-1.5">
                  <span className="text-sm leading-none" aria-hidden="true">
                    <Flag emoji={meta.flag} />
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{meta.nativeLabel}</span>
                </div>
                <div className="space-y-0.5">
                  {langSessions.map((s) => (
                    <SessionItem
                      key={s.session_id}
                      session={s}
                      isActive={s.session_id === activeSessionId}
                      onSelect={onSelectSession}
                      onRename={onRenameSession}
                      onDelete={onDeleteSession}
                      disabled={disabled}
                    />
                  ))}
                </div>
              </div>
            )
          })}
          {sessions.length === 0 && (
            <p className="text-xs text-muted-foreground px-1 py-4 text-center">No sessions yet. Start a new one!</p>
          )}
        </nav>
      </aside>
    </>
  )
}