import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { SignJWT } from 'jose'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Build a JWT the backend can verify with the same AUTH_SECRET
  const secret = new TextEncoder().encode(process.env.AUTH_SECRET!)
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