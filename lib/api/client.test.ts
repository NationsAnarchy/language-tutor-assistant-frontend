import { afterEach, describe, expect, it, vi } from 'vitest'
import { authenticatedRequest, clearTokenCache } from './client'
import { ApiError } from './errors'

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

afterEach(() => { clearTokenCache(); fetchMock.mockReset() })

describe('authenticatedRequest', () => {
  it('adds a cached bearer token to JSON requests', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ token: 'jwt' }), { status: 200 }))
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 200 }))
    await authenticatedRequest('/sessions', { method: 'GET' })
    expect(fetchMock.mock.calls[1][1].headers).toMatchObject({ 'Content-Type': 'application/json', Authorization: 'Bearer jwt' })
  })
  it('classifies rejected transport requests', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    await expect(authenticatedRequest('/sessions')).rejects.toMatchObject({ code: 'network', retryable: true })
  })
  it('preserves HTTP ApiError classification', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 401 }))
    fetchMock.mockResolvedValueOnce(new Response('', { status: 500, statusText: 'Unavailable' }))
    await expect(authenticatedRequest('/sessions')).rejects.toMatchObject({
      status: 500,
      code: 'server',
    } satisfies Partial<ApiError>)
  })
  it('clears a stale token before the next request', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ token: 'old' }), { status: 200 }))
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 200 }))
    await authenticatedRequest('/one')
    clearTokenCache()
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ token: 'new' }), { status: 200 }))
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 200 }))
    await authenticatedRequest('/two')
    expect(fetchMock.mock.calls[3][1].headers.Authorization).toBe('Bearer new')
  })
})
