'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { LanguagePicker } from '@/components/language/language-picker'
import { Spinner } from '@/components/ui/spinner'
import {
  createSession,
  listSessions,
  mapBackendSession,
} from '@/lib/api'
import type { Language, Level, Session } from '@/lib/types'

export default function LanguagePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [existingSessions, setExistingSessions] = useState<Session[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(false)

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
      loadUserSessions()
    }
  }, [status, loadUserSessions, router])

  const handleStart = async (lang: Language, lvl: Level) => {
    const matching = existingSessions
      .filter((s) => s.language === lang && s.level === lvl && s.session_id)
      .sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''))
    const existing = matching[0]
    if (existing?.session_id) {
      router.push(`/chat?session=${existing.session_id}`)
      return
    }
    try {
      const result = await createSession(lang, lvl)
      router.push(`/chat?session=${result.session_id}`)
    } catch {
      // Fallback
    }
  }

  const handleStartFresh = async (lang: Language, lvl: Level) => {
    try {
      const result = await createSession(lang, lvl)
      router.push(`/chat?session=${result.session_id}`)
    } catch {
      // Fallback
    }
  }

  const handleSignOut = () => {
    setExistingSessions([])
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
      onStart={handleStart}
      onStartFresh={handleStartFresh}
      onSignOut={handleSignOut}
    />
  )
}