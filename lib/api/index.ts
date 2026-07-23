'use client'

// In development, the frontend talks directly to the backend.
// In production (Vercel), we use a same-origin Next.js API proxy to avoid CORS.
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

/** Returns true when running on Vercel (any non-localhost deployment). */
function useProxy(): boolean {
  return typeof window !== 'undefined' && window.location.hostname !== 'localhost'
}

/** Resolve the correct base URL for a backend API path.
 *  On Vercel, use the same-origin proxy route (/api/proxy/...).
 *  Locally, use the direct backend URL. */
function resolveURL(path: string): string {
  if (useProxy()) {
    return `/api/proxy${path}`
  }
  return `${BACKEND_URL}${path}`
}

// Map frontend language codes to backend language codes
const LANG_TO_BACKEND: Record<string, string> = {
  english: 'en',
  korean: 'ko',
  japanese: 'ja',
}

const LANG_FROM_BACKEND: Record<string, string> = {
  en: 'english',
  ko: 'korean',
  ja: 'japanese',
}

// ── Token cache ──────────────────────────────────────────────────────────────
// The JWT is valid for 1h; we cache it for 55m and deduplicate concurrent
// requests so switching sessions doesn't call /api/auth/token redundantly.
// IMPORTANT: must be cleared on BFCache restore (tab close/reopen) otherwise
// stale tokens cause 401s that get misclassified as 404s in loadData.
let tokenCache: { token: string; expiresAt: number } | null = null
let tokenPromise: Promise<string | null> | null = null

async function getToken(): Promise<string | null> {
  // Return cached token if still fresh
  if (tokenCache && Date.now() < tokenCache.expiresAt) {
    return tokenCache.token
  }

  // Deduplicate concurrent calls — return the same in-flight promise
  if (tokenPromise) {
    return tokenPromise
  }

  tokenPromise = (async () => {
    try {
      const res = await fetch('/api/auth/token')
      if (res.ok) {
        const { token } = await res.json()
        // Cache for 55 minutes (JWT lives 1h, refresh 5m before expiry)
        tokenCache = { token, expiresAt: Date.now() + 55 * 60 * 1000 }
        return token as string
      }
    } catch {
      // Not in a browser context or session unavailable
    }
    tokenCache = null
    return null
  })()

  const result = await tokenPromise
  tokenPromise = null
  return result
}

/** Clear the cached JWT token so the next getHeaders() call fetches a fresh one.
 *  Call this after BFCache restore or sign-in to prevent stale-token 401s. */
export function clearTokenCache() {
  tokenCache = null
  tokenPromise = null
}

async function getHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  const token = await getToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  return headers
}

// ── Session cache (client-side) ─────────────────────────────────────────────
// Cache session data and sessions list in memory so re-visiting a conversation
// doesn't show a loading spinner. Invalidated after sending messages.
// Also persisted to sessionStorage so it survives page navigations (Issue #45).
const sessionCache = new Map<string, { data: SessionWithHistory; ts: number }>()
let sessionsListCache: { data: BackendSession[]; ts: number } | null = null
let sessionsListPromise: Promise<BackendSession[]> | null = null
const CACHE_TTL = 30_000 // 30 seconds — balances freshness with snappy switches
const STORAGE_KEY = 'lta_session_list_cache'

/** Read the session list from sessionStorage (if available). */
function readSessionsListFromStorage(): BackendSession[] | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { data: BackendSession[]; ts: number }
    if (Date.now() - parsed.ts < CACHE_TTL) return parsed.data
    sessionStorage.removeItem(STORAGE_KEY)
    return null
  } catch {
    return null
  }
}

/** Write the session list to sessionStorage. */
function writeSessionsListToStorage(data: BackendSession[]) {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ data, ts: Date.now() }))
  } catch {
    // sessionStorage may be full — silently ignore
  }
}

/** Clear the session list from sessionStorage. */
function clearSessionsListFromStorage() {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}

/** Return cached session data if fresh, otherwise null. */
function getCachedSession(sessionId: string): SessionWithHistory | null {
  const entry = sessionCache.get(sessionId)
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data
  return null
}

function setCachedSession(sessionId: string, data: SessionWithHistory) {
  sessionCache.set(sessionId, { data, ts: Date.now() })
}

function getCachedSessionsList(): BackendSession[] | null {
  // Check in-memory cache first
  if (sessionsListCache && Date.now() - sessionsListCache.ts < CACHE_TTL) {
    return sessionsListCache.data
  }
  // Fall back to sessionStorage (survives page navigation)
  const stored = readSessionsListFromStorage()
  if (stored) {
    // Restore into in-memory cache
    sessionsListCache = { data: stored, ts: Date.now() }
    return stored
  }
  return null
}

function setCachedSessionsList(data: BackendSession[]) {
  sessionsListCache = { data, ts: Date.now() }
  writeSessionsListToStorage(data)
}

/** Invalidate cached data for a session — call after sending a chat message
 *  so the next visit to this session fetches fresh history. */
export function invalidateSessionCache(sessionId: string) {
  sessionCache.delete(sessionId)
  sessionsListCache = null
}

/** Clear all session caches — call after creating/deleting a session. */
export function clearSessionCaches() {
  sessionCache.clear()
  sessionsListCache = null
  clearSessionsListFromStorage()
}

// ── ApiError — rich error classification ─────────────────────────────────────

export type ApiErrorCode =
  | 'network'
  | 'timeout'
  | 'auth'
  | 'forbidden'
  | 'not_found'
  | 'server'
  | 'rate_limit'
  | 'validation'
  | 'unknown'

export class ApiError extends Error {
  status: number
  code: ApiErrorCode
  retryable: boolean
  requestId?: string

  constructor(
    status: number,
    message: string,
    code: ApiErrorCode = 'unknown',
    retryable = false,
    requestId?: string,
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.retryable = retryable
    this.requestId = requestId
  }
}

/**
 * Classify a thrown error (from fetch or other async work) into a typed
 * ApiError. Handles:
 *  - DOMException (AbortError → timeout)
 *  - TypeError (network failure)
 *  - ApiError (pass-through)
 *  - Response objects (from fetch with throwOnError)
 *  - Generic Error / unknown
 */
export function classifyError(err: unknown, fallbackStatus = 0): ApiError {
  // Already classified
  if (err instanceof ApiError) return err

  // Abort / timeout
  if (err instanceof DOMException && err.name === 'AbortError') {
    return new ApiError(408, 'The request took too long. Please try again.', 'timeout', true)
  }

  // Network failure (fetch throws TypeError on DNS / connection errors)
  if (err instanceof TypeError) {
    return new ApiError(
      0,
      "Can't reach the server. Check your connection and try again.",
      'network',
      true,
    )
  }

  // Generic Error with a message we can inspect
  if (err instanceof Error) {
    // Some fetch wrappers throw with status-like messages
    const msg = err.message.toLowerCase()
    if (msg.includes('failed to fetch') || msg.includes('networkerror')) {
      return new ApiError(
        0,
        "Can't reach the server. Check your connection and try again.",
        'network',
        true,
      )
    }
    return new ApiError(fallbackStatus, err.message || 'Something went wrong.', 'unknown', false)
  }

  return new ApiError(fallbackStatus, 'Something unexpected happened.', 'unknown', false)
}

/**
 * Classify an HTTP response into an ApiError. Reads the JSON body for a
 * `detail` field (FastAPI convention) and maps status codes to friendly codes.
 */
export async function classifyResponseError(res: Response): Promise<ApiError> {
  const body = await res.json().catch(() => ({ detail: res.statusText }))
  const detail: string = body?.detail || res.statusText || 'Request failed'
  const requestId: string | undefined = body?.request_id || res.headers.get('x-request-id') || undefined

  let code: ApiErrorCode = 'unknown'
  let retryable = false
  let friendlyMessage = detail

  switch (res.status) {
    case 401:
      code = 'auth'
      retryable = false
      friendlyMessage = 'Your session expired. Please sign in again.'
      break
    case 403:
      code = 'forbidden'
      retryable = false
      friendlyMessage = "You don't have access to that."
      break
    case 404:
      code = 'not_found'
      retryable = false
      friendlyMessage = detail || "We couldn't find that."
      break
    case 408:
      code = 'timeout'
      retryable = true
      friendlyMessage = 'The request took too long. Please try again.'
      break
    case 422:
      code = 'validation'
      retryable = false
      friendlyMessage = detail || 'Something in the request wasn\'t quite right.'
      break
    case 429:
      code = 'rate_limit'
      retryable = true
      friendlyMessage = 'Too many requests — take a breath and try again in a moment.'
      break
    default:
      if (res.status >= 500) {
        code = 'server'
        retryable = true
        friendlyMessage = "Our tutor is having a moment. Please try again."
      } else if (res.status >= 400) {
        code = 'validation'
        retryable = false
      }
      break
  }

  return new ApiError(res.status, friendlyMessage, code, retryable, requestId)
}

/**
 * Wrap a promise with a client-side timeout. If the timeout fires before
 * the promise resolves, the returned promise rejects with an AbortError-like
 * DOMException. If an external AbortSignal is provided, it's also respected.
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  externalSignal?: AbortSignal,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let settled = false
    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      const err = new DOMException('The operation timed out.', 'AbortError')
      reject(err)
    }, ms)

    const onAbort = () => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      reject(new DOMException('The operation was aborted.', 'AbortError'))
    }

    if (externalSignal) {
      if (externalSignal.aborted) {
        onAbort()
        return
      }
      externalSignal.addEventListener('abort', onAbort, { once: true })
    }

    promise.then(
      (value) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        resolve(value)
      },
      (err) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        reject(err)
      },
    )
  })
}

// ---- Public API ----

export interface BackendSession {
  session_id: string
  user_id: string
  language: string // backend code: 'en'|'ko'|'ja'
  level: string
  created_at: string
  updated_at?: string
}

export interface CreateSessionResult {
  session_id: string
  language: string
  level: string
}

export async function createSession(language: string, level: string): Promise<CreateSessionResult> {
  const backendLang = LANG_TO_BACKEND[language] || language
  let res: Response
  try {
    res = await fetch(resolveURL('/session'), {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify({ language: backendLang, level }),
    })
  } catch (err) {
    throw classifyError(err)
  }
  if (!res.ok) {
    throw await classifyResponseError(res)
  }
  // Invalidate sessions list cache so sidebar picks up the new session (Issue #38)
  sessionsListCache = null
  const data = await res.json()
  return {
    session_id: data.session_id,
    language: LANG_FROM_BACKEND[data.language] || data.language,
    level: data.level,
  }
}

export interface SessionWithHistory extends BackendSession {
  chat_history: { role: string; content: string; audio_url?: string }[]
}

export async function getSession(sessionId: string): Promise<SessionWithHistory> {
  // Check client-side cache first — allows instant switch back to a
  // previously visited conversation without the loading spinner.
  const cached = getCachedSession(sessionId)
  if (cached) return cached

  let res: Response
  try {
    res = await fetch(resolveURL(`/session/${sessionId}`), {
      headers: await getHeaders(),
    })
  } catch (err) {
    throw classifyError(err)
  }
  if (!res.ok) {
    throw await classifyResponseError(res)
  }
  const data = await res.json()
  setCachedSession(sessionId, data)
  return data
}

export async function listSessions(): Promise<BackendSession[]> {
  // Check client-side cache first
  const cached = getCachedSessionsList()
  if (cached) return cached

  // Deduplicate concurrent calls — return the same in-flight promise (Issue #45)
  if (sessionsListPromise) {
    return sessionsListPromise
  }

  sessionsListPromise = (async () => {
    let res: Response
    try {
      res = await fetch(resolveURL('/sessions'), {
        headers: await getHeaders(),
      })
    } catch (err) {
      throw classifyError(err)
    }
    if (!res.ok) {
      throw await classifyResponseError(res)
    }
    const data = await res.json()
    setCachedSessionsList(data)
    return data
  })()

  try {
    return await sessionsListPromise
  } finally {
    sessionsListPromise = null
  }
}

/** Re-fetch a single session from the backend and update the cache.
 *  Use for background refreshes — returns the fresh data without throwing. */
export async function refreshSessionInBackground(sessionId: string): Promise<SessionWithHistory | null> {
  try {
    const res = await fetch(resolveURL(`/session/${sessionId}`), {
      headers: await getHeaders(),
    })
    if (!res.ok) return null
    const data = await res.json()
    setCachedSession(sessionId, data)
    return data
  } catch {
    return null
  }
}

export interface ChatResult {
  reply: string
  intent: string
  audio_url: string | null
}

export async function sendChat(sessionId: string, message: string, signal?: AbortSignal): Promise<ChatResult> {
  let res: Response
  try {
    res = await fetch(resolveURL('/chat'), {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify({ session_id: sessionId, message }),
      signal,
    })
  } catch (err) {
    throw classifyError(err)
  }
  if (!res.ok) {
    throw await classifyResponseError(res)
  }
  return res.json()
}

export async function renameSession(sessionId: string, title: string): Promise<boolean> {
  let res: Response
  try {
    res = await fetch(resolveURL(`/session/${sessionId}`), {
      method: 'PATCH',
      headers: await getHeaders(),
      body: JSON.stringify({ title }),
    })
  } catch {
    return false
  }
  if (res.ok) {
    // Invalidate caches so sidebar refreshes with the new title (Issue #38)
    sessionCache.delete(sessionId)
    sessionsListCache = null
  }
  return res.ok
}

export async function deleteSession(sessionId: string): Promise<boolean> {
  let res: Response
  try {
    res = await fetch(resolveURL(`/session/${sessionId}`), {
      method: 'DELETE',
      headers: await getHeaders(),
    })
  } catch {
    return false
  }
  if (res.ok) {
    // Invalidate caches so sidebar reflects the deletion immediately (Issue #38)
    sessionCache.delete(sessionId)
    sessionsListCache = null
  }
  return res.ok
}

export async function synthesizeAudio(sessionId: string, signal?: AbortSignal): Promise<string | null> {
  let res: Response
  try {
    res = await fetch(resolveURL(`/session/${sessionId}/tts`), {
      method: 'POST',
      headers: await getHeaders(),
      signal,
    })
  } catch (err) {
    // Surface the error so callers can show inline feedback instead of silently failing
    throw classifyError(err)
  }
  if (!res.ok) {
    throw await classifyResponseError(res)
  }
  const data = await res.json()
  return audioUrl(data.audio_url)
}

export function audioUrl(filename: string | null): string | null {
  if (!filename) return null
  // On Vercel, route audio through the proxy (same-origin, no CORS).
  // The proxy now handles binary data correctly using ArrayBuffer.
  if (useProxy()) {
    return `/api/proxy/audio/${filename}`
  }
  return `${BACKEND_URL}/audio/${filename}`
}

export function langToBackend(lang: string): string {
  return LANG_TO_BACKEND[lang] || lang
}

export function langFromBackend(lang: string): string {
  return LANG_FROM_BACKEND[lang] || lang
}