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
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-destructive/10 text-xs text-destructive">
        <span className="flex-1 font-medium truncate">Delete?</span>
        <button
          type="button"
          onClick={handleDelete}
          className="px-1.5 py-0.5 rounded font-medium text-destructive hover:bg-destructive/15 transition-colors"
        >
          Yes
        </button>
        <button
          type="button"
          onClick={() => setConfirmDelete(false)}
          className="px-1.5 py-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          No
        </button>
      </div>
    )
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/40 border border-primary/30">
        <MessageCircle className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
        <input
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleRename()
            if (e.key === 'Escape') setEditing(false)
          }}
          className="flex-1 min-w-0 bg-transparent border-b border-primary text-xs outline-none text-foreground"
          autoFocus
        />
        <button
          type="button"
          onClick={handleRename}
          className="p-1 rounded-md text-primary hover:bg-primary/15 transition-colors"
          aria-label="Confirm rename"
        >
          <Check className="size-3.5" />
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
        <span
          className={cn(
            'flex items-center gap-0.5 shrink-0 ml-auto transition-opacity',
            isActive
              ? 'opacity-100'
              : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100',
          )}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setEditTitle(session.title || '')
              setEditing(true)
            }}
            className={cn(
              'p-1 rounded-md transition-colors',
              isActive
                ? 'text-primary hover:text-primary hover:bg-primary/20'
                : 'text-foreground/70 hover:text-primary hover:bg-accent',
            )}
            aria-label="Rename session"
            title="Rename session"
          >
            <Pencil className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setConfirmDelete(true)
            }}
            className={cn(
              'p-1 rounded-md transition-colors',
              isActive
                ? 'text-primary/80 hover:text-destructive hover:bg-destructive/10'
                : 'text-foreground/70 hover:text-destructive hover:bg-destructive/10',
            )}
            aria-label="Delete session"
            title="Delete session"
          >
            <Trash2 className="size-3.5" />
          </button>
        </span>
      )}
    </div>
  )
}