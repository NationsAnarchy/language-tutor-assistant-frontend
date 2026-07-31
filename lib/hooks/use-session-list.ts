'use client'

import { useCallback, useState } from 'react'
import { deleteSession, listSessions, mapBackendSession, renameSession } from '@/lib/api'
import type { Session } from '@/lib/types'

/** Session-list state with optimistic rename/delete and server rollback. */
export function useSessionList() {
  const [sessions, setSessions] = useState<Session[]>([])

  const refresh = useCallback(async () => {
    const response = await listSessions()
    const next = response.map(mapBackendSession)
    setSessions(next)
    return next
  }, [])

  const rename = useCallback(async (sessionId: string, title: string) => {
    setSessions((current) => current.map((session) =>
      session.session_id === sessionId ? { ...session, title } : session,
    ))
    if (!await renameSession(sessionId, title)) await refresh()
  }, [refresh])

  const remove = useCallback(async (sessionId: string) => {
    const previous = sessions
    setSessions((current) => current.filter((session) => session.session_id !== sessionId))
    if (!await deleteSession(sessionId)) {
      setSessions(previous)
      return { deleted: false, remaining: previous }
    }
    return { deleted: true, remaining: previous.filter((session) => session.session_id !== sessionId) }
  }, [sessions])

  return { sessions, setSessions, refresh, rename, remove }
}
