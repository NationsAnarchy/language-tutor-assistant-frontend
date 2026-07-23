'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Play, Pause, Square, Loader2, Snail, AlertTriangle, RefreshCw, Volume2, VolumeX } from 'lucide-react'
import { cn } from '@/lib/utils'
import { audioManager } from '@/lib/audio-manager'
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

/** Format seconds to mm:ss display. */
function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function AudioPlayButton({ audioUrl, className }: AudioPlayButtonProps) {
  const [audioState, setAudioState] = useState<AudioState>('idle')
  const [speed, setSpeed] = useState<PlaybackSpeed>('normal')
  const [failure, setFailure] = useState<AudioFailureReason | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const [showControls, setShowControls] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const seekBarRef = useRef<HTMLInputElement>(null)

  /** Reset the audio element so a retry re-fetches from the server. */
  const resetAudio = useCallback(() => {
    if (audioRef.current) {
      audioManager.unregister(audioRef.current)
      audioRef.current.pause()
      audioRef.current.removeAttribute('src')
      audioRef.current.load()
      audioRef.current = null
    }
    setCurrentTime(0)
    setDuration(0)
    setShowControls(false)
  }, [])

  const cleanupElement = useCallback(() => {
    if (audioRef.current) {
      audioManager.unregister(audioRef.current)
    }
  }, [])

  /** Ref to track if the current pause was user-initiated (vs external via audioManager). */
  const userPauseRef = useRef(false)

  /** Listen for pause events caused by external sources (e.g. audioManager.stopAll).
   *  If the pause was externally triggered (not by the user clicking the button),
   *  reset to 'idle' so the UI reflects a clean stopped state. */
  const attachExternalHandlers = useCallback((audio: HTMLAudioElement) => {
    audio.addEventListener('pause', () => {
      if (!userPauseRef.current) {
        setAudioState('idle')
        setCurrentTime(0)
      }
      userPauseRef.current = false
    })
  }, [])

  const handlePlay = useCallback(async () => {
    if (!audioUrl) return

    // Pause if currently playing — keeps position for resume
    if (audioState === 'playing' && audioRef.current) {
      userPauseRef.current = true
      audioRef.current.pause()
      setAudioState('paused')
      return
    }

    // Resume if paused — continue from current position
    if (audioState === 'paused' && audioRef.current) {
      await audioRef.current.play()
      setAudioState('playing')
      return
    }

    // If previously failed and retryable, reset and try again
    if (failure && isRetryable(failure)) {
      resetAudio()
      setFailure(null)
    }

    // Stop if already stopped mid-track (idle with audio loaded) — reset
    if (audioState === 'idle' && audioRef.current) {
      audioRef.current.currentTime = 0
      setCurrentTime(0)
    }

    setAudioState('loading')

    try {
      if (!audioRef.current) {
        const audio = new Audio(audioUrl)
        audio.crossOrigin = 'anonymous'
        audio.volume = muted ? 0 : volume
        audioRef.current = audio

        // Time update tracking for seek bar
        audio.addEventListener('timeupdate', () => {
          setCurrentTime(audio.currentTime)
        })

        // Loaded metadata gives us the duration
        audio.addEventListener('loadedmetadata', () => {
          setDuration(audio.duration)
          setShowControls(true)
        })

        audio.addEventListener('ended', () => {
          setAudioState('idle')
          setCurrentTime(0)
        })
        audio.addEventListener('error', () => {
          const code = audio.error?.code
          const reason = classifyMediaError(code)
          setFailure(reason)
          setAudioState('idle')
        })

        // Register with global audio manager so navigation stops this audio
        audioManager.register(audio)
        attachExternalHandlers(audio)
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
  }, [audioUrl, audioState, speed, failure, resetAudio, attachExternalHandlers, muted, volume])

  /** Seek to a position in the audio. */
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value)
    if (audioRef.current) {
      audioRef.current.currentTime = newTime
    }
    setCurrentTime(newTime)
  }

  /** Toggle mute. */
  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !muted
    }
    setMuted((prev) => !prev)
  }

  /** Handle volume slider change. */
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value)
    if (audioRef.current) {
      audioRef.current.volume = newVolume
    }
    setVolume(newVolume)
    if (newVolume === 0) {
      setMuted(true)
    } else if (muted) {
      setMuted(false)
    }
  }

  /** Clean up audio manager registration on unmount. */
  useEffect(() => {
    return () => {
      cleanupElement()
    }
  }, [cleanupElement])

  const toggleSpeed = () => {
    setSpeed((prev) => (prev === 'normal' ? 'slow' : 'normal'))
  }

  if (!audioUrl) return null

  const hasFailed = failure !== null
  const canRetry = hasFailed && isRetryable(failure)
  const isPermanentlyFailed = hasFailed && !isRetryable(failure)
  const isPlaying = audioState === 'playing'

  const playLabel = hasFailed
    ? failureMessage(failure)
    : audioState === 'idle'
      ? 'Play audio'
      : audioState === 'loading'
        ? 'Loading audio...'
        : 'Stop audio'

  return (
    <div className={cn('inline-flex flex-col', className)}>
      {/* Top row: play/stop + speed toggle */}
      <div className="inline-flex items-center gap-0.5">
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
            <Pause className="size-3.5" aria-hidden="true" />
          ) : audioState === 'paused' ? (
            <Play className="size-3.5 fill-current translate-x-px" aria-hidden="true" />
          ) : (
            <Play className="size-3.5 fill-current translate-x-px" aria-hidden="true" />
          )}
        </button>

        {/* Speed toggle */}
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

      {/* Seek bar + time display + volume — visible when audio is loaded or playing (Issue #46) */}
      {showControls && (
        <div className="flex items-center gap-1.5 mt-1.5 min-w-[140px] max-w-[200px]">
          {/* Current time */}
          <span className="text-[10px] text-muted-foreground tabular-nums w-8 text-right shrink-0 select-none">
            {formatTime(currentTime)}
          </span>

          {/* Seek bar */}
          <input
            ref={seekBarRef}
            type="range"
            min={0}
            max={duration || 0}
            step={0.05}
            value={currentTime}
            onChange={handleSeek}
            aria-label="Audio position"
            className="flex-1 h-1 appearance-none bg-muted rounded-full cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:size-2.5 [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:border-0
              [&::-moz-range-thumb]:size-2.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-0"
          />

          {/* Duration */}
          <span className="text-[10px] text-muted-foreground tabular-nums w-8 text-left shrink-0 select-none">
            {formatTime(duration)}
          </span>

          {/* Volume control */}
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              onClick={toggleMute}
              aria-label={muted ? 'Unmute audio' : 'Mute audio'}
              className="inline-flex items-center justify-center size-4 rounded hover:bg-accent text-muted-foreground"
            >
              {muted || volume === 0 ? (
                <VolumeX className="size-3" aria-hidden="true" />
              ) : (
                <Volume2 className="size-3" aria-hidden="true" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={handleVolumeChange}
              aria-label="Volume"
              className="w-12 h-1 appearance-none bg-muted rounded-full cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:size-2 [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:border-0
                [&::-moz-range-thumb]:size-2 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-0"
            />
          </div>
        </div>
      )}
    </div>
  )
}