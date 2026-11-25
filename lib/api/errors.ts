'use client'

import { toast } from '@/lib/toast'

export type ApiErrorCode = 'network' | 'timeout' | 'auth' | 'forbidden' | 'not_found' | 'server' | 'rate_limit' | 'validation' | 'unknown'

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code: ApiErrorCode = 'unknown',
    public retryable = false,
    public requestId?: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export function classifyError(err: unknown, fallbackStatus = 0): ApiError {
  if (err instanceof ApiError) return err
  if (err instanceof DOMException && err.name === 'AbortError') {
    return new ApiError(408, 'The request took too long. Please try again.', 'timeout', true)
  }
  if (err instanceof TypeError) {
    return new ApiError(0, "Can't reach the server. Check your connection and try again.", 'network', true)
  }
  if (err instanceof Error) {
    const message = err.message.toLowerCase()
    if (message.includes('failed to fetch') || message.includes('networkerror')) {
      return new ApiError(0, "Can't reach the server. Check your connection and try again.", 'network', true)
    }
    return new ApiError(fallbackStatus, err.message || 'Something went wrong.', 'unknown')
  }
  return new ApiError(fallbackStatus, 'Something unexpected happened.', 'unknown')
}

export async function classifyResponseError(res: Response): Promise<ApiError> {
  const body = await res.json().catch(() => ({ detail: res.statusText }))
  const detail = body?.detail || res.statusText || 'Request failed'
  const requestId = body?.request_id || res.headers.get('x-request-id') || undefined
  let code: ApiErrorCode = 'unknown'
  let retryable = false
  let message = detail
  switch (res.status) {
    case 401: code = 'auth'; message = 'Your session expired. Please sign in again.'; break
    case 403: code = 'forbidden'; message = "You don't have access to that."; break
    case 404: code = 'not_found'; message = detail || "We couldn't find that."; break
    case 408: code = 'timeout'; retryable = true; message = 'The request took too long. Please try again.'; break
    case 422: code = 'validation'; message = detail || "Something in the request wasn't quite right."; break
    case 429: code = 'rate_limit'; retryable = true; message = 'Too many requests — take a breath and try again in a moment.'; break
    default:
      if (res.status >= 500) { code = 'server'; retryable = true; message = 'Our tutor is having a moment. Please try again.' }
      else if (res.status >= 400) code = 'validation'
  }
  return new ApiError(res.status, message, code, retryable, requestId)
}

export function withTimeout<T>(promise: Promise<T>, ms: number, externalSignal?: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    let settled = false
    const finish = (callback: () => void) => { if (!settled) { settled = true; clearTimeout(timer); callback() } }
    const timer = setTimeout(() => finish(() => reject(new DOMException('The operation timed out.', 'AbortError'))), ms)
    const onAbort = () => finish(() => reject(new DOMException('The operation was aborted.', 'AbortError')))
    if (externalSignal) {
      if (externalSignal.aborted) return onAbort()
      externalSignal.addEventListener('abort', onAbort, { once: true })
    }
    promise.then((value) => finish(() => resolve(value)), (error) => finish(() => reject(error)))
  })
}

let clearCachedToken = () => {}
export function registerTokenCacheClearer(clearer: () => void) { clearCachedToken = clearer }

export function handleApiError(err: unknown, router: { replace: (path: string) => void }): { message: string; retryable: boolean } {
  if (!(err instanceof ApiError)) {
    const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.'
    toast.error(message)
    return { message, retryable: false }
  }
  if (err.code === 'auth') {
    clearCachedToken()
    toast.error(err.message, { description: 'Redirecting you to sign in…', duration: 3000 })
    setTimeout(() => router.replace('/login'), 1500)
  } else if (err.code === 'network') toast.error(err.message, { action: { label: 'Retry', onClick: () => {} } })
  else if (err.code === 'timeout' || err.code === 'rate_limit') toast.warning(err.message)
  else toast.error(err.message || 'Something went wrong.')
  return { message: err.message || 'Something went wrong.', retryable: err.retryable }
}
