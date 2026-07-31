'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, handleApiError, invalidateSessionCache, sendChatStream, synthesizeAudio } from '@/lib/api'
import type { Language, Message } from '@/lib/types'
import { demoFallback } from './chat-helpers'

export interface MessageError { message: string; retryable: boolean; originalContent: string }
export const isAbortError = (error: unknown) => error instanceof DOMException && error.name === 'AbortError'
export function appendStreamToken(messages: Message[], messageId: string, token: string): Message[] { return messages.map((message) => message.id === messageId ? { ...message, content: message.content + token } : message) }
export function sessionChangeState(initialMessages: Message[]) {
  return { messages: initialMessages, isLoading: false, messageErrors: new Map<string, MessageError>(), audioFailures: new Map<string, string>(), audioLoadingId: null as string | null }
}

interface SubmitOptions { retryOfId?: string; beforeSubmit?: () => void; onError?: (message: string) => void; demoResponse?: string }
interface Options { sessionId: string | null; language: Language; initialMessages: Message[]; router: { replace: (path: string) => void } }

/** Chat message lifecycle: optimistic entry, SSE reply, cache refresh, and optional audio. */
export function useChatWorkflow({ sessionId, language, initialMessages, router }: Options) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [isLoading, setIsLoading] = useState(false)
  const [messageErrors, setMessageErrors] = useState<Map<string, MessageError>>(new Map())
  const [audioFailures, setAudioFailures] = useState<Map<string, string>>(new Map())
  const [audioLoadingId, setAudioLoadingId] = useState<string | null>(null)
  const requestRef = useRef<AbortController | null>(null)
  const audioRef = useRef<AbortController | null>(null)
  const operationRef = useRef(0)
  useEffect(() => {
    operationRef.current += 1
    requestRef.current?.abort(); audioRef.current?.abort()
    const reset = sessionChangeState(initialMessages)
    setMessages(reset.messages); setIsLoading(reset.isLoading); setMessageErrors(reset.messageErrors); setAudioFailures(reset.audioFailures); setAudioLoadingId(reset.audioLoadingId)
    return () => { operationRef.current += 1; requestRef.current?.abort(); audioRef.current?.abort() }
  }, [initialMessages, sessionId])

  const submit = useCallback(async (content: string, options: SubmitOptions = {}) => {
    if (!content.trim()) return false
    const operation = ++operationRef.current
    const userMessage: Message = { id: options.retryOfId || Date.now().toString(), role: 'user', content, timestamp: new Date() }
    if (options.retryOfId) {
      setMessageErrors((previous) => { const next = new Map(previous); next.delete(options.retryOfId!); return next })
      setMessages((previous) => previous.map((message) => message.id === options.retryOfId ? userMessage : message))
    } else setMessages((previous) => [...previous, userMessage])
    options.beforeSubmit?.()
    setIsLoading(true)
    try {
      if (!sessionId || sessionId === 'demo-session') {
        await new Promise((resolve) => setTimeout(resolve, 1800))
        if (operationRef.current !== operation) return false
        setMessages((previous) => [...previous, { id: (Date.now() + 1).toString(), role: 'agent', content: options.demoResponse || demoFallback(language), timestamp: new Date() }])
      } else {
        requestRef.current?.abort()
        const controller = new AbortController(); requestRef.current = controller
        const agentId = (Date.now() + 1).toString()
        setMessages((previous) => [...previous, { id: agentId, role: 'agent', content: '', timestamp: new Date() }])
        const result = await sendChatStream(sessionId, content, (event) => {
          if (operationRef.current === operation && event.type === 'token' && event.content) setMessages((previous) => appendStreamToken(previous, agentId, event.content!))
        }, controller.signal)
        if (operationRef.current !== operation) return false
        invalidateSessionCache(sessionId)
        const audioController = new AbortController(); audioRef.current = audioController; setAudioLoadingId(agentId)
        void synthesizeAudio(sessionId, result.reply, audioController.signal).then((url) => {
          if (audioController.signal.aborted) return
          setAudioLoadingId((current) => current === agentId ? null : current)
          if (url) setMessages((previous) => previous.map((message) => message.id === agentId ? { ...message, audioUrl: url } : message))
        }).catch((error) => {
          if (audioController.signal.aborted) return
          setAudioLoadingId((current) => current === agentId ? null : current)
          setAudioFailures((previous) => new Map(previous).set(agentId, error instanceof ApiError ? "Audio couldn't be generated right now." : 'Audio unavailable.'))
        })
      }
      return true
    } catch (error) {
      if (operationRef.current !== operation) return false
      if (isAbortError(error)) return false
      if (options.onError) options.onError(error instanceof ApiError ? error.message : 'Something went wrong. Please try again.')
      else {
        const { message, retryable } = handleApiError(error, router)
        setMessageErrors((previous) => new Map(previous).set(userMessage.id, { message, retryable, originalContent: content }))
      }
      return false
    } finally { if (operationRef.current === operation) setIsLoading(false) }
  }, [language, router, sessionId])
  const dismissError = useCallback((messageId: string) => setMessageErrors((previous) => { const next = new Map(previous); next.delete(messageId); return next }), [])
  return { messages, isLoading, messageErrors, audioFailures, audioLoadingId, submit, dismissError }
}
