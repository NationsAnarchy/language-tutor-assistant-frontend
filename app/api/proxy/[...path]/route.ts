import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

/** Paths that return binary data (not JSON).
 *  - /audio/... — static audio file serving (legacy, may still be used)
 *  - /session/.../tts — POST that now returns raw audio bytes (Issue #43)
 */
const BINARY_PREFIXES = ['/audio/']
const BINARY_POST_PATTERNS = [/^\/session\/[^/]+\/tts$/]

/** Paths that return Server-Sent Events (text/event-stream).
 *  The proxy must passthrough the raw stream without buffering. */
const SSE_PATHS = ['/chat']

function isBinary(pathname: string, method: string): boolean {
  if (BINARY_PREFIXES.some((p) => pathname.startsWith(p))) return true
  if (method === 'POST' && BINARY_POST_PATTERNS.some((p) => p.test(pathname))) return true
  return false
}

function isSSE(pathname: string): boolean {
  return SSE_PATHS.includes(pathname)
}

/** Proxy a request to the backend, preserving the response body type. */
async function proxyRequest(
  request: NextRequest,
  pathname: string,
  method: string,
  body?: string | null,
) {
  const search = request.nextUrl.search
  const url = `${BACKEND_URL}${pathname}${search}`

  // Forward headers needed by the backend
  const headers = new Headers()
  const auth = request.headers.get('authorization')
  if (auth) headers.set('authorization', auth)

  // Forward content-type for POST requests with a body (e.g. TTS now sends JSON body)
  const contentType = request.headers.get('content-type')
  if (contentType) headers.set('content-type', contentType)

  const binary = isBinary(pathname, method)

  try {
    const fetchInit: RequestInit = { method, headers }
    if (body !== undefined && body !== null) {
      fetchInit.body = body
    }
    const res = await fetch(url, fetchInit)

    // For binary responses, use ArrayBuffer to avoid text corruption
    if (binary) {
      const arrayBuffer = await res.arrayBuffer()
      const contentType = res.headers.get('content-type') || 'audio/mpeg'
      const isStaticAudio = pathname.startsWith('/audio/')
      return new NextResponse(arrayBuffer, {
        status: res.status,
        statusText: res.statusText,
        headers: {
          'content-type': contentType,
          'content-length': res.headers.get('content-length') || String(arrayBuffer.byteLength),
          ...(isStaticAudio ? {
            'accept-ranges': 'bytes',
            'cache-control': 'public, max-age=86400',
          } : {
            'cache-control': 'no-cache',
          }),
        },
      })
    }

    // SSE streaming responses — passthrough the raw stream without buffering
    if (isSSE(pathname) && res.body) {
      return new NextResponse(res.body, {
        status: res.status,
        statusText: res.statusText,
        headers: {
          'content-type': 'text/event-stream',
          'cache-control': 'no-cache',
          'connection': 'keep-alive',
          'x-accel-buffering': 'no',
        },
      })
    }

    // JSON responses
    const text = await res.text()
    return new NextResponse(text, {
      status: res.status,
      statusText: res.statusText,
      headers: { 'content-type': 'application/json' },
    })
  } catch {
    return NextResponse.json(
      { detail: "Can't reach the backend server." },
      { status: 502 },
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params
  const pathname = '/' + path.join('/')
  return proxyRequest(request, pathname, 'GET')
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params
  const pathname = '/' + path.join('/')
  const body = await request.text()
  return proxyRequest(request, pathname, 'POST', body)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params
  const pathname = '/' + path.join('/')
  const body = await request.text()
  return proxyRequest(request, pathname, 'PATCH', body)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params
  const pathname = '/' + path.join('/')
  return proxyRequest(request, pathname, 'DELETE')
}