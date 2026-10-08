import { describe, expect, it } from 'vitest'

import type { BackendSession } from '@/lib/api'
import { byMostRecent, mapBackendSession, mapChatHistory } from '@/lib/mappers'
import type { Session } from '@/lib/types'

/** Build a backend session record with sensible defaults. */
function backendSession(overrides: Partial<BackendSession> = {}): BackendSession {
  return {
    session_id: 's1',
    user_id: 'user-1',
    language: 'ko',
    level: 'intermediate',
    created_at: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('mapChatHistory', () => {
  it('returns an empty array when history is missing', () => {
    expect(mapChatHistory(undefined)).toEqual([])
  })

  it('assigns stable ids and normalises roles', () => {
    const messages = mapChatHistory([
      { role: 'user', content: '안녕하세요' },
      { role: 'assistant', content: 'Hello!' },
    ])

    expect(messages).toHaveLength(2)
    expect(messages[0]).toMatchObject({ id: 'history-0', role: 'user', content: '안녕하세요' })
    expect(messages[1]).toMatchObject({ id: 'history-1', role: 'agent', content: 'Hello!' })
    expect(messages[0].timestamp).toBeInstanceOf(Date)
  })

  it('prefers the cached audio_hash over audio_url', () => {
    const [message] = mapChatHistory([
      { role: 'assistant', content: 'hi', audio_hash: 'abc123', audio_url: 'legacy.mp3' },
    ])
    expect(message.audioUrl).toBe('/api/proxy/audio/abc123.mp3')
  })

  it('falls back to audio_url when no hash is present', () => {
    const [message] = mapChatHistory([
      { role: 'assistant', content: 'hi', audio_url: 'legacy.mp3' },
    ])
    expect(message.audioUrl).toBe('/api/proxy/audio/legacy.mp3')
  })

  it('leaves audioUrl undefined when the entry has no audio', () => {
    const [message] = mapChatHistory([{ role: 'assistant', content: 'hi' }])
    expect(message.audioUrl).toBeUndefined()
  })
})

describe('mapBackendSession', () => {
  it('converts backend codes into UI language names and carries metadata', () => {
    expect(
      mapBackendSession(
        backendSession({ updated_at: '2024-02-01T00:00:00Z', title: 'Ordering coffee' }),
      ),
    ).toEqual({
      language: 'korean',
      level: 'intermediate',
      exists: true,
      session_id: 's1',
      title: 'Ordering coffee',
      updated_at: '2024-02-01T00:00:00Z',
    })
  })

  it('tolerates a session without a title', () => {
    const session = mapBackendSession(
      backendSession({ session_id: 's2', language: 'ja', level: 'beginner' }),
    )
    expect(session.language).toBe('japanese')
    expect(session.title).toBeUndefined()
  })
})

describe('byMostRecent', () => {
  const session = (updated_at?: string) =>
    ({ language: 'korean', level: 'beginner', exists: true, updated_at }) as Session

  it('sorts newest first', () => {
    const list = [
      session('2024-01-01T00:00:00Z'),
      session('2024-03-01T00:00:00Z'),
      session('2024-02-01T00:00:00Z'),
    ]
    expect(list.sort(byMostRecent).map((s) => s.updated_at)).toEqual([
      '2024-03-01T00:00:00Z',
      '2024-02-01T00:00:00Z',
      '2024-01-01T00:00:00Z',
    ])
  })

  it('sorts sessions without a date last', () => {
    const list = [session(undefined), session('2024-01-01T00:00:00Z')]
    expect(list.sort(byMostRecent).map((s) => s.updated_at)).toEqual([
      '2024-01-01T00:00:00Z',
      undefined,
    ])
  })
})
