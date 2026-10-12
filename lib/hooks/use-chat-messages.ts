'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  sendChatStream,
  getSession,
  invalidateSessionCache,
  clearTokenCache,
  ApiError,
} from '@/lib/api'
import { mapChatHistory } from '@/lib/mappers'
import { toast } from '@/lib/toast'
import type { Language, Message } from '@/lib/types'

export interface MessageError {
  message: string
  retryable: boolean
  /** The original content to resend on retry. */
  originalContent: string
}

interface UseChatMessagesOptions {
  sessionId: string | null
  language: Language
  initialMessages?: Message[]
  onRequestAudio?: (messageId: string, content: string) => void
  onResetSession?: () => void
}

export function useChatMessages({
  sessionId,
  language,
  initialMessages = [],
  onRequestAudio,
  onResetSession,
}: UseChatMessagesOptions) {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [isLoading, setIsLoading] = useState(false)
  const [messageErrors, setMessageErrors] = useState<Map<string, MessageError>>(new Map())

  // Reset conversation state when the initialMessages prop changes (e.g. parent loaded a different conversation).
  const [syncedInitialMessages, setSyncedInitialMessages] = useState(initialMessages)
  if (syncedInitialMessages !== initialMessages) {
    setSyncedInitialMessages(initialMessages)
    setMessages(initialMessages)
    setMessageErrors(new Map())
    onResetSession?.()
  }

  const abortRef = useRef<AbortController | null>(null)

  // Cancel in-flight request when session changes or component unmounts
  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [sessionId])

  // Fallback: if we have a sessionId but no messages, try loading history from backend.
  useEffect(() => {
    if (!sessionId || sessionId === 'demo-session') return
    if (initialMessages.length > 0) return

    let cancelled = false
    getSession(sessionId)
      .then((data) => {
        if (cancelled) return
        const history = mapChatHistory(data.chat_history)
        if (history.length > 0) {
          setMessages(history)
        }
      })
      .catch(() => {
        /* ignore */
      })

    return () => {
      cancelled = true
    }
  }, [sessionId, initialMessages])

  const handleError = useCallback(
    (err: unknown): { message: string; retryable: boolean } => {
      if (err instanceof ApiError) {
        switch (err.code) {
          case 'auth':
            clearTokenCache()
            toast.error(err.message, {
              description: 'Redirecting you to sign in…',
              duration: 3000,
            })
            setTimeout(() => router.replace('/login'), 1500)
            return { message: err.message, retryable: false }

          case 'network':
            toast.error(err.message)
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

      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      toast.error(msg)
      return { message: msg, retryable: false }
    },
    [router],
  )

  const sendMessage = useCallback(
    async (content: string, retryOfId?: string) => {
      if (!content.trim()) return

      const userMsg: Message = {
        id: retryOfId || Date.now().toString(),
        role: 'user',
        content,
        timestamp: new Date(),
      }

      if (retryOfId) {
        setMessageErrors((prev) => {
          const next = new Map(prev)
          next.delete(retryOfId)
          return next
        })
        setMessages((prev) => prev.map((m) => (m.id === retryOfId ? userMsg : m)))
      } else {
        setMessages((prev) => [...prev, userMsg])
      }

      setIsLoading(true)

      try {
        if (!sessionId || sessionId === 'demo-session') {
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
          abortRef.current?.abort()
          const controller = new AbortController()
          abortRef.current = controller

          const msgId = (Date.now() + 1).toString()
          const agentMsg: Message = {
            id: msgId,
            role: 'agent',
            content: '',
            timestamp: new Date(),
          }
          setMessages((prev) => [...prev, agentMsg])

          const streamingResult = await sendChatStream(
            sessionId,
            content,
            (event) => {
              if (event.type === 'token' && event.content) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === msgId ? { ...m, content: m.content + event.content } : m,
                  ),
                )
              }
            },
            controller.signal,
          )

          invalidateSessionCache(sessionId)
          setIsLoading(false)

          onRequestAudio?.(msgId, streamingResult.reply)
          return
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return
        }
        const { message, retryable } = handleError(err)
        setMessageErrors((prev) =>
          new Map(prev).set(userMsg.id, {
            message,
            retryable,
            originalContent: content,
          }),
        )
      } finally {
        setIsLoading(false)
      }
    },
    [sessionId, language, handleError, onRequestAudio],
  )

  const handleRetry = useCallback(
    (messageId: string) => {
      const errorInfo = messageErrors.get(messageId)
      if (!errorInfo) return
      sendMessage(errorInfo.originalContent, messageId)
    },
    [messageErrors, sendMessage],
  )

  const handleDismissError = useCallback((messageId: string) => {
    setMessageErrors((prev) => {
      const next = new Map(prev)
      next.delete(messageId)
      return next
    })
  }, [])

  const handleStopGenerating = useCallback(() => {
    abortRef.current?.abort()
    setIsLoading(false)
    toast.info('Response stopped.')
  }, [])

  const submitExerciseAnswer = useCallback(
    async (answer: string) => {
      if (!sessionId || sessionId === 'demo-session') {
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
        abortRef.current?.abort()
        const controller = new AbortController()
        abortRef.current = controller

        const feedbackMsgId = (Date.now() + 1).toString()
        const feedbackMsg: Message = {
          id: feedbackMsgId,
          role: 'agent',
          content: '',
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, feedbackMsg])

        await sendChatStream(
          sessionId,
          answer,
          (event) => {
            if (event.type === 'token' && event.content) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === feedbackMsgId ? { ...m, content: m.content + event.content } : m,
                ),
              )
            }
          },
          controller.signal,
        )
        invalidateSessionCache(sessionId)
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        handleError(err)
      } finally {
        setIsLoading(false)
      }
    },
    [sessionId, handleError],
  )

  const attachAudioToMessage = useCallback((messageId: string, audioUrl: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, audioUrl } : m)),
    )
  }, [])

  return {
    messages,
    isLoading,
    messageErrors,
    sendMessage,
    handleRetry,
    handleDismissError,
    handleStopGenerating,
    submitExerciseAnswer,
    attachAudioToMessage,
  }
}
