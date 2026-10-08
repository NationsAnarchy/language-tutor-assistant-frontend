'use client'

import type { Language, Level } from '@/lib/types'

/**
 * Remembers the conversation the user was last in so a returning visitor can
 * land straight back in it instead of going through the language picker.
 *
 * `app/page.tsx` has always *read* this key, but nothing ever wrote to it, so
 * the "resume last session" path was dead. These helpers close that loop.
 */
const BASE_STORAGE_KEY = 'linguaai_active_session'

export function getActiveSessionStorageKey(userId?: string | null): string {
  if (userId && userId.trim()) {
    return `${BASE_STORAGE_KEY}_${userId.trim()}`
  }
  return BASE_STORAGE_KEY
}

export interface ActiveSession {
  language: Language
  level: Level
  sessionId: string
}

export function readActiveSession(userId?: string | null): ActiveSession | null {
  if (typeof window === 'undefined') return null
  try {
    const key = getActiveSessionStorageKey(userId)
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<ActiveSession> | null
    if (!parsed || typeof parsed.sessionId !== 'string' || !parsed.sessionId) {
      return null
    }
    return {
      sessionId: parsed.sessionId,
      language: parsed.language as Language,
      level: parsed.level as Level,
    }
  } catch {
    // Corrupt or unreadable entry — fall back to the picker.
    return null
  }
}

export function saveActiveSession(session: ActiveSession, userId?: string | null): void {
  if (typeof window === 'undefined') return
  try {
    const key = getActiveSessionStorageKey(userId)
    localStorage.setItem(key, JSON.stringify(session))
  } catch {
    // Storage can be unavailable (private browsing, quota). Resuming is a
    // convenience, so failing silently is fine.
  }
}

export function clearActiveSession(userId?: string | null): void {
  if (typeof window === 'undefined') return
  try {
    const key = getActiveSessionStorageKey(userId)
    localStorage.removeItem(key)
    if (userId) {
      localStorage.removeItem(BASE_STORAGE_KEY)
    }
  } catch {
    // ignore
  }
}

