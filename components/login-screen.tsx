'use client'

import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { LinguaLogo } from './lingua-logo'

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 fill-current" aria-hidden="true">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  )
}

export function LoginScreen() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      {/* Subtle background grid pattern */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.025]"
        aria-hidden="true"
        style={{
          backgroundImage:
            'linear-gradient(to right, var(--color-foreground) 1px, transparent 1px), linear-gradient(to bottom, var(--color-foreground) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="w-full max-w-sm flex flex-col items-center gap-8 relative">
        {/* Logo + wordmark */}
        <div className="flex flex-col items-center gap-5">
          <LinguaLogo size="lg" />
          <div className="text-center">
            <h1 className="text-3xl font-bold text-foreground tracking-tight">LinguaAI</h1>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed text-pretty max-w-xs">
              Practice English, Korean, and Japanese with an AI tutor that corrects as you go.
            </p>
          </div>
        </div>

        {/* Language preview pills */}
        <div
          className="flex gap-2 text-sm"
          aria-label="Supported languages"
        >
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-card text-xs font-medium text-foreground">
            <span role="img" aria-label="American flag">🇺🇸</span>
            English
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-card text-xs font-medium text-foreground">
            <span role="img" aria-label="Korean flag">🇰🇷</span>
            한국어
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-card text-xs font-medium text-foreground">
            <span role="img" aria-label="Japanese flag">🇯🇵</span>
            日本語
          </div>
        </div>

        {/* Divider */}
        <div className="w-full flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">Sign in to continue</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Sign-in buttons */}
        <div className="w-full flex flex-col gap-3">
          <Button
            variant="outline"
            size="lg"
            className="w-full gap-3 font-medium h-12 text-sm border-border hover:border-primary/40 hover:bg-accent transition-all"
            onClick={() => signIn('google')}
          >
            <GoogleIcon />
            Sign in with Google
          </Button>
          {/* <Button
            variant="outline"
            size="lg"
            className="w-full gap-3 font-medium h-12 text-sm border-border hover:border-primary/40 hover:bg-accent transition-all"
            onClick={() => signIn('github')}
          >
            <GitHubIcon />
            Sign in with GitHub
          </Button> */}
        </div>

        <p className="text-xs text-muted-foreground text-center">
          By signing in you agree to our terms of service and privacy policy.
        </p>
      </div>
    </main>
  )
}