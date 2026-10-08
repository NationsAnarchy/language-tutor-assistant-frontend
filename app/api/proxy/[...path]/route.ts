import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import {
  isAllowedProxyPath,
  isBinaryProxyPath,
  isPublicProxyPath,
  isSseProxyPath,
} from '@/lib/proxy-policy'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

/** How long to wait on a non-streaming backend request before giving up.
 *
 *  This only exists to turn a genuinely hung connection into a clean 504
 *  instead of an opaque platform timeout — it is not a performance budget.
 *  Keep it generous: TTS synthesis is a Gemini call plus an ffmpeg encode and
 *  can legitimately take a minute on a cold backend. Raise this (single
 *  constant) rather than removing it if the backend needs longer.
 *
 *  Streaming (SSE) responses are exempt entirely: /chat can stay open for the
 *  whole LLM turn. */
const BACKEND_TIMEOUT_MS = 120_000

/** Proxy a request to the backend, preserving the response body type. */
async function proxyRequest(
  request: NextRequest,
  pathname: string,
  method: string,
  body?: string | null,
) {
  // Only forward endpoints the frontend is known to use. Returning the same
  // 404 for everything else avoids confirming which paths exist.
  if (!isAllowedProxyPath(pathname)) {
    return NextResponse.json({ detail: 'Not found' }, { status: 404 })
  }

  // Cached audio is public (see lib/proxy-policy). Everything else requires a
  // signed-in user, so the proxy cannot be used as an anonymous relay.
  if (!isPublicProxyPath(pathname)) {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 })
    }
  }

  const search = request.nextUrl.search
  const url = `${BACKEND_URL}${pathname}${search}`

  // Forward headers needed by the backend
  const headers = new Headers()
  const authHeader = request.headers.get('authorization')
  if (authHeader) headers.set('authorization', authHeader)

  // Forward content-type for requests with a body (e.g. TTS sends JSON)
  const contentType = request.headers.get('content-type')
  if (contentType) headers.set('content-type', contentType)

  const binary = isBinaryProxyPath(pathname, method)
  const streaming = isSseProxyPath(pathname)

  try {
    const fetchInit: RequestInit = { method, headers }
    if (!streaming) {
      fetchInit.signal = AbortSignal.timeout(BACKEND_TIMEOUT_MS)
    }
    if (body !== undefined && body !== null) {
      fetchInit.body = body
    }
    const res = await fetch(url, fetchInit)

    // For binary responses, use ArrayBuffer to avoid text corruption
    if (binary) {
      const arrayBuffer = await res.arrayBuffer()
      const responseType = res.headers.get('content-type') || 'audio/mpeg'
      const isStaticAudio = pathname.startsWith('/audio/')
      return new NextResponse(arrayBuffer, {
        status: res.status,
        statusText: res.statusText,
        headers: {
          'content-type': responseType,
          'content-length': res.headers.get('content-length') || String(arrayBuffer.byteLength),
          ...(isStaticAudio
            ? {
                'accept-ranges': 'bytes',
                'cache-control': 'public, max-age=86400',
              }
            : { 'cache-control': 'no-cache' }),
        },
      })
    }

    // SSE streaming responses — passthrough the raw stream without buffering
    if (streaming && res.body) {
      return new NextResponse(res.body, {
        status: res.status,
        statusText: res.statusText,
        headers: {
          'content-type': 'text/event-stream',
          'cache-control': 'no-cache',
          connection: 'keep-alive',
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
  } catch (err) {
    const timedOut = err instanceof Error && err.name === 'TimeoutError'
    return NextResponse.json(
      {
        detail: timedOut
          ? 'The backend took too long to respond.'
          : "Can't reach the backend server.",
      },
      { status: timedOut ? 504 : 502 },
    )
  }
}

/** Resolve the proxied path from the catch-all route segment. */
async function resolvePath(params: Promise<{ path: string[] }>): Promise<string> {
  const { path } = await params
  return '/' + path.join('/')
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return proxyRequest(request, await resolvePath(params), 'GET')
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const body = await request.text()
  return proxyRequest(request, await resolvePath(params), 'POST', body)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const body = await request.text()
  return proxyRequest(request, await resolvePath(params), 'PATCH', body)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return proxyRequest(request, await resolvePath(params), 'DELETE')
}
