import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * onKeyDown handler: submit on Cmd/Ctrl+Enter (macOS uses the Cmd ⌘ key,
 * other platforms use Ctrl). Plain Enter and Shift+Enter both fall through
 * to the textarea default (insert a newline), which is also IME-safe because
 * modifier-qualified keypresses are not absorbed by IME composition.
 * Returns true if the event was handled (modifier+Enter pressed), false otherwise.
 */
export function handleEnterKey(
  e: React.KeyboardEvent<HTMLTextAreaElement>,
  onSubmit: () => void,
): boolean {
  if (
    e.key === 'Enter' &&
    (e.metaKey || e.ctrlKey) &&
    !e.altKey
  ) {
    e.preventDefault()
    onSubmit()
    return true
  }
  return false
}
