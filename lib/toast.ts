/**
 * Typed toast helpers wrapping `sonner`.
 *
 * Centralizing toast calls here lets non-component code (e.g. `api.ts`)
 * fire toasts without importing sonner directly, and keeps the tone /
 * styling consistent across the app.
 */

import { toast as sonnerToast } from 'sonner'

export type ToastType = 'info' | 'success' | 'warning' | 'error'

export interface ToastOptions {
  /** Auto-dismiss after this many ms. Defaults: error=6000, others=4000. */
  duration?: number
  /** Optional action button. */
  action?: {
    label: string
    onClick: () => void
  }
  /** Optional description line. */
  description?: string
  /** Optional id — useful for deduping repeated toasts. */
  id?: string | number
}

const DEFAULT_DURATIONS: Record<ToastType, number> = {
  info: 4000,
  success: 3000,
  warning: 5000,
  error: 6000,
}

function show(type: ToastType, message: string, opts: ToastOptions = {}) {
  const duration = opts.duration ?? DEFAULT_DURATIONS[type]
  const payload: Parameters<typeof sonnerToast.error>[1] = {
    duration,
    description: opts.description,
    action: opts.action
      ? { label: opts.action.label, onClick: opts.action.onClick }
      : undefined,
    id: opts.id,
  }

  switch (type) {
    case 'success':
      return sonnerToast.success(message, payload)
    case 'warning':
      return sonnerToast.warning(message, payload)
    case 'error':
      return sonnerToast.error(message, payload)
    case 'info':
    default:
      return sonnerToast(message, payload)
  }
}

export const toast = {
  info: (message: string, opts?: ToastOptions) => show('info', message, opts),
  success: (message: string, opts?: ToastOptions) => show('success', message, opts),
  warning: (message: string, opts?: ToastOptions) => show('warning', message, opts),
  error: (message: string, opts?: ToastOptions) => show('error', message, opts),

  /**
   * Wrap a promise with a loading toast that resolves to success/error.
   * Useful for long-running operations like session creation.
   */
  promise: <T>(
    promise: Promise<T>,
    messages: { loading: string; success: string; error: string | ((err: unknown) => string) },
  ) => sonnerToast.promise(promise, {
    loading: messages.loading,
    success: messages.success,
    error: messages.error,
  }),
}