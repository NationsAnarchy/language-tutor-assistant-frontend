// @vitest-environment jsdom

import { act, useEffect } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { LoadedChatSession } from '@/lib/chat/session-hydration'

const api = vi.hoisted(() => ({ getSession: vi.fn() }))
vi.mock('@/lib/api', () => ({ ApiError: class ApiError extends Error { status = 0 }, ...api }))
vi.mock('@/lib/audio-manager', () => ({ audioManager: { stopAll: vi.fn() } }))
vi.mock('@/lib/chat/session-hydration', () => ({ hydrateChatSession: (session: { session_id: string }) => ({ sessionId: session.session_id, language: 'english', level: 'beginner', messages: [] }) }))

import { useChatSessionNavigation } from './use-chat-session-navigation'

function deferred<T>() {
  let resolve!: (value: T) => void
  return { promise: new Promise<T>((next) => { resolve = next }), resolve }
}

function Harness({ onReady, onSessionLoaded }: { onReady: (value: ReturnType<typeof useChatSessionNavigation>) => void; onSessionLoaded: (session: LoadedChatSession) => void }) {
  const navigation = useChatSessionNavigation({ push: vi.fn(), replace: vi.fn() }, onSessionLoaded)
  useEffect(() => { onReady(navigation) }, [navigation, onReady])
  return null
}

describe('useChatSessionNavigation', () => {
  let container: HTMLDivElement
  let root: Root

  afterEach(async () => {
    await act(async () => root?.unmount())
    container?.remove()
    vi.clearAllMocks()
  })

  it('ignores Session A when Session B is selected before A finishes loading', async () => {
    const a = deferred<{ session_id: string }>()
    const b = deferred<{ session_id: string }>()
    api.getSession.mockImplementation((id: string) => id === 'a' ? a.promise : b.promise)
    const onSessionLoaded = vi.fn()
    let navigation!: ReturnType<typeof useChatSessionNavigation>
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    await act(async () => { root.render(<Harness onReady={(value) => { navigation = value }} onSessionLoaded={onSessionLoaded} />) })

    void navigation.switchToSession('a')
    void navigation.switchToSession('b')
    await act(async () => { a.resolve({ session_id: 'a' }); await a.promise })
    expect(onSessionLoaded).not.toHaveBeenCalled()
    await act(async () => { b.resolve({ session_id: 'b' }); await b.promise })
    expect(onSessionLoaded).toHaveBeenCalledTimes(1)
    expect(onSessionLoaded).toHaveBeenCalledWith(expect.objectContaining({ sessionId: 'b' }))
  })
})
