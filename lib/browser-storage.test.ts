import { describe, expect, it } from 'vitest'
import { readJson, removeStoredItem, writeJson, writeStoredValue } from './browser-storage'

function createStorage(): Storage {
  const values = new Map<string, string>()
  return {
    get length() { return values.size },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => { values.delete(key) },
    setItem: (key, value) => { values.set(key, value) },
  }
}

describe('browser storage helpers', () => {
  it('round-trips JSON and handles malformed values safely', () => {
    const storage = createStorage()
    writeJson(storage, 'session', { id: 'abc' })
    expect(readJson<{ id: string }>(storage, 'session')).toEqual({ id: 'abc' })
    storage.setItem('broken', '{')
    expect(readJson(storage, 'broken')).toBeNull()
  })

  it('writes raw values and removes keys', () => {
    const storage = createStorage()
    writeStoredValue(storage, 'theme', 'dark')
    expect(storage.getItem('theme')).toBe('dark')
    removeStoredItem(storage, 'theme')
    expect(storage.getItem('theme')).toBeNull()
  })
})
