'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

const CHANNEL_NAME = 'linguaai-tab-sync'

type TabState = 'single' | 'multiple' | 'elected'

/**
 * Detects when the app is open in multiple browser tabs.
 * Returns the current tab state and a function to "elect" this tab as the
 * active one (which pushes other tabs back to 'multiple' state).
 *
 * Uses the BroadcastChannel API — no polling, no localStorage hacks.
 */
export function useMultiTabDetector() {
  const [tabState, setTabState] = useState<TabState>('single')
  const channelRef = useRef<BroadcastChannel | null>(null)
  const tabIdRef = useRef(Math.random().toString(36).slice(2, 9))

  /** Elect this tab as the active one. */
  const electThisTab = useCallback(() => {
    setTabState('elected')
    channelRef.current?.postMessage({ type: 'elected', from: tabIdRef.current })
  }, [])

  useEffect(() => {
    // Not available in SSR / older browsers — silently skip
    if (typeof BroadcastChannel === 'undefined') return

    const channel = new BroadcastChannel(CHANNEL_NAME)
    channelRef.current = channel

    // How many tabs are currently open (including this one)
    let tabCount = 1

    channel.onmessage = (event: MessageEvent) => {
      const data = event.data

      if (typeof data === 'string' && data === 'tab-opened') {
        tabCount++
        if (tabCount >= 2) {
          setTabState('multiple')
        }
      }

      if (typeof data === 'string' && data === 'tab-closed') {
        tabCount = Math.max(1, tabCount - 1)
        if (tabCount < 2) {
          setTabState('single')
        }
      }

      // Another tab was elected — this tab becomes the "other" one
      if (data?.type === 'elected' && data.from !== tabIdRef.current) {
        setTabState('multiple')
      }
    }

    // Broadcast that this tab is open
    channel.postMessage('tab-opened')

    // Broadcast that this tab is closing
    const handleBeforeUnload = () => {
      channel.postMessage('tab-closed')
    }
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      channel.postMessage('tab-closed')
      channel.close()
      channelRef.current = null
    }
  }, [])

  return { tabState, electThisTab }
}