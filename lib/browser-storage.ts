/** Safe browser storage helpers for client-only, best-effort persistence. */
export function readJson<T>(storage: Storage, key: string): T | null {
  try {
    const value = storage.getItem(key)
    return value ? (JSON.parse(value) as T) : null
  } catch {
    return null
  }
}

export function writeJson(storage: Storage, key: string, value: unknown): void {
  try {
    storage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage can be unavailable or full; persistence is non-critical.
  }
}

export function writeStoredValue(storage: Storage, key: string, value: string): void {
  try {
    storage.setItem(key, value)
  } catch {
    // Storage can be unavailable or full; persistence is non-critical.
  }
}

export function removeStoredItem(storage: Storage, key: string): void {
  try {
    storage.removeItem(key)
  } catch {
    // Storage can be unavailable; there is nothing actionable for callers.
  }
}
