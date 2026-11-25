// @vitest-environment jsdom

import { act, useEffect } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useMultiTabDetector } from './use-multi-tab-detector'

class MockBroadcastChannel {
  name: string
  static instances: MockBroadcastChannel[] = []
  onmessage: ((event: MessageEvent) => void) | null = null

  constructor(name: string) {
    this.name = name
    MockBroadcastChannel.instances.push(this)
  }

  postMessage(data: unknown) {
    MockBroadcastChannel.instances.forEach((instance) => {
      if (instance !== this && instance.name === this.name) {
        instance.onmessage?.(new MessageEvent('message', { data }))
      }
    })
  }

  close() {
    MockBroadcastChannel.instances = MockBroadcastChannel.instances.filter((i) => i !== this)
  }
}

describe('useMultiTabDetector', () => {
  let container: HTMLDivElement
  let root: Root
  const originalBC = globalThis.BroadcastChannel

  beforeEach(() => {
    MockBroadcastChannel.instances = []
    globalThis.BroadcastChannel = MockBroadcastChannel as unknown as typeof BroadcastChannel
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root?.unmount())
    container?.remove()
    globalThis.BroadcastChannel = originalBC
    MockBroadcastChannel.instances = []
    vi.restoreAllMocks()
  })

  it('starts in single tab state when no other tabs broadcast', () => {
    let detector!: ReturnType<typeof useMultiTabDetector>
    function Harness() {
      const d = useMultiTabDetector()
      useEffect(() => { detector = d }, [d])
      return null
    }

    act(() => { root.render(<Harness />) })
    expect(detector.tabState).toBe('single')
  })

  it('transitions to multiple tab state when another tab heartbeats, and electThisTab sets elected', () => {
    let detector!: ReturnType<typeof useMultiTabDetector>
    function Harness() {
      const d = useMultiTabDetector()
      useEffect(() => { detector = d }, [d])
      return null
    }

    act(() => { root.render(<Harness />) })
    expect(detector.tabState).toBe('single')

    // Simulate another tab heartbeating
    const otherChannel = new MockBroadcastChannel('linguaai-tab-sync')
    act(() => {
      otherChannel.postMessage({ type: 'heartbeat', from: 'other-tab-id' })
    })

    expect(detector.tabState).toBe('multiple')

    // Elect this tab
    act(() => {
      detector.electThisTab()
    })
    expect(detector.tabState).toBe('elected')

    // Other tab elects itself
    act(() => {
      otherChannel.postMessage({ type: 'elected', from: 'other-tab-id' })
    })
    expect(detector.tabState).toBe('multiple')

    otherChannel.close()
  })

  it('clears active tabs on unmount so remounting does not retain ghost tabs', () => {
    let detector!: ReturnType<typeof useMultiTabDetector>
    function Harness() {
      const d = useMultiTabDetector()
      useEffect(() => { detector = d }, [d])
      return null
    }

    act(() => { root.render(<Harness />) })
    const otherChannel = new MockBroadcastChannel('linguaai-tab-sync')
    act(() => {
      otherChannel.postMessage({ type: 'heartbeat', from: 'temporary-tab' })
    })
    expect(detector.tabState).toBe('multiple')

    // Unmount and remount (as in React StrictMode)
    act(() => { root.unmount() })
    root = createRoot(container)
    act(() => { root.render(<Harness />) })

    // On clean remount without ongoing heartbeat, it starts fresh in single mode
    expect(detector.tabState).toBe('single')
    otherChannel.close()
  })
})
