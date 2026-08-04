import { afterEach, describe, expect, it, vi } from 'vitest'
import { backendUrl, proxyBackendRequest } from './backend-proxy'

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

afterEach(() => { fetchMock.mockReset(); delete process.env.BACKEND_URL })

describe('backend proxy', () => {
  it('constructs upstream URLs from only the configured origin and path', () => {
    process.env.BACKEND_URL = 'https://api.example.test/base'
    expect(backendUrl('/session/a', '?page=2').toString()).toBe('https://api.example.test/session/a?page=2')
  })

  it('forwards allowed headers and preserves JSON errors and request ids', async () => {
    process.env.BACKEND_URL = 'https://api.example.test'
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ detail: 'Missing', code: 'not_found', request_id: 'upstream-id' }), {
      status: 404, headers: { 'content-type': 'application/json', 'x-request-id': 'upstream-id' },
    }))
    const response = await proxyBackendRequest(new Request('http://app.test/api/proxy/session/a', {
      headers: { authorization: 'Bearer jwt', 'x-request-id': 'client-id' },
    }), '/session/a')
    expect(fetchMock).toHaveBeenCalledWith(expect.objectContaining({ pathname: '/session/a' }), expect.objectContaining({ headers: expect.any(Headers) }))
    expect((fetchMock.mock.calls[0][1].headers as Headers).get('authorization')).toBe('Bearer jwt')
    expect(response.status).toBe(404)
    expect(response.headers.get('x-request-id')).toBe('upstream-id')
    expect(await response.json()).toMatchObject({ detail: 'Missing', request_id: 'upstream-id' })
  })

  it('passes SSE and binary bodies through without decoding them', async () => {
    process.env.BACKEND_URL = 'https://api.example.test'
    const encoder = new TextEncoder()
    const stream = new ReadableStream({ start(controller) { controller.enqueue(encoder.encode('data: {"type":"token"}\\n\\n')); controller.close() } })
    fetchMock.mockResolvedValueOnce(new Response(stream, { headers: { 'content-type': 'text/event-stream' } }))
    const sse = await proxyBackendRequest(new Request('http://app.test/api/proxy/chat', { method: 'POST', body: '{}' }), '/chat')
    expect(await sse.text()).toContain('"token"')
    fetchMock.mockResolvedValueOnce(new Response(new Uint8Array([0, 255, 1]), { headers: { 'content-type': 'audio/mpeg' } }))
    const audio = await proxyBackendRequest(new Request('http://app.test/api/proxy/audio/a.mp3'), '/audio/a.mp3')
    expect([...new Uint8Array(await audio.arrayBuffer())]).toEqual([0, 255, 1])
  })

  it('returns the gateway-compatible error envelope when unavailable', async () => {
    process.env.BACKEND_URL = 'https://api.example.test'
    fetchMock.mockRejectedValue(new TypeError('offline'))
    const response = await proxyBackendRequest(new Request('http://app.test/api/proxy/health', { headers: { 'x-request-id': 'known-id' } }), '/health')
    expect(response.status).toBe(502)
    expect(await response.json()).toMatchObject({ code: 'gateway_error', request_id: 'known-id' })
  })
})
