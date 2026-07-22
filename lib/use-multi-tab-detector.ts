'use client'

import { useEffect, useRef } from 'react'
import { toast } from 'sonner'

const CHANNEL_NAME = 'linguaai-tab-sync'

/**
 * Detects when the app is open in multiple browser tabs and shows a warning.
 * Uses the BroadcastChannel API — no polling, no localStorage hacks.
 *
 * Wire this into your root layout or a provider component:
 * ```tsx
 * function Provider({ children }) {
 *   useMultiTabDetector()
 *   return children
 * }
 * ```
 */
export function useMultiTabDetector() {
  const channelRef = useRef<BroadcastChannel | null>(null)

  useEffect(() => {
    // Not available in SSR / older browsers — silently skip
    if (typeof BroadcastChannel === 'undefined') return

    const channel = new BroadcastChannel(CHANNEL_NAME)
    channelRef.current = channel

    // Track the number of connected tabs
    let tabCount = 1

    // When another tab opens, it sends 'tab-opened'
    channel.onmessage = (event: MessageEvent) => {
      if (event.data === 'tab-opened') {
        tabCount++
        if (tabCount === 2) {
          toast.warning('App open in another tab', {
            description: 'Signing in on one tab may not reflect on the other.',
            duration: 5000,
          })
        }
      }
      if (event.data === 'tab-closed') {
        tabCount = Math.max(1, tabCount - 1)
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
}