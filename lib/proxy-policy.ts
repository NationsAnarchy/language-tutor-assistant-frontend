/**
 * Path policy for the same-origin backend proxy (`app/api/proxy/[...path]`).
 *
 * The proxy exists to avoid CORS between the Vercel frontend and the backend.
 * Without an explicit allowlist it also acts as an open relay: any path,
 * method, and `Authorization` header a caller supplies gets forwarded to the
 * backend from a trusted origin.
 *
 * Kept in its own module (no `next/server` or NextAuth imports) so the policy
 * is unit-testable.
 */

/** Paths that return binary data rather than JSON. */
const BINARY_PREFIXES = ['/audio/']
const BINARY_POST_PATTERNS = [/^\/session\/[^/]+\/tts$/]

/** Paths that return Server-Sent Events (`text/event-stream`). */
const SSE_PATHS = ['/chat']

/** Endpoints the frontend actually calls. Anything else is refused. */
const ALLOWED_PATHS: RegExp[] = [
  /^\/sessions$/, // GET  — list the user's conversations
  /^\/session$/, // POST — create a conversation
  /^\/session\/[^/]+$/, // GET / PATCH / DELETE — read, rename, delete
  /^\/session\/[^/]+\/tts$/, // POST — synthesize speech
  /^\/chat$/, // POST — streaming chat
  /^\/audio\/[A-Za-z0-9._-]+$/, // GET  — cached MP3 replay
]

/**
 * Endpoints reachable without a session.
 *
 * In Phase 4, audio replay requires authentication. The proxy mints a backend JWT
 * from the NextAuth session when the browser's <audio> element requests an audio URL.
 */
const PUBLIC_PATHS: RegExp[] = []

export function isAllowedProxyPath(pathname: string): boolean {
  return ALLOWED_PATHS.some((pattern) => pattern.test(pathname))
}

export function isPublicProxyPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((pattern) => pattern.test(pathname))
}

export function isBinaryProxyPath(pathname: string, method: string): boolean {
  if (BINARY_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return true
  return method === 'POST' && BINARY_POST_PATTERNS.some((pattern) => pattern.test(pathname))
}

export function isSseProxyPath(pathname: string): boolean {
  return SSE_PATHS.includes(pathname)
}
