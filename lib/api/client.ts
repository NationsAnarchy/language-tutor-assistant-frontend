'use client'

import { resolveApiUrl } from './config'
import { classifyError, classifyResponseError, registerTokenCacheClearer } from './errors'

let tokenCache: { token: string; expiresAt: number } | null = null
let tokenPromise: Promise<string | null> | null = null
const REQUEST_TIMEOUT_MS = 60_000

export async function getToken(): Promise<string | null> {
  if (tokenCache && Date.now() < tokenCache.expiresAt) return tokenCache.token
  if (tokenPromise) return tokenPromise
  tokenPromise = (async () => {
    try {
      const response = await fetch('/api/auth/token')
      if (response.ok) {
        const { token } = await response.json()
        tokenCache = { token, expiresAt: Date.now() + 55 * 60 * 1000 }
        return token as string
      }
    } catch { /* unavailable outside an active browser session */ }
    tokenCache = null
    return null
  })()
  try { return await tokenPromise } finally { tokenPromise = null }
}

export function clearTokenCache() { tokenCache = null; tokenPromise = null }
registerTokenCacheClearer(clearTokenCache)

export async function getHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = await getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

export async function authenticatedRequest(path: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  const abortFromCaller = () => controller.abort()
  init.signal?.addEventListener('abort', abortFromCaller, { once: true })
  try {
    const response = await fetch(resolveApiUrl(path), {
      ...init,
      signal: controller.signal,
      headers: { ...(await getHeaders()), ...init.headers },
    })
    if (!response.ok) throw await classifyResponseError(response)
    return response
  } catch (error) {
    if (init.signal?.aborted) throw error
    if (controller.signal.aborted) throw new DOMException('The request timed out.', 'AbortError')
    throw classifyError(error)
  } finally {
    clearTimeout(timeout)
    init.signal?.removeEventListener('abort', abortFromCaller)
  }
}
