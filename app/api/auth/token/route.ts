import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { SignJWT } from 'jose'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Keep this signing contract aligned with FastAPI: AUTH_SECRET + HS256 + exp.
  const configuredSecret = process.env.AUTH_SECRET
  if (!configuredSecret) {
    return NextResponse.json({ detail: 'Authentication is not configured.', code: 'auth_configuration_error' }, { status: 500 })
  }
  const secret = new TextEncoder().encode(configuredSecret)
  const token = await new SignJWT({
    sub: session.user.id,
    email: session.user.email || '',
    name: session.user.name || '',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(secret)

  return NextResponse.json({ token })
}
