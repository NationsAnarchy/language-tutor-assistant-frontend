// @vitest-environment jsdom

import { act, useCallback, useEffect, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { LoadedChatSession } from '@/lib/chat/session-hydration'

const api = vi.hoisted(() => ({
  clearTokenCache: vi.fn(),
  getCachedSession: vi.fn(),
  getSession: vi.fn(),
  refreshSessionInBackground: vi.fn(),
}))

vi.mock('@/lib/api', () => ({ ApiError: class ApiError extends Error { status = 0 }, ...api }))
vi.mock('@/lib/chat/session-hydration', () => ({ hydrateChatSession: (session: { session_id: string }) => ({ sessionId: session.session_id, language: 'english', level: 'beginner', messages: [] }) }))

import { useChatSessionLoader } from './use-chat-session-loader'

function deferred<T>() {
  let resolve!: (value: T) => void
  return { promise: new Promise<T>((next) => { resolve = next }), resolve }
}

function Harness({ sessionId, onSessionLoaded }: { sessionId: string; onSessionLoaded: (session: LoadedChatSession) => void }) {
  const [switchingRef] = useState({ current: false })
  const [router] = useState({ replace: vi.fn() })
  const refreshSessions = useCallback(async () => [], [])
  const updateSession = useCallback(async () => undefined, [])
  useChatSessionLoader({
    sessionId,
    router,
    refreshSessions,
    updateSession,
    switchingRef,
    isChatActive: false,
    onSessionLoaded,
  })
  return null
}

describe('useChatSessionLoader', () => {
  let container: HTMLDivElement
  let root: Root

  afterEach(async () => {
    await act(async () => root?.unmount())
    container?.remove()
    vi.clearAllMocks()
  })

  it('does not apply Session A’s late background refresh after navigation to Session B', async () => {
    const refreshA = deferred<{ session_id: string } | null>()
    api.getCachedSession.mockImplementation((id: string) => id === 'a' ? { session_id: 'a' } : null)
    api.refreshSessionInBackground.mockImplementation(() => refreshA.promise)
    api.getSession.mockResolvedValue({ session_id: 'b' })
    const onSessionLoaded = vi.fn()
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

    await act(async () => { root.render(<Harness sessionId="a" onSessionLoaded={onSessionLoaded} />) })
    expect(onSessionLoaded).toHaveBeenCalledWith(expect.objectContaining({ sessionId: 'a' }))

    await act(async () => { root.render(<Harness sessionId="b" onSessionLoaded={onSessionLoaded} />) })
    expect(onSessionLoaded).toHaveBeenLastCalledWith(expect.objectContaining({ sessionId: 'b' }))

    await act(async () => { refreshA.resolve({ session_id: 'a' }); await refreshA.promise })
    expect(onSessionLoaded).toHaveBeenCalledTimes(2)
  })
})
