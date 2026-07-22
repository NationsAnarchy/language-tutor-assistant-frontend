'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { LoginScreen } from '@/components/login-screen'
import { Spinner } from '@/components/ui/spinner'

export default function LoginPage() {
  const { status } = useSession()
  const router = useRouter()
  const [hasChecked, setHasChecked] = useState(false)

  useEffect(() => {
    if (status === 'loading') return

    if (status === 'authenticated') {
      router.replace('/')
      return
    }

    // Only show LoginScreen when we know the user is unauthenticated.
    // Waiting prevents a brief flash of the login UI between OAuth
    // redirect and session resolution.
    setHasChecked(true)
  }, [status, router])

  if (!hasChecked) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <Spinner size="lg" label="Loading..." />
      </main>
    )
  }

  return <LoginScreen />
}