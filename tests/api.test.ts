import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  ApiError,
  audioUrl,
  classifyError,
  classifyResponseError,
  clearTokenCache,
  getCachedAudioUrl,
  langFromBackend,
  langToBackend,
  revokeAudioBlobUrls,
  synthesizeAudio,
} from '@/lib/api'

/** Minimal Response factory so error classification can be exercised directly. */
function jsonResponse(status: number, body: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  })
}

describe('classifyError', () => {
  it('passes an ApiError through untouched', () => {
    const original = new ApiError(500, 'boom', 'server', true)
    expect(classifyError(original)).toBe(original)
  })

  it('maps an AbortError to a retryable timeout', () => {
    const err = classifyError(new DOMException('aborted', 'AbortError'))
    expect(err.code).toBe('timeout')
    expect(err.status).toBe(408)
    expect(err.retryable).toBe(true)
  })

  it('maps a TypeError to a retryable network error', () => {
    const err = classifyError(new TypeError('Failed to fetch'))
    expect(err.code).toBe('network')
    expect(err.status).toBe(0)
    expect(err.retryable).toBe(true)
  })

  it('keeps the message for an unrecognised Error and is not retryable', () => {
    const err = classifyError(new Error('weird'), 418)
    expect(err.status).toBe(418)
    expect(err.code).toBe('unknown')
    expect(err.retryable).toBe(false)
    expect(err.message).toBe('weird')
  })

  it('handles non-Error throwables', () => {
    expect(classifyError('nope').message).toBe('Something unexpected happened.')
  })
})

describe('classifyResponseError', () => {
  it('maps 401 to a non-retryable auth error with a friendly message', async () => {
    const err = await classifyResponseError(jsonResponse(401, { detail: 'nope' }))
    expect(err.code).toBe('auth')
    expect(err.retryable).toBe(false)
    expect(err.message).toMatch(/sign in again/i)
  })

  it('maps 403 to a non-retryable forbidden error', async () => {
    expect((await classifyResponseError(jsonResponse(403, {}))).code).toBe('forbidden')
  })

  it('maps 429 to a retryable rate_limit error', async () => {
    const err = await classifyResponseError(jsonResponse(429, {}))
    expect(err.code).toBe('rate_limit')
    expect(err.retryable).toBe(true)
  })

  it('maps 500 to a retryable server error', async () => {
    const err = await classifyResponseError(jsonResponse(500, {}))
    expect(err.code).toBe('server')
    expect(err.retryable).toBe(true)
  })

  it('reads the FastAPI `detail` field and the request id header', async () => {
    const err = await classifyResponseError(
      jsonResponse(404, { detail: 'Session not found', request_id: 'req-1' }),
    )
    expect(err.code).toBe('not_found')
    expect(err.message).toBe('Session not found')
    expect(err.requestId).toBe('req-1')
  })

  it('classifies a non-JSON error response by status alone', async () => {
    // An HTML error page from a proxy, for example.
    const res = new Response('<html>oops</html>', { status: 502, statusText: 'Bad Gateway' })
    const err = await classifyResponseError(res)
    expect(err.status).toBe(502)
    expect(err.code).toBe('server')
    expect(err.retryable).toBe(true)
  })
})

describe('language code mapping', () => {
  it('maps UI language names to backend codes', () => {
    expect(langToBackend('english')).toBe('en')
    expect(langToBackend('korean')).toBe('ko')
    expect(langToBackend('japanese')).toBe('ja')
  })

  it('passes unknown values through unchanged', () => {
    expect(langToBackend('fr')).toBe('fr')
    expect(langFromBackend('de')).toBe('de')
  })

  it('maps backend codes back to UI language names', () => {
    expect(langFromBackend('en')).toBe('english')
    expect(langFromBackend('ko')).toBe('korean')
    expect(langFromBackend('ja')).toBe('japanese')
  })
})

describe('audio URLs', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('points directly at the backend when running locally', () => {
    expect(audioUrl('abc.mp3')).toBe('http://backend.test/audio/abc.mp3')
    expect(getCachedAudioUrl('abc')).toBe('http://backend.test/audio/abc.mp3')
  })

  it('returns null for a missing filename', () => {
    expect(audioUrl(null)).toBeNull()
    expect(audioUrl('')).toBeNull()
  })

  it('routes through the same-origin proxy when not on localhost', () => {
    vi.stubGlobal('window', { location: { hostname: 'app.example.com' } })
    expect(getCachedAudioUrl('abc')).toBe('/api/proxy/audio/abc.mp3')
  })
})

describe('audio blob URL lifecycle', () => {
  let created: string[]
  let revoked: string[]

  beforeEach(() => {
    clearTokenCache()
    created = []
    revoked = []
    vi.spyOn(URL, 'createObjectURL').mockImplementation(() => {
      const url = `blob:test/${created.length}`
      created.push(url)
      return url
    })
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation((url: string) => {
      revoked.push(url)
    })
  })

  afterEach(() => {
    revokeAudioBlobUrls()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  function mockBackend() {
    return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      void init
      const url = String(input)
      if (url.includes('/api/auth/token')) {
        return jsonResponse(200, { token: 'test-token' })
      }
      return new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: { 'content-type': 'audio/mpeg' },
      })
    })
  }

  it('returns a blob URL and sends the bearer token', async () => {
    const fetchMock = mockBackend()
    vi.stubGlobal('fetch', fetchMock)

    const url = await synthesizeAudio('session-1', 'hello')

    expect(url).toBe('blob:test/0')
    const ttsCall = fetchMock.mock.calls.find(([input]) => String(input).includes('/tts'))
    expect(ttsCall).toBeDefined()
    const init = ttsCall?.[1]
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer test-token')
    expect(init?.body).toBe(JSON.stringify({ content: 'hello' }))
  })

  it('revokes tracked blob URLs exactly once', async () => {
    vi.stubGlobal('fetch', mockBackend())

    await synthesizeAudio('session-1', 'one')
    await synthesizeAudio('session-1', 'two')
    expect(created).toHaveLength(2)

    revokeAudioBlobUrls()
    expect(revoked).toEqual(created)

    // Second call must be a no-op, not a double revoke.
    revokeAudioBlobUrls()
    expect(revoked).toHaveLength(2)
  })

  it('surfaces a classified error when synthesis fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input).includes('/api/auth/token')) {
          return jsonResponse(200, { token: 'test-token' })
        }
        return jsonResponse(429, { detail: 'Too many requests' })
      }),
    )

    await expect(synthesizeAudio('session-1', 'hello')).rejects.toBeInstanceOf(ApiError)
    await expect(synthesizeAudio('session-1', 'hello')).rejects.toMatchObject({
      code: 'rate_limit',
      retryable: true,
    })
  })
})
