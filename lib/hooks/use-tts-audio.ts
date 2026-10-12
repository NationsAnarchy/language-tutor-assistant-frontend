'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { synthesizeAudio, revokeAudioBlobUrls, ApiError } from '@/lib/api'

interface UseTtsAudioOptions {
  sessionId: string | null
  onAudioReady: (messageId: string, audioUrl: string) => void
}

export function useTtsAudio({ sessionId, onAudioReady }: UseTtsAudioOptions) {
  const [audioLoadingId, setAudioLoadingId] = useState<string | null>(null)
  /** Audio failure hints: messageId → hint text. */
  const [audioFailures, setAudioFailures] = useState<Map<string, string>>(new Map())
  const audioAbortRef = useRef<AbortController | null>(null)

  // Release blob URLs and abort in-flight requests on session change or unmount
  useEffect(() => {
    return () => {
      audioAbortRef.current?.abort()
      revokeAudioBlobUrls()
    }
  }, [sessionId])

  const requestAudio = useCallback(
    (messageId: string, content: string) => {
      if (!sessionId || sessionId === 'demo-session') return

      setAudioFailures((prev) => {
        const next = new Map(prev)
        next.delete(messageId)
        return next
      })

      const audioController = new AbortController()
      audioAbortRef.current = audioController
      setAudioLoadingId(messageId)

      synthesizeAudio(sessionId, content, audioController.signal)
        .then((url) => {
          if (audioController.signal.aborted) return
          setAudioLoadingId(null)
          if (url) {
            onAudioReady(messageId, url)
          }
        })
        .catch((audioErr) => {
          if (audioController.signal.aborted) return
          setAudioLoadingId(null)
          const hint =
            audioErr instanceof ApiError
              ? "Audio couldn't be generated right now."
              : 'Audio unavailable.'
          setAudioFailures((prev) => new Map(prev).set(messageId, hint))
        })
    },
    [sessionId, onAudioReady],
  )

  const handleRetryAudio = useCallback(
    (messageId: string, content: string) => {
      requestAudio(messageId, content)
    },
    [requestAudio],
  )

  const clearAudioFailures = useCallback(() => {
    setAudioFailures(new Map())
  }, [])

  return {
    audioLoadingId,
    audioFailures,
    requestAudio,
    handleRetryAudio,
    clearAudioFailures,
  }
}
