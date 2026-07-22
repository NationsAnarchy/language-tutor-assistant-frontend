import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params
  const pathname = '/' + path.join('/')
  const search = request.nextUrl.search
  const url = `${BACKEND_URL}${pathname}${search}`

  // Forward the Authorization header if present
  const headers = new Headers()
  const auth = request.headers.get('authorization')
  if (auth) headers.set('authorization', auth)
  headers.set('content-type', 'application/json')

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers,
    })
    const body = await res.text()
    return new NextResponse(body, {
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params
  const pathname = '/' + path.join('/')
  const search = request.nextUrl.search
  const url = `${BACKEND_URL}${pathname}${search}`

  const headers = new Headers()
  const auth = request.headers.get('authorization')
  if (auth) headers.set('authorization', auth)
  headers.set('content-type', 'application/json')

  try {
    const body = await request.text()
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body,
    })
    const responseBody = await res.text()
    return new NextResponse(responseBody, {
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params
  const pathname = '/' + path.join('/')
  const search = request.nextUrl.search
  const url = `${BACKEND_URL}${pathname}${search}`

  const headers = new Headers()
  const auth = request.headers.get('authorization')
  if (auth) headers.set('authorization', auth)
  headers.set('content-type', 'application/json')

  try {
    const body = await request.text()
    const res = await fetch(url, {
      method: 'PATCH',
      headers,
      body,
    })
    const responseBody = await res.text()
    return new NextResponse(responseBody, {
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params
  const pathname = '/' + path.join('/')
  const search = request.nextUrl.search
  const url = `${BACKEND_URL}${pathname}${search}`

  const headers = new Headers()
  const auth = request.headers.get('authorization')
  if (auth) headers.set('authorization', auth)
  headers.set('content-type', 'application/json')

  try {
    const res = await fetch(url, {
      method: 'DELETE',
      headers,
    })
    const body = await res.text()
    return new NextResponse(body, {
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