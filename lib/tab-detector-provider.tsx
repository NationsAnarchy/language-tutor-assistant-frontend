'use client'

import { useMultiTabDetector } from './use-multi-tab-detector'

/** Wires multi-tab detection into the app. Place inside <body> in layout.tsx. */
export function TabDetectorProvider({ children }: { children: React.ReactNode }) {
  useMultiTabDetector()
  return <>{children}</>
}