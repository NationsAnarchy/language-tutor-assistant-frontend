'use client'

import { resolveApiUrl } from './config'
import { classifyError, classifyResponseError, registerTokenCacheClearer } from './errors'

let tokenCache: { token: string; expiresAt: number } | null = null
let tokenPromise: Promise<string | null> | null = null

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
  try {
    const response = await fetch(resolveApiUrl(path), { ...init, headers: { ...(await getHeaders()), ...init.headers } })
    if (!response.ok) throw await classifyResponseError(response)
    return response
  } catch (error) { throw classifyError(error) }
}
