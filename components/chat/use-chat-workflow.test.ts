import { describe, expect, it } from 'vitest'
import { appendStreamToken, isAbortError, sessionChangeState } from './use-chat-workflow'

describe('chat workflow helpers', () => {
  it('accumulates stream tokens only into the agent placeholder', () => {
    const messages = appendStreamToken([{ id: 'a', role: 'agent', content: 'Hel', timestamp: new Date() }, { id: 'u', role: 'user', content: 'Question', timestamp: new Date() }], 'a', 'lo')
    expect(messages.map((message) => message.content)).toEqual(['Hello', 'Question'])
  })
  it('recognizes aborts so they do not become inline failures', () => {
    expect(isAbortError(new DOMException('aborted', 'AbortError'))).toBe(true)
    expect(isAbortError(new Error('failed'))).toBe(false)
  })
  it('resets loading when a session changes during an in-flight submit', () => {
    // The old submit's finally intentionally cannot write after its operation
    // has been invalidated, so the session reset owns releasing the spinner.
    const reset = sessionChangeState([{ id: 'history-0', role: 'agent', content: 'New session', timestamp: new Date() }])
    expect(reset.isLoading).toBe(false)
    expect(reset.messages).toHaveLength(1)
    expect(reset.messageErrors).toEqual(new Map())
  })
})
