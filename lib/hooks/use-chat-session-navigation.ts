'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, getSession } from '@/lib/api'
import { audioManager } from '@/lib/audio-manager'
import { hydrateChatSession, type LoadedChatSession } from '@/lib/chat/session-hydration'

type Router = { push: (path: string) => void; replace: (path: string) => void }

export type { LoadedChatSession } from '@/lib/chat/session-hydration'

/** Keeps client-side session switching and browser history in one place. */
export function useChatSessionNavigation(router: Router, onSessionLoaded: (session: LoadedChatSession) => void) {
  const [switchingSession, setSwitchingSession] = useState(false)
  const switchingRef = useRef(false)
  const requestVersionRef = useRef(0)

  const switchToSession = useCallback(async (sessionId: string, fromPopState = false) => {
    const requestVersion = ++requestVersionRef.current
    setSwitchingSession(true)
    switchingRef.current = true
    try {
      const session = await getSession(sessionId)
      if (requestVersion !== requestVersionRef.current) return
      onSessionLoaded(hydrateChatSession(session))
      if (!fromPopState) window.history.pushState({ sessionId }, '', `/chat?session=${sessionId}`)
    } catch (error) {
      if (requestVersion === requestVersionRef.current && error instanceof ApiError && error.status === 404) router.replace('/language')
    } finally {
      if (requestVersion === requestVersionRef.current) {
        setSwitchingSession(false)
        switchingRef.current = false
      }
    }
  }, [onSessionLoaded, router])

  useEffect(() => {
    const onPopState = (event: PopStateEvent) => {
      audioManager.stopAll()
      const sessionId = (event.state as { sessionId?: string } | null)?.sessionId
        ?? new URLSearchParams(window.location.search).get('session')
      if (sessionId) void switchToSession(sessionId, true)
      else router.push('/language')
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [router, switchToSession])

  return { switchingSession, switchingRef, switchToSession }
}
