'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Send, BookOpen, MessageSquare, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { TopBar } from './top-bar'
import { ChatBubble } from './chat-bubble'
import { ChatBubbleError } from './chat-bubble-error'
import { TypingIndicator } from './typing-indicator'
import { ExercisePanel } from './exercise-panel'
import {
  sendChat,
  audioUrl,
  getSession,
  synthesizeAudio,
  invalidateSessionCache,
  clearTokenCache,
  ApiError,
} from '@/lib/api'
import { toast } from '@/lib/toast'
import type { Language, Level, User, Message, ChatMode } from '@/lib/types'
import { CHAT_PLACEHOLDERS } from '@/lib/types'

// Starter prompt suggestions per language
const STARTER_PROMPTS: Record<Language, string[]> = {
  korean: ['안녕하세요 — introduce yourself', '날씨에 대해 이야기해요', '식당을 추천해주세요'],
  japanese: ['自己紹介をしてください', '趣味について話しましょう', 'おすすめの場所を教えて'],
  english: ['Introduce yourself', 'Describe your daily routine', 'Talk about a hobby'],
}

/** Per-message error state attached to a failed user message. */
interface MessageError {
  message: string
  retryable: boolean
  /** The original content to resend on retry. */
  originalContent: string
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
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [mode, setMode] = useState<ChatMode>('chat')
  const [currentExercise, setCurrentExercise] = useState<{ prompt: string; audioUrl?: string } | undefined>(undefined)
  const [isExerciseLoading, setIsExerciseLoading] = useState(false)
  /** Map of messageId → error info for failed user messages. */
  const [messageErrors, setMessageErrors] = useState<Map<string, MessageError>>(new Map())
  /** Audio failure hints: messageId → hint text. */
  const [audioFailures, setAudioFailures] = useState<Map<string, string>>(new Map())
  /** Exercise-panel-local error (shown inline, not as a toast). */
  const [exerciseError, setExerciseError] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const prevLoadingRef = useRef(false)
  const [audioLoadingId, setAudioLoadingId] = useState<string | null>(null)

  // Cancel in-flight request when session changes or component unmounts (Issue #14)
  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [sessionId])

  // Load initial messages when session changes (e.g., resuming after sign-out)
  // Always set — empty array is valid for a new session (fixes Issue #10).
  useEffect(() => {
    setMessages(initialMessages)
    // Clear per-message errors when switching sessions
    setMessageErrors(new Map())
    setAudioFailures(new Map())
  }, [initialMessages])

  // Fallback: if we have a sessionId but no messages, try loading history from backend.
  // Keyed on sessionId so switching to a new (empty) session clears stale messages.
  useEffect(() => {
    if (!sessionId || sessionId === 'demo-session') return

    // Check if initialMessages already covered this session
    if (initialMessages.length > 0) return
    
    let cancelled = false
    
    getSession(sessionId).then((data) => {
      if (cancelled) return
      const history: Message[] = (data.chat_history || []).map((msg, i) => ({
        id: `history-${i}`,
        role: msg.role === 'user' ? 'user' as const : 'agent' as const,
        content: msg.content,
        audioUrl: msg.audio_url ? audioUrl(msg.audio_url) || undefined : undefined,
        timestamp: new Date(),
      }))
      if (history.length > 0) {
        setMessages(history)
      }
    }).catch(() => {/* ignore */})
    
    return () => { cancelled = true }
  }, [sessionId, initialMessages])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // Notify parent of loading state (Issue #35)
  useEffect(() => {
    onLoadingChange?.(isLoading)
  }, [isLoading, onLoadingChange])

  // Autofocus chat input after agent response is rendered (Issue #39)
  // No need to wait for audio synthesis — just the text response.
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

  /**
   * Handle an ApiError: show toast for global events (auth, network),
   * and return a user-friendly message for inline display.
   */
  const handleError = useCallback((err: unknown): { message: string; retryable: boolean } => {
    if (err instanceof ApiError) {
      switch (err.code) {
        case 'auth':
          clearTokenCache()
          toast.error(err.message, {
            description: 'Redirecting you to sign in…',
            duration: 3000,
          })
          // Redirect after a short delay so the user sees the toast
          setTimeout(() => router.replace('/login'), 1500)
          return { message: err.message, retryable: false }

        case 'network':
          toast.error(err.message, {
            action: { label: 'Retry', onClick: () => {} },
          })
          return { message: err.message, retryable: true }

        case 'timeout':
          toast.warning(err.message)
          return { message: err.message, retryable: true }

        case 'server':
          toast.error(err.message)
          return { message: err.message, retryable: true }

        case 'rate_limit':
          toast.warning(err.message)
          return { message: err.message, retryable: true }

        case 'forbidden':
          toast.error(err.message)
          return { message: err.message, retryable: false }

        case 'not_found':
          toast.error(err.message)
          return { message: err.message, retryable: false }

        default:
          toast.error(err.message || 'Something went wrong.')
          return { message: err.message || 'Something went wrong.', retryable: false }
      }
    }

    // Fallback for non-ApiError
    const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.'
    toast.error(msg)
    return { message: msg, retryable: false }
  }, [router])

  const sendMessage = useCallback(async (content: string, retryOfId?: string) => {
    if (!content.trim()) return

    const userMsg: Message = {
      id: retryOfId || Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    }

    // If retrying, remove the old error
    if (retryOfId) {
      setMessageErrors((prev) => {
        const next = new Map(prev)
        next.delete(retryOfId)
        return next
      })
      // Replace the old message in the list
      setMessages((prev) => prev.map((m) => m.id === retryOfId ? userMsg : m))
    } else {
      setMessages((prev) => [...prev, userMsg])
      setInputValue('')
    }

    setIsLoading(true)

    try {
      if (!sessionId || sessionId === 'demo-session') {
        // Demo fallback when backend isn't available
        await new Promise((r) => setTimeout(r, 1800))
        const agentMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'agent',
          content:
            language === 'korean'
              ? '백엔드에 연결되지 않았어요. uvicorn app.main:app --reload 로 백엔드를 시작해 주세요.'
              : language === 'japanese'
                ? 'バックエンドに接続できませんでした。uvicorn app.main:app --reload でバックエンドを起動してください。'
                : 'Backend not connected. Start it with: uvicorn app.main:app --reload',
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, agentMsg])
      } else {
        // Abort any previous in-flight request (Issue #14)
        abortRef.current?.abort()
        const controller = new AbortController()
        abortRef.current = controller

        // Show text response immediately, then synthesize audio (Issue #13)
        const result = await sendChat(sessionId, content, controller.signal)
        // Invalidate cache so next visit to this session gets fresh history
        invalidateSessionCache(sessionId)
        const msgId = (Date.now() + 1).toString()
        const agentMsg: Message = {
          id: msgId,
          role: 'agent',
          content: result.reply,
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, agentMsg])
        setIsLoading(false)

        // Show audio loading indicator, then synthesize in background (Issue #22)
        setAudioLoadingId(msgId)
        synthesizeAudio(sessionId, controller.signal).then((url) => {
          setAudioLoadingId(null)
          if (url) {
            setMessages((prev) =>
              prev.map((m) => (m.id === msgId ? { ...m, audioUrl: url } : m)),
            )
          }
        }).catch((audioErr) => {
          setAudioLoadingId(null)
          // Show inline audio failure hint instead of silently dropping
          const hint = audioErr instanceof ApiError
            ? "Audio couldn't be generated right now."
            : 'Audio unavailable.'
          setAudioFailures((prev) => new Map(prev).set(msgId, hint))
        })
        return
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        // User-initiated cancel (session switch) — don't show error
        return
      }
      const { message, retryable } = handleError(err)
      setMessageErrors((prev) => new Map(prev).set(userMsg.id, {
        message,
        retryable,
        originalContent: content,
      }))
    } finally {
      setIsLoading(false)
    }
  }, [sessionId, language, handleError])

  const handleRetry = useCallback((messageId: string) => {
    const errorInfo = messageErrors.get(messageId)
    if (!errorInfo) return
    sendMessage(errorInfo.originalContent, messageId)
  }, [messageErrors, sendMessage])

  const handleDismissError = useCallback((messageId: string) => {
    setMessageErrors((prev) => {
      const next = new Map(prev)
      next.delete(messageId)
      return next
    })
  }, [])

  const handleSend = () => {
    if (!inputValue.trim() || isLoading) return
    sendMessage(inputValue)
  }

  const handleExerciseSubmit = async (answer: string) => {
    if (!sessionId || sessionId === 'demo-session') {
      // Demo fallback
      const userMsg: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: answer,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, userMsg])
      setIsLoading(true)
      await new Promise((r) => setTimeout(r, 1600))
      const feedbackMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'agent',
        content: 'Backend not available — start it with: uvicorn app.main:app --reload',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, feedbackMsg])
      setIsLoading(false)
      return
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: answer,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMsg])
    setIsLoading(true)

    try {
      // Submit exercise answer as a chat message — the agent handles intent routing
      const result = await sendChat(sessionId, answer)
      invalidateSessionCache(sessionId)
      const feedbackMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'agent',
        content: result.reply,
        audioUrl: audioUrl(result.audio_url) || undefined,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, feedbackMsg])
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      handleError(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRequestNewExercise = async () => {
    setIsExerciseLoading(true)
    setCurrentExercise(undefined)

    if (!sessionId || sessionId === 'demo-session') {
      await new Promise((r) => setTimeout(r, 1200))
      setCurrentExercise({
        prompt: language === 'korean'
          ? '다음 문장을 한국어로 번역하세요: "I went to the market yesterday to buy vegetables."'
          : language === 'japanese'
            ? '次の文章を日本語に訳してください: "I went to the market yesterday to buy vegetables."'
            : 'Translate the following sentence into your target language: "I went to the market yesterday to buy vegetables."',
      })
      setIsExerciseLoading(false)
      return
    }

    setExerciseError(null)
    try {
      // Request a new exercise via the chat endpoint
      const exercisePrompt = language === 'korean'
        ? '새로운 연습 문제를 만들어 주세요.'
        : language === 'japanese'
          ? '新しい練習問題を作ってください。'
          : 'Please generate a new exercise for me.'

      const result = await sendChat(sessionId, exercisePrompt)
      setCurrentExercise({ prompt: result.reply, audioUrl: audioUrl(result.audio_url) || undefined })
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      // Show error inline in the exercise panel instead of as a toast
      const msg = err instanceof ApiError ? err.message : 'Failed to generate exercise. Please try again.'
      setExerciseError(msg)
    } finally {
      setIsExerciseLoading(false)
    }
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
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'chat'}
            onClick={() => setMode('chat')}
            disabled={isLoading}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              mode === 'chat'
                ? 'bg-background text-foreground shadow-sm border border-border/60'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <MessageSquare className="size-3.5" aria-hidden="true" />
            Chat
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'exercise'}
            onClick={() => setMode('exercise')}
            disabled={isLoading}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              mode === 'exercise'
                ? 'bg-background text-foreground shadow-sm border border-border/60'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <BookOpen className="size-3.5" aria-hidden="true" />
            Exercise
          </button>
        </div>

        <div className="ml-auto text-xs text-muted-foreground hidden sm:block">
          {mode === 'exercise' ? 'Answer the prompt below' : 'Free conversation with your tutor'}
        </div>
      </div>

      {/* Message list */}
      <main
        className="flex-1 min-h-0 overflow-y-auto px-4 py-6 space-y-5"
        aria-label="Conversation"
        aria-live="polite"
        aria-atomic="false"
      >
        {/* Empty state */}
        {isEmpty && (
          <div className="flex flex-col items-center justify-center h-full gap-6 py-12 text-center">
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
                  onClick={() => sendMessage(prompt)}
                  disabled={isLoading}
                  className="px-3.5 py-2 rounded-xl border border-border bg-card text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-accent transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shadow-xs"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((msg) => (
          <div key={msg.id}>
            <ChatBubble
              message={msg}
              isAudioLoading={audioLoadingId === msg.id}
              audioFailureHint={audioFailures.get(msg.id)}
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

        {/* Typing indicator */}
        {isLoading && <TypingIndicator />}

        <div ref={messagesEndRef} />
      </main>

      {/* Exercise panel (mode-dependent) */}
      {mode === 'exercise' && (
        <ExercisePanel
          language={language}
          onSubmitAnswer={handleExerciseSubmit}
          onRequestNew={handleRequestNewExercise}
          isLoading={isLoading || isExerciseLoading}
          currentExercise={currentExercise}
          error={exerciseError}
          onDismissError={() => setExerciseError(null)}
        />
      )}

      {/* Chat input (only in chat mode) */}
      {mode === 'chat' && (
        <div className="px-4 py-3 border-t border-border bg-card/70 backdrop-blur-sm">
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
            <Button
              size="sm"
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading}
              className="h-11 w-11 p-0 rounded-2xl shrink-0 shadow-xs"
              aria-label="Send message"
            >
              <Send className="size-4" aria-hidden="true" />
            </Button>
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