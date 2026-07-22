'use client'

import { useState, useRef, useCallback } from 'react'
import { Play, Square, Loader2, Snail, AlertTriangle, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AudioState, PlaybackSpeed } from '@/lib/types'

/** Why audio playback failed — drives the retry / disabled behavior. */
type AudioFailureReason = 'network' | 'decode' | 'unsupported' | 'aborted' | 'unknown'

interface AudioPlayButtonProps {
  audioUrl?: string
  className?: string
}

/** Map a MediaError code to a human-readable failure reason. */
function classifyMediaError(code: number | undefined): AudioFailureReason {
  switch (code) {
    case 1: // MEDIA_ERR_ABORTED
      return 'aborted'
    case 2: // MEDIA_ERR_NETWORK
      return 'network'
    case 3: // MEDIA_ERR_DECODE
      return 'decode'
    case 4: // MEDIA_ERR_SRC_NOT_SUPPORTED
      return 'unsupported'
    default:
      return 'unknown'
  }
}

function failureMessage(reason: AudioFailureReason): string {
  switch (reason) {
    case 'network':
      return "Couldn't load audio — check your connection."
    case 'decode':
      return "Audio file couldn't be decoded."
    case 'unsupported':
      return 'Audio format not supported by your browser.'
    case 'aborted':
      return 'Audio loading was cancelled.'
    default:
      return "Couldn't play audio."
  }
}

/** Whether the user can retry after this failure. */
function isRetryable(reason: AudioFailureReason): boolean {
  return reason === 'network' || reason === 'decode' || reason === 'aborted' || reason === 'unknown'
}

export function AudioPlayButton({ audioUrl, className }: AudioPlayButtonProps) {
  const [audioState, setAudioState] = useState<AudioState>('idle')
  const [speed, setSpeed] = useState<PlaybackSpeed>('normal')
  const [failure, setFailure] = useState<AudioFailureReason | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  /** Reset the audio element so a retry re-fetches from the server. */
  const resetAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.removeAttribute('src')
      audioRef.current.load()
      audioRef.current = null
    }
  }, [])

  const handlePlay = useCallback(async () => {
    if (!audioUrl) return

    // Stop if already playing
    if (audioState === 'playing' && audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setAudioState('idle')
      return
    }

    // If previously failed and retryable, reset and try again
    if (failure && isRetryable(failure)) {
      resetAudio()
      setFailure(null)
    }

    setAudioState('loading')

    try {
      if (!audioRef.current) {
        const audio = new Audio(audioUrl)
        audio.crossOrigin = 'anonymous'
        audioRef.current = audio

        audio.addEventListener('ended', () => setAudioState('idle'))
        audio.addEventListener('error', () => {
          const code = audio.error?.code
          const reason = classifyMediaError(code)
          setFailure(reason)
          setAudioState('idle')
        })
      }

      // Set playback rate based on speed
      audioRef.current.playbackRate = speed === 'slow' ? 0.75 : 1.0

      await audioRef.current.play()
      setAudioState('playing')
      setFailure(null)
    } catch {
      // play() can reject with AbortError or NotAllowedError
      setAudioState('idle')
    }
  }, [audioUrl, audioState, speed, failure, resetAudio])

  const toggleSpeed = () => {
    setSpeed((prev) => (prev === 'normal' ? 'slow' : 'normal'))
  }

  if (!audioUrl) return null

  const hasFailed = failure !== null
  const canRetry = hasFailed && isRetryable(failure)
  const isPermanentlyFailed = hasFailed && !isRetryable(failure)

  const playLabel = hasFailed
    ? failureMessage(failure)
    : audioState === 'idle'
      ? 'Play audio'
      : audioState === 'loading'
        ? 'Loading audio...'
        : 'Stop audio'

  return (
    <div className={cn('inline-flex items-center gap-0.5', className)}>
      {/* Play / retry button */}
      <button
        type="button"
        onClick={handlePlay}
        aria-label={playLabel}
        title={playLabel}
        disabled={audioState === 'loading' || isPermanentlyFailed}
        className={cn(
          'inline-flex items-center justify-center size-7 rounded-full border border-border bg-card text-muted-foreground',
          'transition-all duration-150 hover:scale-105',
          'hover:border-primary/60 hover:text-primary hover:bg-primary/5',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          audioState === 'playing' &&
            'border-primary text-primary bg-primary/10 hover:border-primary hover:text-primary hover:bg-primary/20',
          audioState === 'loading' && 'opacity-60 cursor-wait hover:scale-100',
          hasFailed && 'border-destructive/40 text-destructive hover:border-destructive/60 hover:text-destructive hover:bg-destructive/5',
          isPermanentlyFailed && 'opacity-50 cursor-not-allowed hover:scale-100',
        )}
      >
        {audioState === 'loading' ? (
          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
        ) : hasFailed ? (
          canRetry ? (
            <RefreshCw className="size-3.5" aria-hidden="true" />
          ) : (
            <AlertTriangle className="size-3.5" aria-hidden="true" />
          )
        ) : audioState === 'playing' ? (
          <Square className="size-3 fill-current" aria-hidden="true" />
        ) : (
          <Play className="size-3.5 fill-current translate-x-px" aria-hidden="true" />
        )}
      </button>

      {/* Week 2: Speed toggle — small, unobtrusive */}
      <button
        type="button"
        onClick={toggleSpeed}
        aria-label={speed === 'normal' ? 'Switch to slow playback' : 'Switch to normal speed'}
        title={speed === 'normal' ? 'Slow speed' : 'Normal speed'}
        className={cn(
          'inline-flex items-center justify-center size-5 rounded-full',
          'transition-all duration-150',
          'hover:bg-accent',
          speed === 'slow'
            ? 'text-primary bg-primary/10'
            : 'text-muted-foreground/60',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        )}
      >
        <Snail
          className={cn(
            'size-3 transition-transform',
            speed === 'slow' && 'scale-90'
          )}
          aria-hidden="true"
        />
      </button>
    </div>
  )
}