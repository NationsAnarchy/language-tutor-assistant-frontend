// @vitest-environment jsdom

import { StrictMode, act, useEffect } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AudioPlayButton } from '@/components/audio/audio-play-button'
import { useAudioPlayer } from './use-audio-player'

describe('AudioPlayButton object URL lifecycle', () => {
  let container: HTMLDivElement
  let root: Root
  let revokeObjectURL: ReturnType<typeof vi.fn<(url: string) => void>>

  beforeEach(() => {
    revokeObjectURL = vi.fn<(url: string) => void>()
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(revokeObjectURL)
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root?.unmount())
    container?.remove()
    vi.restoreAllMocks()
  })

  it('does not revoke a parent-owned blob URL while mounting in Strict Mode', () => {
    act(() => {
      root.render(
        <StrictMode>
          <AudioPlayButton audioUrl="blob:generated-reply" />
        </StrictMode>,
      )
    })

    expect(revokeObjectURL).not.toHaveBeenCalled()
  })

  it('resets audio playback state when resetAudio is called', () => {
    let player!: ReturnType<typeof useAudioPlayer>
    function Harness({ url }: { url: string }) {
      const p = useAudioPlayer(url)
      useEffect(() => { player = p }, [p])
      return null
    }

    act(() => {
      root.render(<Harness url="blob:audio-1" />)
    })
    expect(player.audioState).toBe('idle')
    expect(player.currentTime).toBe(0)
    expect(player.duration).toBe(0)
    expect(player.showControls).toBe(false)

    act(() => {
      player.resetAudio()
    })
    expect(player.audioState).toBe('idle')
    expect(player.currentTime).toBe(0)
    expect(player.duration).toBe(0)
  })

  it('preserves seek position when playing from idle', async () => {
    let player!: ReturnType<typeof useAudioPlayer>
    function Harness({ url }: { url: string }) {
      const p = useAudioPlayer(url)
      useEffect(() => { player = p }, [p])
      return null
    }

    act(() => {
      root.render(<Harness url="blob:audio-seek" />)
    })

    // Simulate seeking while idle
    act(() => {
      player.handleSeek({ target: { value: '15' } } as React.ChangeEvent<HTMLInputElement>)
    })
    expect(player.currentTime).toBe(15)
  })
})
