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
  const [tabId] = useState(() => Math.random().toString(36).slice(2, 9))
  const channelRef = useRef<BroadcastChannel | null>(null)
  const activeTabsRef = useRef<Set<string>>(new Set())
  const timeoutMapRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  /** Re-evaluate how many tabs are active and update state. */
  const evaluate = useCallback(() => {
    // Count tabs excluding self
    const others = activeTabsRef.current.size - (activeTabsRef.current.has(tabId) ? 1 : 0)

    if (others >= 1) {
      setTabState('multiple')
    } else {
      setTabState((prev) => (prev === 'multiple' ? 'single' : prev))
    }
  }, [tabId])

  /** Elect this tab as the active one. */
  const electThisTab = useCallback(() => {
    setTabState('elected')
    channelRef.current?.postMessage({ type: 'elected', from: tabId })
  }, [tabId])

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return

    const channel = new BroadcastChannel(CHANNEL_NAME)
    channelRef.current = channel
    const timeoutMap = timeoutMapRef.current

    // Register a tab ID (from heartbeat or initial message)
    const registerTab = (id: string) => {
      if (id === tabId) return
      activeTabsRef.current.add(id)
      evaluate()

      // Clear any existing timeout for this tab and set a new one
      const existing = timeoutMap.get(id)
      if (existing) clearTimeout(existing)
      timeoutMap.set(
        id,
        setTimeout(() => {
          activeTabsRef.current.delete(id)
          timeoutMap.delete(id)
          evaluate()
        }, TAB_TIMEOUT),
      )
    }

    channel.onmessage = (event: MessageEvent) => {
      const data = event.data

      if (data?.type === 'heartbeat' && data.from) {
        registerTab(data.from)
      }

      if (data?.type === 'elected' && data.from !== tabId) {
        setTabState('multiple')
      }
    }

    // Broadcast heartbeat periodically
    const heartbeat = () => {
      channel.postMessage({ type: 'heartbeat', from: tabId })
    }
    const heartbeatInterval = setInterval(heartbeat, HEARTBEAT_INTERVAL)

    // Send initial heartbeat immediately
    heartbeat()

    // Cleanup on unmount
    return () => {
      clearInterval(heartbeatInterval)
      for (const timeout of timeoutMap.values()) clearTimeout(timeout)
      timeoutMap.clear()
      channel.close()
      channelRef.current = null
    }
  }, [evaluate, tabId])

  return { tabState, electThisTab }
}
