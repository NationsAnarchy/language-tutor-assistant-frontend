'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type MutableRefObject } from 'react'
import { ApiError, clearTokenCache, getCachedSession, getSession, refreshSessionInBackground } from '@/lib/api'
import { hydrateChatSession, type LoadedChatSession } from '@/lib/chat/session-hydration'

type Router = { replace: (path: string) => void }
interface Options {
  sessionId: string | null
  router: Router
  refreshSessions: () => Promise<unknown>
  updateSession: () => Promise<unknown>
  switchingRef: MutableRefObject<boolean>
  isChatActive: boolean
  onSessionLoaded: (session: LoadedChatSession) => void
}

/** Owns page-level session loading, BFCache recovery, and its spinner fallback. */
export function useChatSessionLoader({ sessionId, router, refreshSessions, updateSession, switchingRef, isChatActive, onSessionLoaded }: Options) {
  const [loading, setLoading] = useState(true)
  const [forceReady, setForceReady] = useState(false)
  const currentSessionIdRef = useRef(sessionId)
  const isChatActiveRef = useRef(isChatActive)
  useLayoutEffect(() => {
    currentSessionIdRef.current = sessionId
    isChatActiveRef.current = isChatActive
  }, [isChatActive, sessionId])
  const load = useCallback(async () => {
    if (!sessionId) { router.replace('/language'); return }
    if (switchingRef.current) return
    const requestedSessionId = sessionId
    const isCurrent = () => currentSessionIdRef.current === requestedSessionId && !switchingRef.current
    try {
      // The sidebar is useful but must never prevent the active conversation
      // from loading. Its own hook retains the previous list on failure.
      void refreshSessions().catch(() => {})
      const cached = getCachedSession(requestedSessionId)
      if (cached) {
        if (isCurrent()) onSessionLoaded(hydrateChatSession(cached))
        setLoading(false)
        void refreshSessionInBackground(requestedSessionId).then((refreshed) => {
          if (refreshed && isCurrent() && !isChatActiveRef.current) onSessionLoaded(hydrateChatSession(refreshed))
        })
        return
      }
      const backendSession = await getSession(sessionId)
      if (isCurrent()) onSessionLoaded(hydrateChatSession(backendSession))
    } catch (error) {
      if (isCurrent() && error instanceof ApiError && error.status === 404) router.replace('/language')
    } finally {
      if (isCurrent()) setLoading(false)
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
