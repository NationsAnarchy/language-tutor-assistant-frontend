'use client'

/**
 * Global audio manager singleton.
 *
 * Tracks all active HTMLAudioElement instances created by AudioPlayButton
 * so we can:
 *  - Stop all audio when the user navigates away (Issue #42)
 *  - Prevent tab/window close while audio is playing (Issue #41)
 *
 * Usage: import { audioManager } from '@/lib/audio-manager'
 */

class AudioManager {
  private elements = new Set<HTMLAudioElement>()
  private playingCount = 0

  /** Register an audio element for tracking. */
  register(el: HTMLAudioElement): void {
    this.elements.add(el)
    el.addEventListener('play', this.onPlay)
    el.addEventListener('pause', this.onPause)
    el.addEventListener('ended', this.onEnded)
  }

  /** Unregister an audio element (e.g. on unmount or reset). */
  unregister(el: HTMLAudioElement): void {
    this.elements.delete(el)
    el.removeEventListener('play', this.onPlay)
    el.removeEventListener('pause', this.onPause)
    el.removeEventListener('ended', this.onEnded)
  }

  /** Stop every tracked audio element immediately. */
  stopAll(): void {
    for (const el of this.elements) {
      el.pause()
      el.currentTime = 0
    }
    this.playingCount = 0
  }

  /** Whether any audio is currently playing. */
  get isPlaying(): boolean {
    return this.playingCount > 0
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  private onPlay = () => {
    this.playingCount++
  }

  private onPause = () => {
    this.playingCount = Math.max(0, this.playingCount - 1)
  }

  private onEnded = () => {
    this.playingCount = Math.max(0, this.playingCount - 1)
  }
}

/** Singleton instance — import and use directly. */
export const audioManager = new AudioManager()