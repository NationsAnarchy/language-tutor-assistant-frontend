import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('./client', () => ({ authenticatedRequest: vi.fn() }))

import { authenticatedRequest } from './client'
import { clearSessionCaches, getCachedSession, getSession, refreshSessionInBackground } from './sessions'

const session = (sessionId: string, content = 'Hello') => ({
  session_id: sessionId,
  user_id: 'user-1',
  language: 'en',
  level: 'beginner',
  created_at: '2026-01-01T00:00:00Z',
  chat_history: [{ role: 'assistant', content }],
})

const response = (data: ReturnType<typeof session>) => ({ json: vi.fn().mockResolvedValue(data) }) as never

afterEach(() => {
  clearSessionCaches()
  vi.mocked(authenticatedRequest).mockReset()
  vi.useRealTimers()
})

describe('session detail cache', () => {
  it('returns fresh cached data immediately and refreshes it independently', async () => {
    vi.mocked(authenticatedRequest).mockResolvedValueOnce(response(session('a', 'cached')))
    await expect(getSession('a')).resolves.toMatchObject({ chat_history: [{ content: 'cached' }] })

    await expect(getSession('a')).resolves.toMatchObject({ chat_history: [{ content: 'cached' }] })
    expect(authenticatedRequest).toHaveBeenCalledTimes(1)

    vi.mocked(authenticatedRequest).mockResolvedValueOnce(response(session('a', 'fresh')))
    await expect(refreshSessionInBackground('a')).resolves.toMatchObject({ chat_history: [{ content: 'fresh' }] })
    expect(getCachedSession('a')).toMatchObject({ chat_history: [{ content: 'fresh' }] })
  })

  it('expires detail entries after the cache TTL and leaves cached data intact after a failed refresh', async () => {
    vi.useFakeTimers()
    vi.mocked(authenticatedRequest).mockResolvedValueOnce(response(session('a', 'cached')))
    await getSession('a')
    vi.mocked(authenticatedRequest).mockRejectedValueOnce(new Error('offline'))
    await expect(refreshSessionInBackground('a')).resolves.toBeNull()
    expect(getCachedSession('a')).toMatchObject({ chat_history: [{ content: 'cached' }] })

    await vi.advanceTimersByTimeAsync(30_000)
    expect(getCachedSession('a')).toBeNull()
    vi.mocked(authenticatedRequest).mockResolvedValueOnce(response(session('a', 'reloaded')))
    await expect(getSession('a')).resolves.toMatchObject({ chat_history: [{ content: 'reloaded' }] })
  })
})
