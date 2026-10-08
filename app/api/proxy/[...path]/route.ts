import { NextRequest, NextResponse } from 'next/server'
import { SignJWT } from 'jose'
import { auth } from '@/lib/auth'
import {
  isAllowedProxyPath,
  isBinaryProxyPath,
  isPublicProxyPath,
  isSseProxyPath,
} from '@/lib/proxy-policy'

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

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
  const incomingRequestId = request.headers.get('x-request-id')
  const requestId =
    incomingRequestId && /^[A-Za-z0-9_-]{1,64}$/.test(incomingRequestId)
      ? incomingRequestId
      : crypto.randomUUID().replace(/-/g, '').slice(0, 16)

  // Only forward endpoints the frontend is known to use. Returning the same
  // 404 for everything else avoids confirming which paths exist.
  if (!isAllowedProxyPath(pathname)) {
    return NextResponse.json(
      { detail: 'Not found', code: 'not_found', request_id: requestId },
      { status: 404, headers: { 'x-request-id': requestId } },
    )
  }

  // All endpoints require a signed-in user so the proxy cannot be used as an anonymous relay.
  let session = null
  if (!isPublicProxyPath(pathname)) {
    session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { detail: 'Unauthorized', code: 'auth', request_id: requestId },
        { status: 401, headers: { 'x-request-id': requestId } },
      )
    }
  }

  const search = request.nextUrl.search
  const url = `${BACKEND_URL}${pathname}${search}`

  // Forward headers needed by the backend
  const headers = new Headers()
  headers.set('x-request-id', requestId)

  const authHeader = request.headers.get('authorization')
  if (authHeader) {
    headers.set('authorization', authHeader)
  } else if (session?.user?.id && process.env.AUTH_SECRET) {
    // When the browser requests media directly (e.g. <audio src="...">), it sends
    // session cookies without an Authorization header. Mint a backend JWT on behalf of the user.
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET)
    const token = await new SignJWT({
      sub: session.user.id,
      email: session.user.email || '',
      name: session.user.name || '',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(secret)
    headers.set('authorization', `Bearer ${token}`)
  }

  // Forward content-type for requests with a body (e.g. TTS sends JSON)
  const contentType = request.headers.get('content-type')
  if (contentType) headers.set('content-type', contentType)

  const binary = isBinaryProxyPath(pathname, method)
  const streaming = isSseProxyPath(pathname)

  try {
    const fetchInit: RequestInit = { method, headers }
    if (streaming) {
      fetchInit.signal = request.signal
    } else {
      fetchInit.signal = AbortSignal.any
        ? AbortSignal.any([request.signal, AbortSignal.timeout(BACKEND_TIMEOUT_MS)])
        : request.signal
    }
    if (body !== undefined && body !== null) {
      fetchInit.body = body
    }
    const res = await fetch(url, fetchInit)
    const responseRequestId = res.headers.get('x-request-id') || requestId

    // For binary responses, stream binary body directly and set private cache headers
    if (binary) {
      const responseType = res.headers.get('content-type') || 'audio/mpeg'
      const headersInit: Record<string, string> = {
        'content-type': responseType,
        'cache-control': 'private, no-cache',
        'x-request-id': responseRequestId,
      }
      const contentLength = res.headers.get('content-length')
      if (contentLength) {
        headersInit['content-length'] = contentLength
      }

      const bodyStream = res.body ?? (await res.arrayBuffer())
      return new NextResponse(bodyStream as BodyInit, {
        status: res.status,
        statusText: res.statusText,
        headers: headersInit,
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
          'x-request-id': responseRequestId,
        },
      })
    }

    // JSON responses
    const text = await res.text()
    return new NextResponse(text, {
      status: res.status,
      statusText: res.statusText,
      headers: {
        'content-type': 'application/json',
        'x-request-id': responseRequestId,
      },
    })
  } catch (err) {
    const timedOut = err instanceof Error && err.name === 'TimeoutError'
    return NextResponse.json(
      {
        detail: timedOut
          ? 'The backend took too long to respond.'
          : "Can't reach the backend server.",
        code: timedOut ? 'timeout' : 'server',
        request_id: requestId,
      },
      {
        status: timedOut ? 504 : 502,
        headers: { 'x-request-id': requestId },
      },
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
