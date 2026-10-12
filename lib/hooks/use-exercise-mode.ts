'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { sendChatStream, ApiError } from '@/lib/api'
import type { Language, ChatMode } from '@/lib/types'

interface UseExerciseModeOptions {
  sessionId: string | null
  language: Language
}

export function useExerciseMode({ sessionId, language }: UseExerciseModeOptions) {
  const [mode, setMode] = useState<ChatMode>('chat')
  const [currentExercise, setCurrentExercise] = useState<{ prompt: string; audioUrl?: string } | undefined>(undefined)
  const [isExerciseLoading, setIsExerciseLoading] = useState(false)
  const [exerciseError, setExerciseError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [sessionId])

  const requestNewExercise = useCallback(async () => {
    setIsExerciseLoading(true)
    setCurrentExercise(undefined)

    if (!sessionId || sessionId === 'demo-session') {
      await new Promise((r) => setTimeout(r, 1200))
      setCurrentExercise({
        prompt:
          language === 'korean'
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
      const exercisePrompt =
        language === 'korean'
          ? '새로운 연습 문제를 만들어 주세요.'
          : language === 'japanese'
            ? '新しい練習問題を作ってください。'
            : 'Please generate a new exercise for me.'

      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      const exResult = await sendChatStream(
        sessionId,
        exercisePrompt,
        () => {}, // no-op — exercise panel renders the full prompt at the end
        controller.signal,
      )
      setCurrentExercise({ prompt: exResult.reply })
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      const msg = err instanceof ApiError ? err.message : 'Failed to generate exercise. Please try again.'
      setExerciseError(msg)
    } finally {
      setIsExerciseLoading(false)
    }
  }, [sessionId, language])

  return {
    mode,
    setMode,
    currentExercise,
    isExerciseLoading,
    exerciseError,
    setExerciseError,
    requestNewExercise,
  }
}
