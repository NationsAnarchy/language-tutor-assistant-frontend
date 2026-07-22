'use client'

import { useState } from 'react'
import { Menu, X, Plus, MessageCircle, Globe, Pencil, Trash2, Check, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { renameSession, deleteSession } from '@/lib/api'
import { toast } from '@/lib/toast'
import type { Language, Level, Session, User } from '@/lib/types'
import { LANGUAGES } from '@/lib/types'

interface SessionSidebarProps {
  sessions: Session[]
  activeSessionId: string | null
  isOpen: boolean
  onToggle: () => void
  onSelectSession: (sessionId: string) => void
  onNewSession: () => void
  onSignOut: () => void
  onSessionsChanged?: () => void
  onActiveSessionDeleted?: () => void
  user: User
  disabled?: boolean
}

const LANGUAGE_META: Record<Language, { label: string; nativeLabel: string; flag: string }> = {
  english: { label: 'English', nativeLabel: 'English', flag: '🇺🇸' },
  korean: { label: 'Korean', nativeLabel: '한국어', flag: '🇰🇷' },
  japanese: { label: 'Japanese', nativeLabel: '日本語', flag: '🇯🇵' },
}

const LEVEL_LABEL: Record<Level, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
}

function SessionItem({
  session,
  isActive,
  onSelect,
  onSessionsChanged,
  onActiveSessionDeleted,
  disabled,
}: {
  session: Session
  isActive: boolean
  onSelect: (id: string) => void
  onSessionsChanged?: () => void
  onActiveSessionDeleted?: () => void
  disabled?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleRename = async () => {
    if (!editTitle.trim() || !session.session_id) return
    setSaving(true)
    const ok = await renameSession(session.session_id, editTitle.trim())
    setSaving(false)
    if (!ok) {
      toast.error("Couldn't rename the conversation. Please try again.")
      // Stay in editing mode so the user can retry
      return
    }
    setEditing(false)
    onSessionsChanged?.()
  }

  const handleDelete = async () => {
    if (!session.session_id) return
    setSaving(true)
    const ok = await deleteSession(session.session_id)
    setSaving(false)
    if (!ok) {
      toast.error("Couldn't delete the conversation. Please try again.")
      // Stay in confirm mode so the user can retry
      return
    }
    setConfirmDelete(false)
    // If deleting the active conversation, redirect to picker (Issue #30)
    if (isActive) {
      onActiveSessionDeleted?.()
    } else {
      onSessionsChanged?.()
    }
  }

  if (confirmDelete) {
    return (
      <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-destructive/5 text-xs">
        {saving ? (
          <Loader2 className="size-3 animate-spin shrink-0 text-destructive" />
        ) : (
          <>
            <span className="flex-1 text-destructive">Delete?</span>
            <button
              type="button"
              onClick={handleDelete}
              className="px-1.5 py-0.5 rounded text-destructive hover:bg-destructive/10"
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="px-1.5 py-0.5 rounded text-muted-foreground hover:bg-accent"
            >
              No
            </button>
          </>
        )}
      </div>
    )
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg">
        <MessageCircle className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        {saving ? (
          <Loader2 className="size-3 animate-spin shrink-0 text-primary" />
        ) : (
          <>
            <input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename()
                if (e.key === 'Escape') setEditing(false)
              }}
              disabled={saving}
              className="flex-1 min-w-0 bg-transparent border-b border-primary text-xs outline-none disabled:opacity-50"
              autoFocus
            />
            <button
              type="button"
              onClick={handleRename}
              className="p-0.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
            >
              <Check className="size-3" />
            </button>
          </>
        )}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors group',
        isActive
          ? 'bg-primary/10 text-primary font-medium'
          : 'text-muted-foreground hover:text-foreground hover:bg-accent',
      )}
    >
      <button
        type="button"
        onClick={() => session.session_id && onSelect(session.session_id)}
        disabled={disabled}
        className="flex items-center gap-2 flex-1 min-w-0 disabled:opacity-50"
      >
        <MessageCircle className="size-3.5 shrink-0" aria-hidden="true" />
        <span className="truncate">{session.title || LEVEL_LABEL[session.level]}</span>
      </button>
      {/* Hover-revealed edit/delete icons (Issue #24) */}
      {session.session_id && (
        <span className="hidden group-hover:flex items-center gap-0.5 shrink-0 ml-auto">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setEditTitle(session.title || '')
              setEditing(true)
            }}
            className="p-0.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
            aria-label="Rename session"
          >
            <Pencil className="size-3" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setConfirmDelete(true)
            }}
            className="p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
            aria-label="Delete session"
          >
            <Trash2 className="size-3" />
          </button>
        </span>
      )}
    </div>
  )
}

export function SessionSidebar({
  sessions,
  activeSessionId,
  isOpen,
  onToggle,
  onSelectSession,
  onNewSession,
  onSignOut,
  onSessionsChanged,
  onActiveSessionDeleted,
  user,
  disabled,
}: SessionSidebarProps) {
  // Group sessions by language
  const grouped: Record<Language, Session[]> = { english: [], korean: [], japanese: [] }
  for (const s of sessions) {
    if (s.session_id) grouped[s.language].push(s)
  }

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={onToggle}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:static inset-y-0 left-0 z-50 w-64 bg-card border-r border-border flex flex-col transition-transform duration-200 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Globe className="size-4 text-primary" aria-hidden="true" />
            <span className="text-sm font-bold text-foreground">Sessions</span>
          </div>
          <button
            type="button"
            onClick={onToggle}
            className="lg:hidden p-1 rounded-md hover:bg-accent text-muted-foreground"
            aria-label="Close sidebar"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* New session button */}
        <button
          type="button"
          onClick={onNewSession}
          disabled={disabled}
          className="mx-3 mt-3 flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border/60 text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-accent transition-colors disabled:opacity-40 disabled:pointer-events-none"
        >
          <Plus className="size-4" aria-hidden="true" />
          New session
        </button>

        {/* Session list */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4" aria-label="Conversations">
          {(['korean', 'japanese', 'english'] as Language[]).map((lang) => {
            const langSessions = grouped[lang]
            if (langSessions.length === 0) return null
            const meta = LANGUAGE_META[lang]
            return (
              <div key={lang}>
                <div className="flex items-center gap-1.5 px-1 mb-1.5">
                  <span className="text-sm" aria-hidden="true">{meta.flag}</span>
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {meta.nativeLabel}
                  </span>
                </div>
                <div className="space-y-0.5">
                  {langSessions.map((s) => (
                    <SessionItem
                      key={s.session_id}
                      session={s}
                      isActive={s.session_id === activeSessionId}
                      onSelect={onSelectSession}
                      onSessionsChanged={onSessionsChanged}
                      onActiveSessionDeleted={onActiveSessionDeleted}
                      disabled={disabled}
                    />
                  ))}
                </div>
              </div>
            )
          })}

          {sessions.length === 0 && (
            <p className="text-xs text-muted-foreground px-1 py-4 text-center">
              No sessions yet. Start a new one!
            </p>
          )}
        </nav>
      </aside>
    </>
  )
}