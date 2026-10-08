import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { clearActiveSession, readActiveSession, saveActiveSession } from '@/lib/active-session'

const STORAGE_KEY = 'linguaai_active_session'

function createStorage(): Storage {
  const map = new Map<string, string>()
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
    clear: () => map.clear(),
    key: (index: number) => [...map.keys()][index] ?? null,
    get length() {
      return map.size
    },
  } as Storage
}

/** Emulate a browser: the module reads the bare `localStorage` global but
 *  guards on `window` being present. */
function useStorage(storage: Storage) {
  vi.stubGlobal('window', { localStorage: storage })
  vi.stubGlobal('localStorage', storage)
}

const koreanSession = { language: 'korean', level: 'intermediate', sessionId: 'abc' } as const

describe('active session storage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns null when nothing has been stored', () => {
    useStorage(createStorage())
    expect(readActiveSession()).toBeNull()
  })

  it('round-trips a saved session', () => {
    useStorage(createStorage())
    saveActiveSession(koreanSession)
    expect(readActiveSession()).toEqual(koreanSession)
  })

  it('clears the stored session', () => {
    const storage = createStorage()
    useStorage(storage)
    saveActiveSession(koreanSession)

    clearActiveSession()

    expect(readActiveSession()).toBeNull()
    expect(storage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('ignores a corrupt entry instead of throwing', () => {
    const storage = createStorage()
    useStorage(storage)
    storage.setItem(STORAGE_KEY, '{not valid json')
    expect(readActiveSession()).toBeNull()
  })

  it('ignores an entry with no sessionId', () => {
    const storage = createStorage()
    useStorage(storage)
    storage.setItem(STORAGE_KEY, JSON.stringify({ language: 'korean' }))
    expect(readActiveSession()).toBeNull()
  })

  it('never throws when storage is unavailable', () => {
    const storage = createStorage()
    const blocked = () => {
      throw new Error('storage disabled')
    }
    storage.getItem = blocked
    storage.setItem = blocked
    storage.removeItem = blocked
    useStorage(storage)

    expect(readActiveSession()).toBeNull()
    expect(() => saveActiveSession(koreanSession)).not.toThrow()
    expect(() => clearActiveSession()).not.toThrow()
  })

  describe('without a browser environment', () => {
    beforeEach(() => {
      vi.stubGlobal('window', undefined)
      vi.stubGlobal('localStorage', undefined)
    })

    it('is a no-op rather than a crash', () => {
      expect(readActiveSession()).toBeNull()
      expect(() => saveActiveSession(koreanSession)).not.toThrow()
      expect(() => clearActiveSession()).not.toThrow()
    })
  })
})
