import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Toaster } from 'sonner'
import '@fontsource/noto-sans/400.css'
import '@fontsource/noto-sans/500.css'
import '@fontsource/noto-sans/600.css'
import '@fontsource/noto-sans/700.css'
import '@fontsource/noto-sans-jp/400.css'
import '@fontsource/noto-sans-jp/500.css'
import '@fontsource/noto-sans-jp/700.css'
import '@fontsource/noto-sans-kr/400.css'
import '@fontsource/noto-sans-kr/500.css'
import '@fontsource/noto-sans-kr/700.css'
import { AuthSessionProvider } from '@/lib/auth/auth-provider'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { TabDetectorProvider } from '@/lib/providers/tab-detector-provider'
import './globals.css'

export const metadata: Metadata = {
  title: 'LinguaAI — Trilingual Tutor',
  description: 'Practice English, Korean, and Japanese with an AI tutor',
  generator: 'v0.app',
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f9fafb' },
    { media: '(prefers-color-scheme: dark)', color: '#0f1117' },
  ],
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className="bg-background"
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('linguaai-theme')||(window.matchMedia('(prefers-color-scheme:light)').matches?'light':'dark');document.documentElement.classList.toggle('dark',t==='dark');document.documentElement.style.colorScheme=t}catch(_){}`,
          }}
        />
      </head>
      <body className="antialiased font-sans">
        <ErrorBoundary>
          <AuthSessionProvider>
            <TabDetectorProvider>
              {children}
            </TabDetectorProvider>
            {process.env.NODE_ENV === 'production' && <Analytics />}
          </AuthSessionProvider>
        </ErrorBoundary>
        <Toaster
          richColors
          closeButton
          position="top-right"
          toastOptions={{
            classNames: {
              toast: 'rounded-xl border border-border shadow-lg',
              error: 'border-destructive/40',
              success: 'border-emerald-500/40',
            },
          }}
        />
      </body>
    </html>
  )
}
