'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

const CHANNEL_NAME = 'linguaai-tab-sync'

/** How often (ms) each tab broadcasts a heartbeat to confirm it's alive. */
const HEARTBEAT_INTERVAL = 800

/** How long (ms) without a heartbeat before we consider a tab dead. */
const TAB_TIMEOUT = 2500

type TabState = 'single' | 'multiple' | 'elected'

/**
 * Detects when the app is open in multiple browser tabs using a heartbeat
 * protocol over BroadcastChannel. Each tab broadcasts its unique ID every
 * 800ms. All tabs maintain a set of active IDs. When more than one ID is
 * present (besides self), the overlay is shown.
 *
 * This is more reliable than a simple counter because it handles rapid
 * open/close of multiple tabs and tab crashes gracefully via timeouts.
 */
export function useMultiTabDetector() {
  const [tabState, setTabState] = useState<TabState>('single')
  const channelRef = useRef<BroadcastChannel | null>(null)
  const tabIdRef = useRef(Math.random().toString(36).slice(2, 9))
  const activeTabsRef = useRef<Set<string>>(new Set())
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutMapRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  /** Re-evaluate how many tabs are active and update state. */
  const evaluate = useCallback(() => {
    // Count tabs excluding self
    const others = activeTabsRef.current.size - (activeTabsRef.current.has(tabIdRef.current) ? 1 : 0)

    if (others >= 1) {
      setTabState('multiple')
    } else {
      setTabState((prev) => (prev === 'multiple' ? 'single' : prev))
    }
  }, [])

  /** Elect this tab as the active one. */
  const electThisTab = useCallback(() => {
    setTabState('elected')
    channelRef.current?.postMessage({ type: 'elected', from: tabIdRef.current })
  }, [])

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return

    const channel = new BroadcastChannel(CHANNEL_NAME)
    channelRef.current = channel

    // Register a tab ID (from heartbeat or initial message)
    const registerTab = (id: string) => {
      if (id === tabIdRef.current) return
      activeTabsRef.current.add(id)
      evaluate()

      // Clear any existing timeout for this tab and set a new one
      const existing = timeoutMapRef.current.get(id)
      if (existing) clearTimeout(existing)
      timeoutMapRef.current.set(
        id,
        setTimeout(() => {
          activeTabsRef.current.delete(id)
          timeoutMapRef.current.delete(id)
          evaluate()
        }, TAB_TIMEOUT),
      )
    }

    channel.onmessage = (event: MessageEvent) => {
      const data = event.data

      if (data?.type === 'heartbeat' && data.from) {
        registerTab(data.from)
      }

      if (data?.type === 'elected' && data.from !== tabIdRef.current) {
        setTabState('multiple')
      }
    }

    // Broadcast heartbeat periodically
    const heartbeat = () => {
      channel.postMessage({ type: 'heartbeat', from: tabIdRef.current })
    }
    heartbeatRef.current = setInterval(heartbeat, HEARTBEAT_INTERVAL)

    // Send initial heartbeat immediately
    heartbeat()

    // Cleanup on unmount
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current)
      for (const t of timeoutMapRef.current.values()) clearTimeout(t)
      timeoutMapRef.current.clear()
      channel.close()
      channelRef.current = null
    }
  }, [evaluate])

  return { tabState, electThisTab }
}