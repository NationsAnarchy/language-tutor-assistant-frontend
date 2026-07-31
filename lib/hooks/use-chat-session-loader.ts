'use client'

import { useCallback, useEffect, useState, type MutableRefObject } from 'react'
import { ApiError, clearTokenCache, getSession } from '@/lib/api'
import { hydrateChatSession, type LoadedChatSession } from '@/lib/chat/session-hydration'

type Router = { replace: (path: string) => void }
interface Options {
  sessionId: string | null
  router: Router
  refreshSessions: () => Promise<unknown>
  updateSession: () => Promise<unknown>
  switchingRef: MutableRefObject<boolean>
  onSessionLoaded: (session: LoadedChatSession) => void
}

/** Owns page-level session loading, BFCache recovery, and its spinner fallback. */
export function useChatSessionLoader({ sessionId, router, refreshSessions, updateSession, switchingRef, onSessionLoaded }: Options) {
  const [loading, setLoading] = useState(true)
  const [forceReady, setForceReady] = useState(false)
  const load = useCallback(async () => {
    if (!sessionId) { router.replace('/language'); return }
    if (switchingRef.current) return
    try {
      // The sidebar is useful but must never prevent the active conversation
      // from loading. Its own hook retains the previous list on failure.
      void refreshSessions().catch(() => {})
      const backendSession = await getSession(sessionId)
      onSessionLoaded(hydrateChatSession(backendSession))
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) router.replace('/language')
    } finally {
      setLoading(false)
      switchingRef.current = false
    }
  }, [onSessionLoaded, refreshSessions, router, sessionId, switchingRef])
  useEffect(() => { void load() }, [load])
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return
      setLoading(true)
      clearTokenCache()
      void updateSession().then(() => load())
    }
    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
  }, [load, updateSession])
  useEffect(() => { const timer = setTimeout(() => setForceReady(true), 5000); return () => clearTimeout(timer) }, [])
  return { loading, forceReady, reload: load }
}
