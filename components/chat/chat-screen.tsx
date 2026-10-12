'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, BookOpen, MessageSquare, Sparkles, Square, ArrowDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { TopBar } from '../layout/top-bar'
import { ChatBubble } from './chat-bubble'
import { ChatBubbleError } from './chat-bubble-error'
import { ExercisePanel } from './exercise-panel'
import { useChatMessages } from '@/lib/hooks/use-chat-messages'
import { useTtsAudio } from '@/lib/hooks/use-tts-audio'
import { useExerciseMode } from '@/lib/hooks/use-exercise-mode'
import type { Language, Level, User, Message } from '@/lib/types'
import { CHAT_PLACEHOLDERS } from '@/lib/types'

// Starter prompt suggestions per language
const STARTER_PROMPTS: Record<Language, string[]> = {
  korean: ['안녕하세요 — introduce yourself', '날씨에 대해 이야기해요', '식당을 추천해주세요'],
  japanese: ['自己紹介をしてください', '趣味について話しましょう', 'おすすめの場所を教えて'],
  english: ['Introduce yourself', 'Describe your daily routine', 'Talk about a hobby'],
}

interface ChatScreenProps {
  user: User
  language: Language
  level: Level
  sessionId: string | null
  initialMessages?: Message[]
  onSwitchLanguage: () => void
  onSignOut: () => void
  onLoadingChange?: (loading: boolean) => void
  /** Callback to toggle the session sidebar on mobile. */
  onToggleSidebar?: () => void
  /** Whether the sidebar is currently open. */
  sidebarOpen?: boolean
}

export function ChatScreen({
  user,
  language,
  level,
  sessionId,
  initialMessages = [],
  onSwitchLanguage,
  onSignOut,
  onLoadingChange,
  onToggleSidebar,
  sidebarOpen,
}: ChatScreenProps) {
  const [inputValue, setInputValue] = useState('')

  // ── Custom Hooks ───────────────────────────────────────────────────────────
  const {
    audioLoadingId,
    audioFailures,
    requestAudio,
    handleRetryAudio,
    clearAudioFailures,
  } = useTtsAudio({
    sessionId,
    onAudioReady: (msgId, url) => attachAudioToMessage(msgId, url),
  })

  const {
    messages,
    isLoading,
    messageErrors,
    sendMessage,
    handleRetry,
    handleDismissError,
    handleStopGenerating,
    submitExerciseAnswer,
    attachAudioToMessage,
  } = useChatMessages({
    sessionId,
    language,
    initialMessages,
    onRequestAudio: requestAudio,
    onResetSession: clearAudioFailures,
  })

  const {
    mode,
    setMode,
    currentExercise,
    isExerciseLoading,
    exerciseError,
    setExerciseError,
    requestNewExercise,
  } = useExerciseMode({
    sessionId,
    language,
  })

  // ── Scroll & Layout Refs ───────────────────────────────────────────────────
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLElement>(null)
  const [showScrollBottom, setShowScrollBottom] = useState(false)
  const isNearBottomRef = useRef(true)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const prevLoadingRef = useRef(false)

  // Track scroll position to prevent snapping away if user scrolled up
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current
    if (!el) return
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    const nearBottom = distanceToBottom < 120
    isNearBottomRef.current = nearBottom
    setShowScrollBottom(!nearBottom)
  }, [])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    setShowScrollBottom(false)
    isNearBottomRef.current = true
  }, [])

  // Smart auto-scroll: only scrolls if user is already near bottom.
  useEffect(() => {
    if (isNearBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: isLoading ? 'auto' : 'smooth' })
    }
  }, [messages, isLoading])

  // Notify parent of loading state
  useEffect(() => {
    onLoadingChange?.(isLoading)
  }, [isLoading, onLoadingChange])

  // Autofocus chat input after agent response is rendered
  useEffect(() => {
    if (prevLoadingRef.current && !isLoading && mode === 'chat') {
      textareaRef.current?.focus()
    }
    prevLoadingRef.current = isLoading
  }, [isLoading, mode])

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`
  }, [inputValue])

  const handleSend = () => {
    if (!inputValue.trim() || isLoading) return
    sendMessage(inputValue)
    setInputValue('')
  }

  const isEmpty = messages.length === 0

  return (
    <div className="flex flex-col h-full bg-background">
      <TopBar
        user={user}
        language={language}
        level={level}
        onSwitchLanguage={onSwitchLanguage}
        onSignOut={onSignOut}
        disabled={isLoading}
        onToggleSidebar={onToggleSidebar}
        sidebarOpen={sidebarOpen}
      />

      {/* Mode toggle tabs */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-border bg-card/60 backdrop-blur-sm">
        <div
          className="flex items-center gap-1 p-1 rounded-xl bg-muted/50 border border-border/60"
          role="tablist"
          aria-label="Chat mode"
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') setMode('chat')
            else if (e.key === 'ArrowRight') setMode('exercise')
          }}
        >
          <button
            type="button"
            id="mode-tab-chat"
            role="tab"
            aria-selected={mode === 'chat'}
            aria-controls="mode-panel-chat"
            tabIndex={mode === 'chat' ? 0 : -1}
            onClick={() => setMode('chat')}
            disabled={isLoading}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              mode === 'chat'
                ? 'bg-background text-foreground shadow-sm border border-border/60'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <MessageSquare className="size-3.5" aria-hidden="true" />
            Chat
          </button>
          <button
            type="button"
            id="mode-tab-exercise"
            role="tab"
            aria-selected={mode === 'exercise'}
            aria-controls="mode-panel-exercise"
            tabIndex={mode === 'exercise' ? 0 : -1}
            onClick={() => setMode('exercise')}
            disabled={isLoading}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              mode === 'exercise'
                ? 'bg-background text-foreground shadow-sm border border-border/60'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <BookOpen className="size-3.5" aria-hidden="true" />
            Exercise
          </button>
        </div>

        <div className="ml-auto text-xs text-muted-foreground hidden sm:block">
          {mode === 'exercise' ? 'Answer the prompt below' : 'Learn languages with your AI tutor'}
        </div>
      </div>

      {/* Empty state — separate from scrollable message area to avoid any overflow */}
      {isEmpty ? (
        <main
          className="flex-1 flex flex-col items-center justify-center px-4 gap-6 text-center"
          aria-label="Conversation"
        >
          <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Sparkles className="size-7 text-primary" aria-hidden="true" />
          </div>
          <div>
            <p className="font-bold text-foreground text-base">Ready to practice!</p>
            <p className="text-sm text-muted-foreground mt-1.5 max-w-xs leading-relaxed text-pretty">
              {language === 'korean'
                ? '한국어로 말씀해 보세요. 틀려도 괜찮아요 — 함께 고쳐 나가겠습니다.'
                : language === 'japanese'
                  ? '日本語で話してみてください。間違えても大丈夫です。'
                  : 'Say anything to get started — mistakes are welcome, your tutor will help.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 justify-center max-w-sm" aria-label="Suggested starters">
            {STARTER_PROMPTS[language].map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => {
                  sendMessage(prompt)
                  setInputValue('')
                }}
                disabled={isLoading}
                className="px-3.5 py-2 rounded-xl border border-border bg-card text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-accent transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shadow-xs"
              >
                {prompt}
              </button>
            ))}
          </div>
        </main>
      ) : (
        <main
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="relative flex-1 min-h-0 overflow-y-auto px-4 py-6 space-y-5"
          aria-label="Conversation"
          aria-live="polite"
          aria-atomic="false"
        >
          {/* Messages */}
          {messages.map((msg) => (
            <div key={msg.id}>
              <ChatBubble
                message={msg}
                isAudioLoading={audioLoadingId === msg.id}
                audioFailureHint={audioFailures.get(msg.id)}
                onRetryAudio={handleRetryAudio}
              />
              {messageErrors.has(msg.id) && (
                <ChatBubbleError
                  message={messageErrors.get(msg.id)!.message}
                  onRetry={messageErrors.get(msg.id)!.retryable ? () => handleRetry(msg.id) : undefined}
                  onDismiss={() => handleDismissError(msg.id)}
                />
              )}
            </div>
          ))}

          {/* Floating scroll to bottom pill */}
          {showScrollBottom && (
            <div className="sticky bottom-2 flex justify-center pointer-events-none z-10">
              <button
                type="button"
                onClick={scrollToBottom}
                className="pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card/95 backdrop-blur-md border border-border text-xs font-medium text-foreground shadow-lg hover:bg-accent hover:border-primary/50 transition-all duration-150 animate-in fade-in slide-in-from-bottom-2"
                aria-label="Scroll to newest messages"
              >
                <ArrowDown className="size-3 text-primary" aria-hidden="true" />
                <span>{isLoading ? 'New messages ↓' : 'Scroll to bottom'}</span>
              </button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </main>
      )}

      {/* Exercise panel (mode-dependent) — the tabpanel for the Exercise tab */}
      {mode === 'exercise' && (
        <div id="mode-panel-exercise" role="tabpanel" aria-labelledby="mode-tab-exercise">
          <ExercisePanel
            language={language}
            onSubmitAnswer={submitExerciseAnswer}
            onRequestNew={requestNewExercise}
            isLoading={isLoading || isExerciseLoading}
            currentExercise={currentExercise}
            error={exerciseError}
            onDismissError={() => setExerciseError(null)}
          />
        </div>
      )}

      {/* Chat input (only in chat mode) — the tabpanel for the Chat tab */}
      {mode === 'chat' && (
        <div
          id="mode-panel-chat"
          role="tabpanel"
          aria-labelledby="mode-tab-chat"
          className="px-4 py-3 border-t border-border bg-card/70 backdrop-blur-sm"
        >
          <div className="flex gap-2.5 items-end max-w-3xl mx-auto">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (
                  e.key === 'Enter' &&
                  !e.shiftKey &&
                  !e.nativeEvent.isComposing &&
                  !(e.keyCode === 229)
                ) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder={CHAT_PLACEHOLDERS[language]}
              rows={1}
              disabled={isLoading}
              aria-label="Message input"
              className="flex-1 resize-none rounded-2xl border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all leading-relaxed min-h-11 max-h-32 disabled:opacity-50 shadow-xs"
              style={{ overflowY: 'hidden' }}
            />
            {isLoading ? (
              <Button
                size="sm"
                variant="destructive"
                onClick={handleStopGenerating}
                className="h-11 w-11 p-0 rounded-2xl shrink-0 shadow-xs"
                aria-label="Stop generating"
                title="Stop generating"
              >
                <Square className="size-4 fill-current" aria-hidden="true" />
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleSend}
                disabled={!inputValue.trim()}
                className="h-11 w-11 p-0 rounded-2xl shrink-0 shadow-xs"
                aria-label="Send message"
              >
                <Send className="size-4" aria-hidden="true" />
              </Button>
            )}
          </div>
          <p className="text-center text-[11px] text-muted-foreground mt-2">
            Press <kbd className="font-mono text-[10px] px-1 py-0.5 rounded border border-border bg-muted">Enter</kbd> to send
            {' '}·{' '}
            <kbd className="font-mono text-[10px] px-1 py-0.5 rounded border border-border bg-muted">Shift+Enter</kbd> for new line
          </p>
        </div>
      )}
    </div>
  )
}
