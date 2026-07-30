'use client'

import { useState } from 'react'
import { MessageCircle, Pencil, Trash2, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Session } from '@/lib/types'
import { LEVEL_LABEL } from '@/lib/types'

interface SessionItemProps {
  session: Session
  isActive: boolean
  onSelect: (id: string) => void
  onRename?: (sessionId: string, newTitle: string) => void
  onDelete?: (sessionId: string, wasActive: boolean) => void
  disabled?: boolean
}

export function SessionItem({
  session,
  isActive,
  onSelect,
  onRename,
  onDelete,
  disabled,
}: SessionItemProps) {
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const handleRename = () => {
    if (!editTitle.trim() || !session.session_id) return
    onRename?.(session.session_id, editTitle.trim())
    setEditing(false)
  }

  const handleDelete = () => {
    if (!session.session_id) return
    onDelete?.(session.session_id, isActive)
    setConfirmDelete(false)
  }

  if (confirmDelete) {
    return (
      <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-destructive/5 text-xs">
        <span className="flex-1 text-destructive">Delete?</span>
        <button type="button" onClick={handleDelete} className="px-1.5 py-0.5 rounded text-destructive hover:bg-destructive/10">Yes</button>
        <button type="button" onClick={() => setConfirmDelete(false)} className="px-1.5 py-0.5 rounded text-muted-foreground hover:bg-accent">No</button>
      </div>
    )
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg">
        <MessageCircle className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <input
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setEditing(false) }}
          className="flex-1 min-w-0 bg-transparent border-b border-primary text-xs outline-none"
          autoFocus
        />
        <button type="button" onClick={handleRename} className="p-0.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground">
          <Check className="size-3" />
        </button>
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
        {session.mistake_count ? (
          <span className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 leading-none">
            {session.mistake_count}
          </span>
        ) : null}
      </button>
      {session.session_id && (
        <span className="flex items-center gap-0.5 shrink-0 ml-auto lg:opacity-0 lg:group-hover:opacity-100 lg:transition-opacity">
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