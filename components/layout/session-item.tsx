'use client'

import { useState } from 'react'
import { MessageCircle, Pencil, Trash2, Check, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { renameSession, deleteSession } from '@/lib/api'
import { toast } from '@/lib/toast'
import type { Session } from '@/lib/types'
import { LEVEL_LABEL } from '@/lib/types'

interface SessionItemProps {
  session: Session
  isActive: boolean
  onSelect: (id: string) => void
  onSessionsChanged?: () => void
  onActiveSessionDeleted?: () => void
  disabled?: boolean
}

export function SessionItem({
  session,
  isActive,
  onSelect,
  onSessionsChanged,
  onActiveSessionDeleted,
  disabled,
}: SessionItemProps) {
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
      return
    }
    setConfirmDelete(false)
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
            <button type="button" onClick={handleDelete} className="px-1.5 py-0.5 rounded text-destructive hover:bg-destructive/10">Yes</button>
            <button type="button" onClick={() => setConfirmDelete(false)} className="px-1.5 py-0.5 rounded text-muted-foreground hover:bg-accent">No</button>
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
              onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setEditing(false) }}
              disabled={saving}
              className="flex-1 min-w-0 bg-transparent border-b border-primary text-xs outline-none disabled:opacity-50"
              autoFocus
            />
            <button type="button" onClick={handleRename} className="p-0.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground">
              <Check className="size-3" />
            </button>
          </>
        )}
      </div>
    )
  }

  return (
    <div className={cn(
      'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors group',
      isActive ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-accent',
    )}>
      <button
        type="button"
        onClick={() => session.session_id && onSelect(session.session_id)}
        disabled={disabled}
        className="flex items-center gap-2 flex-1 min-w-0 disabled:opacity-50"
      >
        <MessageCircle className="size-3.5 shrink-0" aria-hidden="true" />
        <span className="truncate">{session.title || LEVEL_LABEL[session.level]}</span>
      </button>
      {session.session_id && (
        <span className="hidden group-hover:flex items-center gap-0.5 shrink-0 ml-auto">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setEditTitle(session.title || ''); setEditing(true) }}
            className="p-0.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
            aria-label="Rename session"
          >
            <Pencil className="size-3" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setConfirmDelete(true) }}
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