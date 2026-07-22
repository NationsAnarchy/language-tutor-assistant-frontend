import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Toaster } from 'sonner'
import { AuthSessionProvider } from '@/lib/auth-provider'
import { ErrorBoundary } from '@/components/error-boundary'
import './globals.css'

// Google Fonts loaded at runtime via <link> — avoids Turbopack build-time download
const GOOGLE_FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;500;600;700&family=Noto+Sans+JP:wght@400;500;700&family=Noto+Sans+KR:wght@400;500;700&display=swap'

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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href={GOOGLE_FONTS_URL} rel="stylesheet" />
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('linguaai-theme')||(window.matchMedia('(prefers-color-scheme:light)').matches?'light':'dark');document.documentElement.classList.toggle('dark',t==='dark');document.documentElement.style.colorScheme=t}catch(_){}`,
          }}
        />
      </head>
      <body className="antialiased font-sans">
        <ErrorBoundary>
          <AuthSessionProvider>
            {children}
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