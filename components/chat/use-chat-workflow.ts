'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, handleApiError, invalidateSessionCache, sendChatStream, synthesizeAudio, type PracticeType } from '@/lib/api'
import type { Language, Message } from '@/lib/types'
import { demoFallback } from './chat-helpers'

export interface MessageError { message: string; retryable: boolean; originalContent: string }
export const isAbortError = (error: unknown) => error instanceof DOMException && error.name === 'AbortError'
export function appendStreamToken(messages: Message[], messageId: string, token: string): Message[] { return messages.map((message) => message.id === messageId ? { ...message, content: message.content + token } : message) }
export function sessionChangeState(initialMessages: Message[]) {
  return { messages: initialMessages, isLoading: false, messageErrors: new Map<string, MessageError>(), audioFailures: new Map<string, string>(), audioLoadingId: null as string | null }
}
export function areMessagesEqual(a: Message[], b: Message[]): boolean {
  if (a === b) return true
  if (a.length !== b.length) return false
  return a.every((msg, idx) => msg.id === b[idx].id && msg.role === b[idx].role && msg.content === b[idx].content && msg.audioUrl === b[idx].audioUrl)
}

interface SubmitOptions {
  retryOfId?: string; beforeSubmit?: () => void; onError?: (message: string) => void; demoResponse?: string
  practiceType?: PracticeType; onComplete?: (reply: string) => void; onAudio?: (url: string) => void
}
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
  const chatOperationRef = useRef(0)
  const audioOperationRef = useRef(0)
  const hasSubmittedInSessionRef = useRef(false)
  const objectUrlsRef = useRef(new Set<string>())
  const currentSessionIdRef = useRef(sessionId)
  const prevInitialMessagesRef = useRef(initialMessages)
  const messagesRef = useRef(messages)
  messagesRef.current = messages

  const teardownOperations = useCallback(() => {
    chatOperationRef.current += 1
    audioOperationRef.current += 1
    requestRef.current?.abort()
    audioRef.current?.abort()
    const objectUrls = objectUrlsRef.current
    objectUrls.forEach((url) => URL.revokeObjectURL(url))
    objectUrls.clear()
  }, [])

  useEffect(() => {
    const isNewSession = currentSessionIdRef.current !== sessionId
    const isNewInitialMessages = !areMessagesEqual(prevInitialMessagesRef.current, initialMessages)
    prevInitialMessagesRef.current = initialMessages

    if (isNewSession) {
      currentSessionIdRef.current = sessionId
      hasSubmittedInSessionRef.current = false
      teardownOperations()
      const reset = sessionChangeState(initialMessages)
      setMessages(reset.messages)
      setIsLoading(reset.isLoading)
      setMessageErrors(reset.messageErrors)
      setAudioFailures(reset.audioFailures)
      setAudioLoadingId(reset.audioLoadingId)
      return
    }

    // Same session background hydration: update messages if initialMessages changed and no chat operations sent yet in this session
    if (isNewInitialMessages && !hasSubmittedInSessionRef.current) {
      setMessages((prev) => {
        const localAudioMap = new Map(prev.filter((m) => m.audioUrl).map((m) => [m.id, m.audioUrl]))
        return initialMessages.map((msg) => {
          const localAudio = localAudioMap.get(msg.id)
          return localAudio && !msg.audioUrl ? { ...msg, audioUrl: localAudio } : msg
        })
      })
    }
  }, [initialMessages, sessionId, teardownOperations])

  useEffect(() => () => teardownOperations(), [teardownOperations])

  const submit = useCallback(async (content: string, options: SubmitOptions = {}) => {
    if (!content.trim()) return false
    hasSubmittedInSessionRef.current = true
    const operation = ++chatOperationRef.current
    const userMessage: Message = { id: options.retryOfId || Date.now().toString(), role: 'user', content, timestamp: new Date() }
    if (options.retryOfId) {
      setMessageErrors((previous) => { const next = new Map(previous); next.delete(options.retryOfId!); return next })
      setMessages((previous) => previous.map((message) => message.id === options.retryOfId ? userMessage : message))
    } else setMessages((previous) => [...previous, userMessage])
    options.beforeSubmit?.()
    setIsLoading(true)
    let agentId: string | null = null
    try {
      if (!sessionId || sessionId === 'demo-session') {
        await new Promise((resolve) => setTimeout(resolve, 1800))
        if (chatOperationRef.current !== operation) return false
        const reply = options.demoResponse || demoFallback(language)
        setMessages((previous) => [...previous, { id: (Date.now() + 1).toString(), role: 'agent', content: reply, timestamp: new Date() }])
        options.onComplete?.(reply)
      } else {
        requestRef.current?.abort()
        const controller = new AbortController()
        requestRef.current = controller
        agentId = (Date.now() + 1).toString()
        setMessages((previous) => [...previous, { id: agentId!, role: 'agent', content: '', timestamp: new Date() }])
        const result = await sendChatStream(sessionId, content, (event) => {
          if (chatOperationRef.current === operation && event.type === 'token' && event.content) setMessages((previous) => appendStreamToken(previous, agentId!, event.content!))
        }, controller.signal, { practiceType: options.practiceType })
        if (chatOperationRef.current !== operation) return false
        invalidateSessionCache(sessionId)
        options.onComplete?.(result.reply)
        if (!result.reply || result.reply.trim().length === 0) {
          setMessages((previous) => previous.filter((message) => message.id !== agentId))
          setMessageErrors((previous) => new Map(previous).set(userMessage.id, { message: 'The tutor gave an empty response. Please try again.', retryable: true, originalContent: content }))
        } else {
          setMessages((previous) => previous.map((message) => message.id === agentId ? { ...message, content: message.content || result.reply } : message))
          audioRef.current?.abort()
          const audioOp = ++audioOperationRef.current
          const audioController = new AbortController()
          audioRef.current = audioController
          setAudioLoadingId(agentId)
          void Promise.resolve(synthesizeAudio(sessionId, result.reply, audioController.signal)).then((url) => {
            const isStale = audioController.signal.aborted || audioOperationRef.current !== audioOp
            if (isStale) {
              if (url) URL.revokeObjectURL(url)
              return
            }
            setAudioLoadingId((current) => current === agentId ? null : current)
            if (url) {
              objectUrlsRef.current.add(url)
              setMessages((previous) => previous.map((message) => message.id === agentId ? { ...message, audioUrl: url } : message))
              options.onAudio?.(url)
            }
          }).catch((error) => {
            if (audioController.signal.aborted || audioOperationRef.current !== audioOp) return
            setAudioLoadingId((current) => current === agentId ? null : current)
            setAudioFailures((previous) => new Map(previous).set(agentId!, error instanceof ApiError ? "Audio couldn't be generated right now." : 'Audio unavailable.'))
          })
        }
      }
      return true
    } catch (error) {
      if (agentId) {
        setMessages((previous) => previous.filter((message) => message.id !== agentId))
      }
      if (chatOperationRef.current !== operation) return false
      if (isAbortError(error)) return false
      if (options.onError) options.onError(error instanceof ApiError ? error.message : 'Something went wrong. Please try again.')
      else {
        const { message, retryable } = handleApiError(error, router)
        setMessageErrors((previous) => new Map(previous).set(userMessage.id, { message, retryable, originalContent: content }))
      }
      return false
    } finally { if (chatOperationRef.current === operation) setIsLoading(false) }
  }, [language, router, sessionId])
  const requestPractice = useCallback((type: PracticeType, options: Omit<SubmitOptions, 'practiceType'> = {}) => {
    const prompts: Record<Language, Record<PracticeType, string>> = {
      english: { grammar: 'Please create a grammar exercise for me.', vocabulary: 'Please create a vocabulary exercise for me.', reading: 'Please create a reading exercise for me.', writing: 'Please create a writing exercise for me.', translation: 'Please create a translation exercise for me.', mistake_review: 'Please create an exercise based on my recent mistakes.' },
      korean: { grammar: '문법 연습 문제를 만들어 주세요.', vocabulary: '어휘 연습 문제를 만들어 주세요.', reading: '읽기 연습 문제를 만들어 주세요.', writing: '쓰기 연습 문제를 만들어 주세요.', translation: '번역 연습 문제를 만들어 주세요.', mistake_review: '최근 실수를 바탕으로 연습 문제를 만들어 주세요.' },
      japanese: { grammar: '文法練習問題を作ってください。', vocabulary: '語彙練習問題を作ってください。', reading: '読解練習問題を作ってください。', writing: '作文練習問題を作ってください。', translation: '翻訳練習問題を作ってください。', mistake_review: '最近の間違いをもとに練習問題を作ってください。' },
    }
    return submit(prompts[language][type], { ...options, practiceType: type })
  }, [language, submit])
  const retryAudio = useCallback(async (messageId: string) => {
    if (!sessionId || sessionId === 'demo-session') return false
    const message = messagesRef.current.find((candidate) => candidate.id === messageId && candidate.role === 'agent')
    if (!message?.content) return false

    audioRef.current?.abort()
    const audioOp = ++audioOperationRef.current
    const controller = new AbortController()
    audioRef.current = controller
    setAudioFailures((previous) => { const next = new Map(previous); next.delete(messageId); return next })
    setAudioLoadingId(messageId)
    try {
      const url = await synthesizeAudio(sessionId, message.content, controller.signal)
      if (controller.signal.aborted || audioOperationRef.current !== audioOp) {
        if (url) URL.revokeObjectURL(url)
        return false
      }
      if (url) {
        objectUrlsRef.current.add(url)
        setMessages((previous) => previous.map((candidate) => candidate.id === messageId ? { ...candidate, audioUrl: url } : candidate))
      }
      return Boolean(url)
    } catch (error) {
      if (controller.signal.aborted || audioOperationRef.current !== audioOp) return false
      setAudioFailures((previous) => new Map(previous).set(messageId, error instanceof ApiError ? "Audio couldn't be generated right now." : 'Audio unavailable.'))
      return false
    } finally {
      if (audioOperationRef.current === audioOp) setAudioLoadingId((current) => current === messageId ? null : current)
    }
  }, [sessionId])
  const dismissError = useCallback((messageId: string) => setMessageErrors((previous) => { const next = new Map(previous); next.delete(messageId); return next }), [])
  return { messages, isLoading, messageErrors, audioFailures, audioLoadingId, submit, requestPractice, retryAudio, dismissError }
}
