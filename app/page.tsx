'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Spinner } from '@/components/ui/spinner'
import { readActiveSession } from '@/lib/active-session'

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
    const stored = readActiveSession()
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