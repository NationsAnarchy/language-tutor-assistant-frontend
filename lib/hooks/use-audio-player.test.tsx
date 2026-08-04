// @vitest-environment jsdom

import { StrictMode, act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AudioPlayButton } from '@/components/audio/audio-play-button'

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
})
