import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { LinguaLogo } from '@/components/auth/lingua-logo'

export const metadata: Metadata = {
  title: 'Terms of Service — LinguaAI',
  description: 'Terms and conditions governing the use of LinguaAI Language Tutor.',
}

export default function TermsOfServicePage() {
  return (
    <main className="min-h-screen bg-background text-foreground py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-10">
        {/* Navigation & Header */}
        <div className="space-y-4">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
            Back to Sign in
          </Link>
          <div className="flex items-center gap-3 pt-2">
            <LinguaLogo size="sm" />
            <h1 className="text-3xl font-bold tracking-tight">Terms of Service</h1>
          </div>
          <p className="text-xs text-muted-foreground">
            Last updated: November 24, 2026
          </p>
        </div>

        {/* Content sections */}
        <div className="space-y-8 text-sm leading-relaxed text-muted-foreground border-t border-border pt-8">
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">1. Acceptance of Terms</h2>
            <p>
              By accessing or using LinguaAI (&ldquo;the Service&rdquo;), you agree to be bound by these Terms of
              Service. If you do not agree to these terms, please do not use the Service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">2. Description of Service</h2>
            <p>
              LinguaAI provides an automated language learning platform utilizing artificial intelligence models to
              deliver conversational tutoring, grammar corrections, level-based exercises, and audio synthesis in
              English, Korean, and Japanese.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">3. User Accounts & Responsibilities</h2>
            <p>
              To access the Service, you authenticate using your Google account. You are responsible for safeguarding
              your account access and agree not to:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Use the Service for any unlawful or abusive activity.</li>
              <li>Attempt to circumvent rate limits, security controls, or service architecture.</li>
              <li>Transmit automated abuse, spam, or malicious payloads to the AI models.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">4. AI Output Disclaimer</h2>
            <p>
              LinguaAI uses advanced artificial intelligence to assist your learning. While the AI is guided by
              pedagogical frameworks and guardrails, language explanations and translations are generated
              algorithmically and may occasionally contain inaccuracies. The Service is provided as an educational aid
              on an &ldquo;as is&rdquo; basis.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">5. Termination</h2>
            <p>
              We reserve the right to suspend or terminate access to the Service for any user who violates these Terms
              or engages in harmful behavior towards the platform or infrastructure.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">6. Contact</h2>
            <p>
              For any questions or concerns regarding these Terms, please contact us at{' '}
              <a
                href="mailto:support@linguatutor.ai"
                className="text-foreground underline underline-offset-4 hover:text-primary transition-colors"
              >
                support@linguatutor.ai
              </a>.
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} LinguaAI. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-foreground transition-colors underline underline-offset-4">
              Privacy Policy
            </Link>
            <Link href="/login" className="hover:text-foreground transition-colors underline underline-offset-4">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
