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

  describe('user-scoped session storage', () => {
    it('scopes storage by user ID and prevents cross-user collisions', () => {
      const storage = createStorage()
      useStorage(storage)

      const userASession = { language: 'korean', level: 'intermediate', sessionId: 'session-a' } as const
      const userBSession = { language: 'japanese', level: 'beginner', sessionId: 'session-b' } as const

      saveActiveSession(userASession, 'user-a')
      saveActiveSession(userBSession, 'user-b')

      expect(storage.getItem('linguaai_active_session_user-a')).toBe(JSON.stringify(userASession))
      expect(storage.getItem('linguaai_active_session_user-b')).toBe(JSON.stringify(userBSession))

      expect(readActiveSession('user-a')).toEqual(userASession)
      expect(readActiveSession('user-b')).toEqual(userBSession)
      // Different user cannot read another user's session
      expect(readActiveSession('user-c')).toBeNull()
    })

    it('clears specific user session and any legacy key', () => {
      const storage = createStorage()
      useStorage(storage)

      saveActiveSession(koreanSession, 'user-a')
      storage.setItem(STORAGE_KEY, JSON.stringify(koreanSession))

      clearActiveSession('user-a')

      expect(readActiveSession('user-a')).toBeNull()
      expect(storage.getItem('linguaai_active_session_user-a')).toBeNull()
      expect(storage.getItem(STORAGE_KEY)).toBeNull()
    })
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
