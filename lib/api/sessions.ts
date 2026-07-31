'use client'

import { readJson, removeStoredItem, writeJson } from '@/lib/browser-storage'
import { languageFromBackend, languageToBackend } from './config'
import { authenticatedRequest } from './client'

export interface BackendSession { session_id: string; user_id: string; language: string; level: string; title?: string; mistake_count?: number; created_at: string; updated_at?: string }
export interface CreateSessionResult { session_id: string; language: string; level: string }
export interface ChatHistoryEntry { role: string; content: string; audio_url?: string; audio_hash?: string }
export interface SessionWithHistory extends BackendSession { chat_history: ChatHistoryEntry[] }
export interface MistakeEntry { type: 'grammar' | 'vocabulary' | 'pronunciation' | 'spelling'; detail: string; timestamp: string }

const ttl = 30_000
const storageKey = 'lta_session_list_cache'
const sessionCache = new Map<string, { data: SessionWithHistory; ts: number }>()
let sessionsListCache: { data: BackendSession[]; ts: number } | null = null
let sessionsListPromise: Promise<BackendSession[]> | null = null
const fresh = <T,>(entry: { data: T; ts: number } | null) => entry && Date.now() - entry.ts < ttl ? entry.data : null
function clearListStorage() { if (typeof window !== 'undefined') removeStoredItem(sessionStorage, storageKey) }
function cachedList(): BackendSession[] | null {
  const memory = fresh(sessionsListCache); if (memory) return memory
  if (typeof window === 'undefined') return null
  const stored = readJson<{ data: BackendSession[]; ts: number }>(sessionStorage, storageKey)
  if (!stored) return null
  const data = fresh(stored)
  if (!data) { clearListStorage(); return null }
  sessionsListCache = { data, ts: stored.ts }; return data
}
function cacheList(data: BackendSession[]) { sessionsListCache = { data, ts: Date.now() }; if (typeof window !== 'undefined') writeJson(sessionStorage, storageKey, sessionsListCache) }
export function invalidateSessionCache(sessionId: string) { sessionCache.delete(sessionId); sessionsListCache = null; clearListStorage() }
export function clearSessionCaches() { sessionCache.clear(); sessionsListCache = null; clearListStorage() }

export async function createSession(language: string, level: string): Promise<CreateSessionResult> {
  const response = await authenticatedRequest('/session', { method: 'POST', body: JSON.stringify({ language: languageToBackend(language), level }) })
  sessionsListCache = null; clearListStorage()
  const data = await response.json()
  return { session_id: data.session_id, language: languageFromBackend(data.language), level: data.level }
}
export async function getSession(sessionId: string): Promise<SessionWithHistory> {
  const cached = fresh(sessionCache.get(sessionId) || null); if (cached) return cached
  const data = await (await authenticatedRequest(`/session/${sessionId}`)).json() as SessionWithHistory
  sessionCache.set(sessionId, { data, ts: Date.now() }); return data
}
export async function listSessions(): Promise<BackendSession[]> {
  const cached = cachedList(); if (cached) return cached
  if (!sessionsListPromise) sessionsListPromise = authenticatedRequest('/sessions').then((response) => response.json()).then((data: BackendSession[]) => { cacheList(data); return data }).finally(() => { sessionsListPromise = null })
  return sessionsListPromise
}
export async function refreshSessionInBackground(sessionId: string): Promise<SessionWithHistory | null> {
  try { const data = await (await authenticatedRequest(`/session/${sessionId}`)).json() as SessionWithHistory; sessionCache.set(sessionId, { data, ts: Date.now() }); return data } catch { return null }
}
export async function renameSession(sessionId: string, title: string): Promise<boolean> { try { await authenticatedRequest(`/session/${sessionId}`, { method: 'PATCH', body: JSON.stringify({ title }) }); invalidateSessionCache(sessionId); return true } catch { return false } }
export async function deleteSession(sessionId: string): Promise<boolean> { try { await authenticatedRequest(`/session/${sessionId}`, { method: 'DELETE' }); invalidateSessionCache(sessionId); return true } catch { return false } }
export async function getMistakes(sessionId: string): Promise<MistakeEntry[]> { return (await authenticatedRequest(`/session/${sessionId}/mistakes`)).json() }
