import { describe, expect, it } from 'vitest'

import {
  isAllowedProxyPath,
  isBinaryProxyPath,
  isPublicProxyPath,
  isSseProxyPath,
} from '@/lib/proxy-policy'

describe('isAllowedProxyPath', () => {
  it('allows every endpoint the frontend calls', () => {
    for (const path of [
      '/sessions',
      '/session',
      '/session/abc-123',
      '/session/abc-123/tts',
      '/chat',
      '/audio/deadbeef.mp3',
    ]) {
      expect(isAllowedProxyPath(path), path).toBe(true)
    }
  })

  it('refuses anything else, so the route is not an open relay', () => {
    for (const path of [
      '/',
      '/admin',
      '/users',
      '/session/abc/extra',
      '/audio/../../etc/passwd',
      '/audio/nested/file.mp3',
      '/sessions/abc',
    ]) {
      expect(isAllowedProxyPath(path), path).toBe(false)
    }
  })
})

describe('isPublicProxyPath', () => {
  it('requires a session for audio endpoints as well (no endpoints are public)', () => {
    // Audio endpoints now require authentication via proxy JWT minting
    expect(isPublicProxyPath('/audio/deadbeef.mp3')).toBe(false)
  })

  it('requires a session for every data endpoint', () => {
    for (const path of ['/sessions', '/session', '/session/abc', '/session/abc/tts', '/chat', '/audio/deadbeef.mp3']) {
      expect(isPublicProxyPath(path), path).toBe(false)
    }
  })
})

describe('isBinaryProxyPath', () => {
  it('treats audio downloads as binary for any method', () => {
    expect(isBinaryProxyPath('/audio/x.mp3', 'GET')).toBe(true)
    expect(isBinaryProxyPath('/audio/x.mp3', 'HEAD')).toBe(true)
  })

  it('treats the TTS POST as binary', () => {
    expect(isBinaryProxyPath('/session/abc/tts', 'POST')).toBe(true)
  })

  it('does not treat the TTS path as binary for other methods', () => {
    expect(isBinaryProxyPath('/session/abc/tts', 'GET')).toBe(false)
  })

  it('treats JSON endpoints as text', () => {
    expect(isBinaryProxyPath('/sessions', 'GET')).toBe(false)
    expect(isBinaryProxyPath('/chat', 'POST')).toBe(false)
  })
})

describe('isSseProxyPath', () => {
  it('recognises the streaming chat endpoint', () => {
    expect(isSseProxyPath('/chat')).toBe(true)
  })

  it('does not treat sub-paths as streaming', () => {
    expect(isSseProxyPath('/chat/stream')).toBe(false)
    expect(isSseProxyPath('/sessions')).toBe(false)
  })
})
