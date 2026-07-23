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
  private beforeUnloadHandler: ((e: BeforeUnloadEvent) => void) | null = null

  /** Register an audio element for tracking. */
  register(el: HTMLAudioElement): void {
    this.elements.add(el)
    el.addEventListener('play', this.onPlay)
    el.addEventListener('pause', this.onPause)
    el.addEventListener('ended', this.onEnded)
    this.updateBeforeUnload()
  }

  /** Unregister an audio element (e.g. on unmount or reset). */
  unregister(el: HTMLAudioElement): void {
    this.elements.delete(el)
    el.removeEventListener('play', this.onPlay)
    el.removeEventListener('pause', this.onPause)
    el.removeEventListener('ended', this.onEnded)
    this.updateBeforeUnload()
  }

  /** Stop every tracked audio element immediately. */
  stopAll(): void {
    for (const el of this.elements) {
      el.pause()
      el.currentTime = 0
    }
    this.playingCount = 0
    this.updateBeforeUnload()
  }

  /** Whether any audio is currently playing. */
  get isPlaying(): boolean {
    return this.playingCount > 0
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  private onPlay = () => {
    this.playingCount++
    this.updateBeforeUnload()
  }

  private onPause = () => {
    this.playingCount = Math.max(0, this.playingCount - 1)
    this.updateBeforeUnload()
  }

  private onEnded = () => {
    this.playingCount = Math.max(0, this.playingCount - 1)
    this.updateBeforeUnload()
  }

  /**
   * Attach or detach the `beforeunload` handler based on whether audio
   * is currently playing. When audio is playing, the browser will show
   * a confirmation dialog before closing the tab (Issue #41).
   */
  private updateBeforeUnload(): void {
    if (this.playingCount > 0) {
      if (!this.beforeUnloadHandler) {
        this.beforeUnloadHandler = (e: BeforeUnloadEvent) => {
          e.preventDefault()
          // Modern browsers require returnValue to be set
          e.returnValue = ''
        }
        window.addEventListener('beforeunload', this.beforeUnloadHandler)
      }
    } else {
      if (this.beforeUnloadHandler) {
        window.removeEventListener('beforeunload', this.beforeUnloadHandler)
        this.beforeUnloadHandler = null
      }
    }
  }
}

/** Singleton instance — import and use directly. */
export const audioManager = new AudioManager()