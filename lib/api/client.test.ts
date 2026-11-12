import { afterEach, describe, expect, it, vi } from 'vitest'
import { authenticatedRequest, clearTokenCache } from './client'
import { ApiError } from './errors'

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

afterEach(() => { clearTokenCache(); fetchMock.mockReset() })

describe('authenticatedRequest', () => {
  it('sends JSON requests to the same-origin proxy', async () => {
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 200 }))
    await authenticatedRequest('/sessions', { method: 'GET' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe('/api/proxy/sessions')
    expect(fetchMock.mock.calls[0][1].headers).toMatchObject({ 'Content-Type': 'application/json' })
  })
  it('classifies rejected transport requests', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    await expect(authenticatedRequest('/sessions')).rejects.toMatchObject({ code: 'network', retryable: true })
  })
  it('preserves HTTP ApiError classification', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 500, statusText: 'Unavailable' }))
    await expect(authenticatedRequest('/sessions')).rejects.toMatchObject({
      status: 500,
      code: 'server',
    } satisfies Partial<ApiError>)
  })
  it('throws a typed ApiError on request timeout', async () => {
    vi.useFakeTimers()
    try {
      fetchMock.mockImplementationOnce((_url, init) => new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
      }))
      const reqPromise = authenticatedRequest('/slow')
      const assertion = expect(reqPromise).rejects.toMatchObject({
        status: 408,
        code: 'timeout',
        retryable: true,
      })
      await vi.advanceTimersByTimeAsync(65_000)
      await assertion
    } finally {
      vi.useRealTimers()
    }
  })
})
