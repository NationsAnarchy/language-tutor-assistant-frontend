'use client'

import { useRef, useCallback } from 'react'

/**
 * Prevents a callback from being invoked more than once until the returned
 * promise resolves (or rejects). Useful for guarding submit handlers, sign-in
 * buttons, and other actions that should not fire twice.
 *
 * Usage:
 * ```tsx
 * const handleSignIn = usePreventDoubleClick(() => signIn('google'))
 * <button onClick={handleSignIn}>Sign in</button>
 * ```
 */
export function usePreventDoubleClick<T extends (...args: never[]) => Promise<unknown>>(
  fn: T,
): (...args: Parameters<T>) => Promise<unknown> {
  const lockRef = useRef(false)

  return useCallback(
    async (...args: Parameters<T>) => {
      if (lockRef.current) return
      lockRef.current = true
      try {
        await fn(...args)
      } finally {
        lockRef.current = false
      }
    },
    [fn],
  )
}