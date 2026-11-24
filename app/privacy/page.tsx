import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { LinguaLogo } from '@/components/auth/lingua-logo'

export const metadata: Metadata = {
  title: 'Privacy Policy — LinguaAI',
  description: 'Privacy Policy and data protection details for LinguaAI Language Tutor.',
}

export default function PrivacyPolicyPage() {
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
            <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
          </div>
          <p className="text-xs text-muted-foreground">
            Last updated: November 24, 2026
          </p>
        </div>

        {/* Content sections */}
        <div className="space-y-8 text-sm leading-relaxed text-muted-foreground border-t border-border pt-8">
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">1. Overview</h2>
            <p>
              LinguaAI (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;the Service&rdquo;) is an AI-powered language tutor
              designed to help users practice English, Korean, and Japanese through contextual conversations,
              real-time grammar corrections, and tailored exercises.
            </p>
            <p>
              This Privacy Policy explains what information we collect, how it is processed, and your rights
              regarding your personal data when using LinguaAI.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">2. Information We Collect</h2>
            <p>We collect and process the following categories of information:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong className="text-foreground">Google Account Profile:</strong> When you sign in with Google,
                we receive your name, email address, profile picture URL, and Google user identifier. We use this
                strictly to identify your account and authenticate your sessions.
              </li>
              <li>
                <strong className="text-foreground">Language Learning Data:</strong> Messages you send during practice
                sessions, your chosen target language (English, Korean, or Japanese), your selected CEFR proficiency
                level, grammar mistake logs, and exercise progress.
              </li>
              <li>
                <strong className="text-foreground">Technical & Usage Data:</strong> Necessary authentication cookies
                and tokens to keep you securely signed in, along with aggregated, privacy-preserving performance
                metrics collected via Vercel Analytics.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">3. How Your Information Is Used</h2>
            <p>We use your information exclusively to:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Provide, maintain, and personalize your interactive language learning experience.</li>
              <li>Track your persistent mistake memory across sessions so the AI tutor can reinforce weak areas.</li>
              <li>Generate pedagogical grammar suggestions and text-to-speech audio pronunciation.</li>
              <li>Authenticate your account and protect against unauthorized access or rate-limit abuse.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">4. Third-Party Service Providers</h2>
            <p>
              To deliver AI tutoring and cloud services, data is shared with the following third parties under
              strict security and confidentiality obligations:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong className="text-foreground">Google Cloud & Google Identity:</strong> Used for secure OAuth 2.0
                authentication and user profile verification.
              </li>
              <li>
                <strong className="text-foreground">Google Gemini API:</strong> User practice prompts and conversation
                context are sent to Google Gemini models to generate conversational responses, grammar feedback, and
                text-to-speech audio. We do not use your private practice data to train public foundation models.
              </li>
              <li>
                <strong className="text-foreground">Pinecone:</strong> Vector database used for retrieval-augmented
                generation (RAG) over language curriculum and grammar rules.
              </li>
              <li>
                <strong className="text-foreground">Vercel:</strong> Cloud hosting infrastructure and privacy-friendly
                telemetry to monitor platform availability and performance.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">5. Cookies & Local Storage</h2>
            <p>
              We only use strictly necessary cookies (such as session tokens managed by NextAuth) to maintain your
              authenticated session and protect against CSRF attacks. We also use browser local storage to save your
              active session preferences (such as language and level selection) on your device.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">6. Data Retention and Your Rights</h2>
            <p>
              Your learning session history and mistake records are stored to support continuous learning progression.
              You have the right to request access to your data or request complete deletion of your account and
              associated learning history at any time.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">7. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy or wish to request data deletion, please contact us
              at{' '}
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
            <Link href="/terms" className="hover:text-foreground transition-colors underline underline-offset-4">
              Terms of Service
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
