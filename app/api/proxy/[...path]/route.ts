import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

/** Paths that return binary data (not JSON). */
const BINARY_PREFIXES = ['/audio/']

function isBinary(pathname: string): boolean {
  return BINARY_PREFIXES.some((p) => pathname.startsWith(p))
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

  const binary = isBinary(pathname)
  if (!binary) {
    headers.set('content-type', 'application/json')
  }

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
      return new NextResponse(arrayBuffer, {
        status: res.status,
        statusText: res.statusText,
        headers: {
          'content-type': contentType,
          'content-length': res.headers.get('content-length') || String(arrayBuffer.byteLength),
          'accept-ranges': 'bytes',
          'cache-control': 'public, max-age=86400',
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