'use client'

import { resolveApiUrl } from './config'
import { ApiError, classifyError, classifyResponseError, registerTokenCacheClearer } from './errors'

const REQUEST_TIMEOUT_MS = 60_000

/**
 * Legacy token getter kept for backwards compatibility with any existing callers.
 * Backend tokens are now minted server-side by the API proxy directly from the NextAuth
 * session cookie, so client-side JavaScript never handles or exposes raw JWTs.
 */
export async function getToken(): Promise<string | null> {
  return null
}

export function clearTokenCache() {
  // No-op: token lifecycle is managed entirely on the server
}
registerTokenCacheClearer(clearTokenCache)

export async function getHeaders(): Promise<Record<string, string>> {
  return { 'Content-Type': 'application/json' }
}

export async function authenticatedRequest(path: string, init: RequestInit = {}): Promise<Response> {
  const timeoutController = new AbortController()
  const timeout = setTimeout(() => timeoutController.abort(), REQUEST_TIMEOUT_MS)
  if (init.signal && !(typeof AbortSignal !== 'undefined' && typeof AbortSignal.any === 'function')) {
    init.signal.addEventListener('abort', () => timeoutController.abort(), { once: true })
  }
  const signal = init.signal
    ? (typeof AbortSignal !== 'undefined' && typeof AbortSignal.any === 'function'
        ? AbortSignal.any([init.signal, timeoutController.signal])
        : timeoutController.signal)
    : timeoutController.signal

  try {
    const response = await fetch(resolveApiUrl(path), {
      ...init,
      signal,
      headers: { ...(await getHeaders()), ...init.headers },
    })
    if (!response.ok) throw await classifyResponseError(response)
    return response
  } catch (error) {
    if (init.signal?.aborted) throw error
    if (timeoutController.signal.aborted) throw new ApiError(408, 'The request timed out. Please try again.', 'timeout', true)
    throw classifyError(error)
  } finally {
    clearTimeout(timeout)
  }
}
