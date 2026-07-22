'use client'

import { useMultiTabDetector } from './use-multi-tab-detector'
import { MultiTabOverlay } from '@/components/multi-tab-overlay'

/** Wires multi-tab detection into the app.
 *  When a second tab is detected, it shows a full-screen overlay blocking
 *  the app content until the user elects this tab as the active one. */
export function TabDetectorProvider({ children }: { children: React.ReactNode }) {
  const { tabState, electThisTab } = useMultiTabDetector()

  if (tabState === 'multiple') {
    return <MultiTabOverlay onElectThisTab={electThisTab} />
  }

  return <>{children}</>
}