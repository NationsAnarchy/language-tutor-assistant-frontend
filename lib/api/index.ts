'use client'

import { isLanguage, isLevel, type Message, type Session } from '@/lib/types'
import { languageFromBackend, languageToBackend } from './config'
import { audioUrl, getCachedAudioUrl } from './chat'
import type { BackendSession, ChatHistoryEntry } from './sessions'

export * from './errors'
export * from './client'
export * from './sessions'
export * from './chat'

export function langToBackend(language: string): string { return languageToBackend(language) }
export function langFromBackend(language: string): string { return languageFromBackend(language) }
export function mapBackendSession(session: BackendSession): Session {
  const language = langFromBackend(session.language)
  return { language: isLanguage(language) ? language : 'english', level: isLevel(session.level) ? session.level : 'beginner', exists: true, session_id: session.session_id, title: session.title, mistake_count: session.mistake_count, updated_at: session.updated_at }
}
export function mapChatHistory(history: ChatHistoryEntry[] | undefined): Message[] {
  return (history || []).map((message, index) => ({ id: `history-${index}`, role: message.role === 'user' ? 'user' as const : 'agent' as const, content: message.content, audioUrl: message.audio_hash ? getCachedAudioUrl(message.audio_hash) || undefined : audioUrl(message.audio_url || null) || undefined, timestamp: new Date() }))
}
