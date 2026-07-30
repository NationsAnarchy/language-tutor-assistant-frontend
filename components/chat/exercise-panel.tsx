'use client'

import { useState, useEffect, useRef } from 'react'
import { RefreshCcw, Send, BookOpen, Loader2, AlertCircle, X } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Button } from '@/components/ui/button'
import { AudioPlayButton } from '../audio/audio-play-button'
import { cn, handleEnterKey } from '@/lib/utils'
import { markdownComponents } from '../ui/markdown-config'
import { ANSWER_PLACEHOLDERS, type Language } from '@/lib/types'

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
  /** Whether the drawer is open. */
  isOpen: boolean
  /** Close the drawer without submitting. */
  onClose: () => void
}

export function ExercisePanel({
  language,
  onSubmitAnswer,
  onRequestNew,
  isLoading,
  currentExercise,
  error,
  onDismissError,
  isOpen,
  onClose,
}: ExercisePanelProps) {
  const [answer, setAnswer] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const wasOpenRef = useRef(false)

  // Focus answer textarea when drawer opens
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      // Delay focus for the slide-up animation
      const timer = setTimeout(() => {
        textareaRef.current?.focus()
      }, 300)
      wasOpenRef.current = true
      return () => clearTimeout(timer)
    }
    if (!isOpen) {
      wasOpenRef.current = false
    }
  }, [isOpen])

  // Handle Escape key to close
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  const handleSubmit = () => {
    if (!answer.trim() || isLoading || !currentExercise) return
    onSubmitAnswer(answer.trim())
    setAnswer('')
  }

  const canSubmit = !!answer.trim() && !!currentExercise && !isLoading

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-55 bg-black/30 backdrop-blur-sm transition-opacity duration-300',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Exercise drawer"
        className={cn(
          'fixed bottom-0 left-0 right-0 z-65 flex flex-col max-h-[55vh] bg-card border-t border-border rounded-t-2xl shadow-2xl transition-transform duration-300 ease-out',
          isOpen ? 'translate-y-0' : 'translate-y-full'
        )}
      >
        {/* Drag handle / header row */}
        <div className="flex items-center justify-between px-4 pt-3.5 pb-2 shrink-0">
          <div className="flex items-center gap-2">
            <BookOpen className="size-3.5 text-muted-foreground" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-foreground">Exercise</h3>
            {isLoading && (
              <Loader2 className="size-3.5 text-muted-foreground animate-spin" aria-hidden="true" />
            )}
          </div>
          <div className="flex items-center gap-1.5">
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
            <button
              type="button"
              onClick={onClose}
              className="flex items-center justify-center size-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Close exercise drawer"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Inline error */}
        {error && (
          <div
            role="alert"
            className="mx-4 mb-2 flex items-start gap-2 px-3 py-2.5 rounded-xl border border-destructive/30 bg-destructive/5 text-xs text-destructive"
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

        {/* Scrollable content area */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-3">
          {/* Exercise prompt card */}
          {currentExercise ? (
            <div
              className="rounded-xl border border-border bg-background px-4 py-3.5 flex gap-3 items-start shadow-xs"
              role="region"
              aria-label="Exercise prompt"
            >
              <div className="flex-1 min-w-0 text-sm text-foreground leading-relaxed">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
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
        </div>

        {/* Answer input + submit */}
        <div className="flex gap-2.5 items-end px-4 pb-4 pt-2 border-t border-border/60 shrink-0">
          <textarea
            ref={textareaRef}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={(e) => handleEnterKey(e, handleSubmit)}
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
    </>
  )
}