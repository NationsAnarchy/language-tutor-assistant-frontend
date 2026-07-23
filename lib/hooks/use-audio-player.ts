'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { audioManager } from '@/lib/audio-manager'
import type { AudioState, PlaybackSpeed } from '@/lib/types'

export type AudioFailureReason = 'network' | 'decode' | 'unsupported' | 'aborted' | 'unknown'

function classifyMediaError(code: number | undefined): AudioFailureReason {
  switch (code) {
    case 1: return 'aborted'
    case 2: return 'network'
    case 3: return 'decode'
    case 4: return 'unsupported'
    default: return 'unknown'
  }
}

export function failureMessage(reason: AudioFailureReason): string {
  switch (reason) {
    case 'network': return "Couldn't load audio — check your connection."
    case 'decode': return "Audio file couldn't be decoded."
    case 'unsupported': return 'Audio format not supported by your browser.'
    case 'aborted': return 'Audio loading was cancelled.'
    default: return "Couldn't play audio."
  }
}

export function isRetryable(reason: AudioFailureReason): boolean {
  return reason === 'network' || reason === 'decode' || reason === 'aborted' || reason === 'unknown'
}

export function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export interface UseAudioPlayerReturn {
  audioState: AudioState
  speed: PlaybackSpeed
  failure: AudioFailureReason | null
  currentTime: number
  duration: number
  volume: number
  muted: boolean
  showControls: boolean
  audioRef: React.RefObject<HTMLAudioElement | null>
  handlePlay: () => Promise<void>
  handleSeek: (e: React.ChangeEvent<HTMLInputElement>) => void
  toggleMute: () => void
  handleVolumeChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  toggleSpeed: () => void
  resetAudio: () => void
  hasFailed: boolean
  canRetry: boolean
  isPermanentlyFailed: boolean
  isPlaying: boolean
}

export function useAudioPlayer(audioUrl?: string): UseAudioPlayerReturn {
  const [audioState, setAudioState] = useState<AudioState>('idle')
  const [speed, setSpeed] = useState<PlaybackSpeed>('normal')
  const [failure, setFailure] = useState<AudioFailureReason | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const [showControls, setShowControls] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const userPauseRef = useRef(false)

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
    if (audioRef.current) audioManager.unregister(audioRef.current)
  }, [])

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

    if (audioState === 'playing' && audioRef.current) {
      userPauseRef.current = true
      audioRef.current.pause()
      setAudioState('paused')
      return
    }

    if (audioState === 'paused' && audioRef.current) {
      await audioRef.current.play()
      setAudioState('playing')
      return
    }

    if (failure && isRetryable(failure)) {
      resetAudio()
      setFailure(null)
    }

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

        audio.addEventListener('timeupdate', () => setCurrentTime(audio.currentTime))
        audio.addEventListener('loadedmetadata', () => {
          setDuration(audio.duration)
          setShowControls(true)
        })
        audio.addEventListener('ended', () => { setAudioState('idle'); setCurrentTime(0) })
        audio.addEventListener('error', () => {
          setFailure(classifyMediaError(audio.error?.code))
          setAudioState('idle')
        })

        audioManager.register(audio)
        attachExternalHandlers(audio)
      }

      audioRef.current.playbackRate = speed === 'slow' ? 0.75 : 1.0
      await audioRef.current.play()
      setAudioState('playing')
      setFailure(null)
    } catch {
      setAudioState('idle')
    }
  }, [audioUrl, audioState, speed, failure, resetAudio, attachExternalHandlers, muted, volume])

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value)
    if (audioRef.current) audioRef.current.currentTime = newTime
    setCurrentTime(newTime)
  }

  const toggleMute = () => {
    if (audioRef.current) audioRef.current.muted = !muted
    setMuted((prev) => !prev)
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value)
    if (audioRef.current) audioRef.current.volume = newVolume
    setVolume(newVolume)
    if (newVolume === 0) setMuted(true)
    else if (muted) setMuted(false)
  }

  const toggleSpeed = () => {
    setSpeed((prev) => {
      const next = prev === 'normal' ? 'slow' : 'normal'
      if (audioRef.current) audioRef.current.playbackRate = next === 'slow' ? 0.75 : 1.0
      return next
    })
  }

  useEffect(() => () => cleanupElement(), [cleanupElement])

  const hasFailed = failure !== null
  const canRetry = hasFailed && isRetryable(failure)
  const isPermanentlyFailed = hasFailed && !isRetryable(failure)
  const isPlaying = audioState === 'playing'

  return {
    audioState, speed, failure, currentTime, duration, volume, muted, showControls,
    audioRef, handlePlay, handleSeek, toggleMute, handleVolumeChange, toggleSpeed, resetAudio,
    hasFailed, canRetry, isPermanentlyFailed, isPlaying,
  }
}