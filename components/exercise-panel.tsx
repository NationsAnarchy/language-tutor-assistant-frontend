'use client'

import { useState } from 'react'
import { RefreshCcw, Send, BookOpen, Loader2, AlertCircle } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Button } from '@/components/ui/button'
import { AudioPlayButton } from './audio-play-button'
import type { Language } from '@/lib/types'

interface ExercisePanelProps {
  language: Language
  onSubmitAnswer: (answer: string) => void
  onRequestNew: () => void
  isLoading: boolean
  currentExercise?: {
    prompt: string
    audioUrl?: string
  }
  /** Error message to display inline (e.g. from failed exercise generation). */
  error?: string | null
  /** Clear the error. */
  onDismissError?: () => void
}

const ANSWER_PLACEHOLDERS: Record<Language, string> = {
  english: 'Type your answer in English...',
  korean: '한국어로 답을 입력하세요...',
  japanese: '日本語で答えを入力してください...',
}

export function ExercisePanel({
  language,
  onSubmitAnswer,
  onRequestNew,
  isLoading,
  currentExercise,
  error,
  onDismissError,
}: ExercisePanelProps) {
  const [answer, setAnswer] = useState('')

  const handleSubmit = () => {
    if (!answer.trim() || isLoading || !currentExercise) return
    onSubmitAnswer(answer.trim())
    setAnswer('')
  }

  const canSubmit = !!answer.trim() && !!currentExercise && !isLoading

  return (
    <div className="flex flex-col gap-4 p-4 border-t border-border bg-card/60 backdrop-blur-sm">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="size-3.5 text-muted-foreground" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-foreground">Exercise</h3>
          {isLoading && (
            <Loader2 className="size-3.5 text-muted-foreground animate-spin" aria-hidden="true" />
          )}
        </div>
        <button
          type="button"
          onClick={onRequestNew}
          disabled={isLoading}
          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md px-2 py-1 hover:bg-accent"
          aria-label="Request a new exercise"
        >
          <RefreshCcw className={`size-3.5 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
          New exercise
        </button>
      </div>

      {/* Inline error */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 px-3 py-2.5 rounded-xl border border-destructive/30 bg-destructive/5 text-xs text-destructive"
        >
          <AlertCircle className="size-3.5 shrink-0 mt-0.5" aria-hidden="true" />
          <span className="flex-1 leading-relaxed">{error}</span>
          {onDismissError && (
            <button
              type="button"
              onClick={onDismissError}
              className="text-[11px] opacity-70 hover:opacity-100 underline underline-offset-2 hover:no-underline shrink-0"
            >
              Dismiss
            </button>
          )}
        </div>
      )}

      {/* Exercise prompt card */}
      {currentExercise ? (
        <div
          className="rounded-xl border border-border bg-background px-4 py-3.5 flex gap-3 items-start shadow-xs"
          role="region"
          aria-label="Exercise prompt"
        >
          <div className="flex-1 min-w-0 text-sm text-foreground leading-relaxed">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
              table: ({ children, ...props }) => (
                <div className="overflow-x-auto mb-2 last:mb-0">
                  <table className="w-full text-xs border-collapse border border-border rounded-lg" {...props}>{children}</table>
                </div>
              ),
              thead: ({ children, ...props }) => <thead className="bg-muted/60" {...props}>{children}</thead>,
              tbody: ({ children, ...props }) => <tbody {...props}>{children}</tbody>,
              tr: ({ children, ...props }) => <tr className="border-b border-border last:border-b-0" {...props}>{children}</tr>,
              th: ({ children, ...props }) => <th className="px-3 py-2 text-left font-semibold text-foreground border-r border-border last:border-r-0" {...props}>{children}</th>,
              td: ({ children, ...props }) => <td className="px-3 py-2 text-left text-foreground/90 border-r border-border last:border-r-0" {...props}>{children}</td>,
            }}>
              {currentExercise.prompt}
            </ReactMarkdown>
          </div>
          {currentExercise.audioUrl && (
            <AudioPlayButton
              audioUrl={currentExercise.audioUrl}
              className="shrink-0 mt-0.5"
            />
          )}
        </div>
      ) : (
        <div
          className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-4 flex items-center justify-center min-h-18"
          aria-live="polite"
        >
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              <span>Generating exercise...</span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center">
              Press{' '}
              <button
                type="button"
                onClick={onRequestNew}
                className="underline underline-offset-2 hover:no-underline text-foreground/70 hover:text-foreground transition-colors"
              >
                New exercise
              </button>{' '}
              to get started.
            </p>
          )}
        </div>
      )}

      {/* Answer input + submit */}
      <div className="flex gap-2.5 items-end">
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          onKeyDown={(e) => {
            if (
              e.key === 'Enter' &&
              !e.shiftKey &&
              !e.nativeEvent.isComposing &&
              !(e.keyCode === 229)
            ) {
              e.preventDefault()
              handleSubmit()
            }
          }}
          placeholder={ANSWER_PLACEHOLDERS[language]}
          rows={2}
          disabled={!currentExercise || isLoading}
          aria-label="Your answer"
          className="flex-1 resize-none rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all disabled:opacity-50 leading-relaxed shadow-xs"
        />
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="h-19 w-10 p-0 rounded-xl shrink-0 flex-col gap-1"
          aria-label="Submit answer"
        >
          <Send className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  )
}