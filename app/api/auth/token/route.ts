import { NextResponse } from 'next/server'

/**
 * Security: This endpoint is retired.
 *
 * Backend JWTs are now minted exclusively on the server by the API proxy route
 * (`app/api/proxy/[...path]`), preventing raw bearer tokens from ever being
 * exposed to or stored in client-side JavaScript.
 */
export async function GET() {
  return NextResponse.json(
    { detail: 'Endpoint retired for security. Backend JWTs are managed server-side by the API proxy.' },
    { status: 410 },
  )
}
