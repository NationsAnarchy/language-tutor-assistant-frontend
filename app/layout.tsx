import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Noto_Sans, Noto_Sans_JP, Noto_Sans_KR } from 'next/font/google'
import { Toaster } from 'sonner'
import { AuthSessionProvider } from '@/lib/auth/auth-provider'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { TabDetectorProvider } from '@/lib/providers/tab-detector-provider'
import './globals.css'

const notoSans = Noto_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-noto-sans',
  display: 'swap',
})

const notoSansJP = Noto_Sans_JP({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-noto-sans-jp',
  display: 'swap',
  preload: false,
})

const notoSansKR = Noto_Sans_KR({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-noto-sans-kr',
  display: 'swap',
  preload: false,
})

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
      className={`bg-background ${notoSans.variable} ${notoSansJP.variable} ${notoSansKR.variable}`}
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
