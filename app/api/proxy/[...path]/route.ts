import { NextRequest } from 'next/server'
import { proxyBackendRequest } from '@/lib/server/backend-proxy'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params
  const pathname = '/' + path.join('/')
  return proxyBackendRequest(request, pathname)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params
  const pathname = '/' + path.join('/')
  return proxyBackendRequest(request, pathname)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params
  const pathname = '/' + path.join('/')
  return proxyBackendRequest(request, pathname)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params
  const pathname = '/' + path.join('/')
  return proxyBackendRequest(request, pathname)
}
