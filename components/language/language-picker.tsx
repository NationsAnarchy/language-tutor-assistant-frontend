'use client'

import { useState } from 'react'
import { ArrowRight, RefreshCcw, CheckCircle2, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Flag } from '@/components/ui/flag'
import {
  type Language,
  type Level,
  type Session,
  type User,
  LANGUAGES,
  LEVELS,
  LEVEL_LABEL,
} from '@/lib/types'
import { LinguaLogo } from '../auth/lingua-logo'

interface LanguagePickerProps {
  user: User
  existingSessions: Session[]
  loading?: boolean
  onStart: (language: Language, level: Level) => void
  onStartFresh: (language: Language, level: Level) => void
  onSignOut: () => void
}

function LanguageCard({
  language,
  nativeLabel,
  flag,
  selected,
  hasSession,
  sessionLevel,
  onClick,
  disabled,
}: {
  language: string
  nativeLabel: string
  flag: string
  selected: boolean
  hasSession: boolean
  sessionLevel?: Level
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        'relative flex flex-col items-center justify-center gap-3 rounded-2xl border p-5 text-center transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 group',
        selected
          ? 'border-primary bg-primary/5 shadow-sm ring-2 ring-primary ring-offset-2 ring-offset-background'
          : 'border-border bg-card hover:border-primary/50 hover:bg-accent hover:shadow-sm',
        disabled && 'opacity-50 pointer-events-none'
      )}
    >
      {/* Existing session badge */}
      {hasSession && sessionLevel && (
        <span
          className="absolute top-2.5 right-2.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/25 leading-none"
          aria-label={`Existing ${sessionLevel} session`}
        >
          {LEVEL_LABEL[sessionLevel]}
        </span>
      )}

      {/* Flag */}
      <span className="text-4xl leading-none" role="img" aria-label={`${language} flag`}>
        <Flag emoji={flag} />
      </span>

      {/* Language names */}
      <div className="flex flex-col gap-0.5">
        <span
          className={cn(
            'text-base font-bold leading-tight transition-colors',
            selected ? 'text-primary' : 'text-foreground group-hover:text-foreground'
          )}
        >
          {nativeLabel}
        </span>
      </div>

      {/* Selection indicator */}
      {selected && (
        <CheckCircle2 className="absolute bottom-2.5 right-2.5 size-4 text-primary" aria-hidden="true" />
      )}
    </button>
  )
}

export function LanguagePicker({ user, existingSessions, loading, onStart, onStartFresh, onSignOut }: LanguagePickerProps) {
  const [selectedLanguage, setSelectedLanguage] = useState<Language | null>(null)
  const [selectedLevel, setSelectedLevel] = useState<Level | null>(null)
  const isDisabled = loading

  // Check if ANY session exists for selected language+level (not just the latest)
  // so Continue works across all difficulty levels (Issue #27 follow-up)
  const isResume = !!(
    selectedLanguage &&
    selectedLevel &&
    existingSessions.find(
      (s) => s.language === selectedLanguage && s.level === selectedLevel && s.session_id,
    )
  )

  const handleStart = () => {
    if (!selectedLanguage || !selectedLevel) return
    onStart(selectedLanguage, selectedLevel)
  }

  const handleLanguageSelect = (lang: Language) => {
    setSelectedLanguage(lang)
    // Pre-select the latest session's level if available (Issue #27)
    const langSessions = existingSessions
      .filter((s) => s.language === lang && s.session_id)
      .sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''))
    if (langSessions.length > 0) {
      setSelectedLevel(langSessions[0].level)
    } else {
      setSelectedLevel(null)
    }
  }

  const selectedLangMeta = LANGUAGES.find((l) => l.value === selectedLanguage)

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg flex flex-col gap-8">

          {/* Header */}
          <div className="text-center flex flex-col items-center gap-4">
            <div className="flex items-center gap-2.5">
              <LinguaLogo size="sm" />
              <span className="text-lg font-bold text-foreground">LinguaAI</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground text-balance">
                What would you like to practice?
              </h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Hi {user.name.split(' ')[0]} — choose a language and level to begin.
              </p>
            </div>
          </div>

          {/* Language cards */}
          <section aria-labelledby="language-heading">
            <h3
              id="language-heading"
              className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3"
            >
              Language
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {LANGUAGES.map((lang) => {
                // Pick latest session for badge display (Issue #20)
                const langSessions = existingSessions
                  .filter((s) => s.language === lang.value && s.session_id)
                  .sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''))
                const session = langSessions[0]
                return (
                  <LanguageCard
                    key={lang.value}
                    language={lang.label}
                    nativeLabel={lang.nativeLabel}
                    flag={lang.flag}
                    selected={selectedLanguage === lang.value}
                    hasSession={session?.exists ?? false}
                    sessionLevel={session?.level}
                    onClick={() => handleLanguageSelect(lang.value)}
                    disabled={isDisabled}
                  />
                )
              })}
            </div>
          </section>

          {/* Level selector */}
          <section aria-labelledby="level-heading">
            <h3
              id="level-heading"
              className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3"
            >
              Level
            </h3>
            <div
              className="flex rounded-xl border border-border overflow-hidden"
              role="group"
              aria-labelledby="level-heading"
            >
              {LEVELS.map((lvl, i) => {
                const isSelected = selectedLevel === lvl.value
                return (
                  <button
                    key={lvl.value}
                    type="button"
                    onClick={() => setSelectedLevel(lvl.value)}
                    disabled={isDisabled}
                    aria-pressed={isSelected}
                    className={cn(
                      'flex-1 flex flex-col items-center gap-1 px-3 py-3.5 text-center transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:z-10 relative',
                      i !== 0 && 'border-l border-border',
                      isSelected
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-card text-foreground hover:bg-accent',
                      isDisabled && 'opacity-50 pointer-events-none'
                    )}
                  >
                    <span className={cn(
                      'text-sm font-semibold leading-tight',
                      isSelected ? 'text-primary-foreground' : 'text-foreground'
                    )}>
                      {lvl.label}
                    </span>
                    <span className={cn(
                      'text-[11px] leading-tight text-pretty hidden sm:block',
                      isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground'
                    )}>
                      {lvl.description}
                    </span>
                  </button>
                )
              })}
            </div>
          </section>

          {/* Button + helper — single button, single line below */}
          <div className="flex flex-col gap-2">
            <Button
              size="lg"
              className="w-full h-12 gap-2 font-semibold text-sm"
              disabled={!selectedLanguage || !selectedLevel || isDisabled}
              onClick={handleStart}
            >
              {isResume ? (
                <>
                  <RefreshCcw className="size-4" aria-hidden="true" />
                  Continue {selectedLangMeta?.label}
                  <span className="opacity-70">·</span>
                  {selectedLevel ? LEVEL_LABEL[selectedLevel] : ''}
                </>
              ) : (
                <>
                  Start session
                  <ArrowRight className="size-4" aria-hidden="true" />
                </>
              )}
            </Button>
              {isResume ? (
              <p className="text-xs text-muted-foreground text-center h-5">
                <button
                  type="button"
                  onClick={() => { if (selectedLanguage && selectedLevel) onStartFresh(selectedLanguage, selectedLevel) }}
                  disabled={isDisabled}
                  className="hover:text-foreground transition-colors underline underline-offset-2 hover:no-underline disabled:opacity-40 disabled:pointer-events-none"
                >
                  Start a fresh session instead
                </button>
              </p>
            ) : (
              <p className="text-xs text-muted-foreground text-center h-5">
                {!selectedLanguage && 'Select a language to continue'}
                {selectedLanguage && !selectedLevel && 'Select a level to continue'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Sign out link (Issue #32) */}
      <div className="flex justify-center pb-8">
        <button
          type="button"
          onClick={onSignOut}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2 hover:no-underline"
        >
          <LogOut className="size-3" />
          Sign out
        </button>
      </div>
    </main>
  )
}
