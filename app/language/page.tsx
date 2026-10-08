'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { LanguagePicker } from '@/components/language/language-picker'
import { Spinner } from '@/components/ui/spinner'
import { clearActiveSession } from '@/lib/active-session'
import { clearTokenCache, createSession, listSessions } from '@/lib/api'
import { byMostRecent, mapBackendSession } from '@/lib/mappers'
import { toast } from '@/lib/toast'
import type { Language, Level, Session } from '@/lib/types'

export default function LanguagePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [existingSessions, setExistingSessions] = useState<Session[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const loadUserSessions = useCallback(async () => {
    setSessionsLoading(true)
    try {
      const sessions = await listSessions()
      setExistingSessions(sessions.map(mapBackendSession))
    } catch {
      setExistingSessions([])
    } finally {
      setSessionsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login')
      return
    }
    if (status === 'authenticated') {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch; state updates happen after `await`, not during the effect
      loadUserSessions()
    }
  }, [status, loadUserSessions, router])

  const handleStart = async (lang: Language, lvl: Level) => {
    if (submitting) return
    const matching = existingSessions
      .filter((s) => s.language === lang && s.level === lvl && s.session_id)
      .sort(byMostRecent)
    const existing = matching[0]
    if (existing?.session_id) {
      setSubmitting(true)
      router.push(`/chat?session=${existing.session_id}`)
      return
    }
    setSubmitting(true)
    try {
      const result = await createSession(lang, lvl)
      router.push(`/chat?session=${result.session_id}`)
    } catch {
      toast.error("Couldn't start the practice session. Please try again.")
      setSubmitting(false)
    }
  }

  const handleStartFresh = async (lang: Language, lvl: Level) => {
    if (submitting) return
    setSubmitting(true)
    try {
      const result = await createSession(lang, lvl)
      router.push(`/chat?session=${result.session_id}`)
    } catch {
      toast.error("Couldn't start the practice session. Please try again.")
      setSubmitting(false)
    }
  }

  const handleSignOut = () => {
    setExistingSessions([])
    clearActiveSession(session?.user?.id)
    clearTokenCache()
    signOut({ callbackUrl: '/login' })
  }

  if (status === 'loading') {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <Spinner size="lg" label="Loading..." />
      </main>
    )
  }

  if (!session) return null

  const user = {
    name: session.user?.name || 'User',
    email: session.user?.email || '',
    image: session.user?.image || undefined,
  }

  return (
    <LanguagePicker
      user={user}
      existingSessions={existingSessions}
      loading={sessionsLoading}
      submitting={submitting}
      onStart={handleStart}
      onStartFresh={handleStartFresh}
      onSignOut={handleSignOut}
    />
  )
}