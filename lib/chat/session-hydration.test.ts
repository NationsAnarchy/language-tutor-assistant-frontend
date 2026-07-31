import { describe, expect, it } from 'vitest'
import { hydrateChatSession } from './session-hydration'

describe('hydrateChatSession', () => {
  it('maps history and audio hashes with known backend values', () => {
    const result = hydrateChatSession({ session_id: 's1', user_id: 'u1', language: 'ko', level: 'intermediate', created_at: '', chat_history: [{ role: 'assistant', content: 'Hi', audio_hash: 'hash' }] })
    expect(result).toMatchObject({ sessionId: 's1', language: 'korean', level: 'intermediate' })
    expect(result.messages[0]).toMatchObject({ role: 'agent', content: 'Hi' })
  })
  it('uses safe language and level defaults for unknown values', () => {
    const result = hydrateChatSession({ session_id: 's1', user_id: 'u1', language: 'xx', level: 'expert', created_at: '', chat_history: [] })
    expect(result).toMatchObject({ language: 'english', level: 'beginner', messages: [] })
  })
})
