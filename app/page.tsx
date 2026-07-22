'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Spinner } from '@/components/ui/spinner'
import type { Language, Level } from '@/lib/types'

const STORAGE_KEY = 'linguaai_active_session'

function readStoredSession(): { language: Language; level: Level; sessionId: string } | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export default function RootPage() {
  const { status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return

    if (status === 'unauthenticated') {
      router.replace('/login')
      return
    }

    // Authenticated — check for stored session first
    // Skip backend verification — the chat page handles invalid sessions itself (Issue #36)
    const stored = readStoredSession()
    if (stored?.sessionId) {
      router.replace(`/chat?session=${stored.sessionId}`)
      return
    }

    // No stored session — go to language picker
    router.replace('/language')
  }, [status, router])

  return (
    <main className="min-h-screen flex items-center justify-center bg-background">
      <Spinner size="lg" label="Loading..." />
    </main>
  )
}