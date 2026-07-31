import { describe, expect, it } from 'vitest'
import { ApiError, classifyError, handleApiError, langFromBackend, langToBackend, mapBackendSession, sendChatStream } from './index'

describe('API mapping boundary', () => {
  it('maps known language codes and preserves unknown values', () => {
    expect(langToBackend('korean')).toBe('ko')
    expect(langFromBackend('ja')).toBe('japanese')
    expect(langFromBackend('unexpected')).toBe('unexpected')
  })

  it('maps a backend session into the frontend session shape', () => {
    expect(mapBackendSession({
      session_id: 's1', user_id: 'u1', language: 'en', level: 'beginner', created_at: '2026-01-01',
    })).toMatchObject({ session_id: 's1', language: 'english', level: 'beginner', exists: true })
  })

  it('classifies network failures as retryable', () => {
    const error = classifyError(new TypeError('Failed to fetch'))
    expect(error).toMatchObject({ code: 'network', retryable: true })
  })

  it('keeps error and chat symbols available from the public facade', () => {
    expect(ApiError).toBeTypeOf('function')
    expect(handleApiError).toBeTypeOf('function')
    expect(sendChatStream).toBeTypeOf('function')
  })
})
