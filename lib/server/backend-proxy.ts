const TIMEOUT_MS = 55_000
const REQUEST_HEADERS = ['authorization', 'content-type', 'x-request-id'] as const
const RESPONSE_HEADERS = [
  'content-type', 'content-length', 'cache-control', 'content-disposition',
  'accept-ranges', 'x-request-id', 'x-accel-buffering',
] as const

function requestId(request: Request): string {
  return request.headers.get('x-request-id') || crypto.randomUUID().replaceAll('-', '').slice(0, 16)
}

export function backendOrigin(): URL {
  const value = process.env.BACKEND_URL
  if (!value) throw new Error('BACKEND_URL is not configured')
  let url: URL
  try { url = new URL(value) } catch { throw new Error('BACKEND_URL must be an absolute HTTP(S) URL') }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('BACKEND_URL must be an absolute HTTP(S) origin')
  }
  return url
}

export function backendUrl(pathname: string, search = ''): URL {
  if (!pathname.startsWith('/') || pathname.includes('\\')) throw new Error('Invalid backend path')
  const origin = backendOrigin()
  // Route segments are supplied by Next, but never permit a configured base
  // path to turn into an open proxy target.
  return new URL(`${pathname}${search}`, origin.origin)
}

function failure(detail: string, id: string): Response {
  return Response.json({ detail, code: 'gateway_error', request_id: id }, {
    status: 502,
    headers: { 'x-request-id': id },
  })
}

function responseHeaders(upstream: Response, id: string): Headers {
  const headers = new Headers()
  for (const name of RESPONSE_HEADERS) {
    const value = upstream.headers.get(name)
    if (value) headers.set(name, value)
  }
  if (!headers.has('x-request-id')) headers.set('x-request-id', id)
  return headers
}

export async function proxyBackendRequest(request: Request, pathname: string): Promise<Response> {
  const id = requestId(request)
  let url: URL
  try { url = backendUrl(pathname, new URL(request.url).search) }
  catch (error) { return failure(error instanceof Error ? error.message : 'Backend configuration is invalid.', id) }

  const headers = new Headers()
  for (const name of REQUEST_HEADERS) {
    const value = request.headers.get(name)
    if (value) headers.set(name, value)
  }
  headers.set('x-request-id', id)

  const timeout = new AbortController()
  const timer = setTimeout(() => timeout.abort(), TIMEOUT_MS)
  const cancel = () => timeout.abort()
  request.signal.addEventListener('abort', cancel, { once: true })
  try {
    const upstream = await fetch(url, {
      method: request.method,
      headers,
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
      signal: timeout.signal,
      // Required by Node's fetch when a Request body is streamed.
      duplex: 'half',
      cache: 'no-store',
    } as RequestInit)
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders(upstream, id),
    })
  } catch {
    return failure('Unable to reach the tutor service. Please try again.', id)
  } finally {
    clearTimeout(timer)
    request.signal.removeEventListener('abort', cancel)
  }
}
