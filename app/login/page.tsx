'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { LoginScreen } from '@/components/auth/login-screen'
import { Spinner } from '@/components/ui/spinner'

export default function LoginPage() {
  const { status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/')
    }
  }, [status, router])

  // Render the login UI only once we know the visitor is unauthenticated.
  // Waiting prevents a brief flash of the login screen between the OAuth
  // redirect and session resolution. Deriving this from `status` instead of
  // mirroring it into state avoids an extra render pass.
  if (status === 'loading' || status === 'authenticated') {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <Spinner size="lg" label="Loading..." />
      </main>
    )
  }

  return <LoginScreen />
}
