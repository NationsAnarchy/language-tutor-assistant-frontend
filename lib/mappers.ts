'use client'

import {
  audioUrl,
  getCachedAudioUrl,
  langFromBackend,
  type BackendSession,
  type ChatHistoryEntry,
} from '@/lib/api'
import type { Language, Level, Message, Session } from '@/lib/types'

/**
 * Resolve the playable audio URL for a history entry.
 *
 * `audio_hash` points at the backend's MP3 disk cache, so replaying it costs
 * nothing; `audio_url` is the legacy field kept for older records.
 */
function resolveHistoryAudioUrl(entry: ChatHistoryEntry): string | undefined {
  if (entry.audio_hash) {
    const cached = getCachedAudioUrl(entry.audio_hash)
    if (cached) return cached
  }
  if (entry.audio_url) {
    return audioUrl(entry.audio_url) ?? undefined
  }
  return undefined
}

/**
 * Convert a backend `chat_history` array into renderable UI messages.
 *
 * This mapping previously lived (slightly differently) in three separate
 * places — the initial page load, the client-side session switch, and the
 * ChatScreen history fallback.
 */
export function mapChatHistory(history: ChatHistoryEntry[] | undefined): Message[] {
  return (history ?? []).map((entry, i) => ({
    id: `history-${i}`,
    role: entry.role === 'user' ? ('user' as const) : ('agent' as const),
    content: entry.content,
    audioUrl: resolveHistoryAudioUrl(entry),
    timestamp: new Date(),
  }))
}

/** Convert a backend session record into the shape the UI renders. */
export function mapBackendSession(session: BackendSession): Session {
  return {
    language: langFromBackend(session.language) as Language,
    level: session.level as Level,
    exists: true,
    session_id: session.session_id,
    title: session.title,
    updated_at: session.updated_at,
  }
}

/** Sort sessions newest-first by `updated_at` (missing dates sort last). */
export function byMostRecent(a: Session, b: Session): number {
  return (b.updated_at || '').localeCompare(a.updated_at || '')
}
