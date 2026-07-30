import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * onKeyDown handler: submit on Enter (ignoring Shift+Enter for new line,
 * and ignoring keydown during IME composition).
 * Returns true if the event was handled (Enter pressed), false otherwise.
 */
export function handleEnterKey(
  e: React.KeyboardEvent<HTMLTextAreaElement>,
  onSubmit: () => void,
): boolean {
  if (
    e.key === 'Enter' &&
    !e.shiftKey &&
    !e.nativeEvent.isComposing &&
    !(e.keyCode === 229)
  ) {
    e.preventDefault()
    onSubmit()
    return true
  }
  return false
}
