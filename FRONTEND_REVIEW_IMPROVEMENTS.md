# Frontend Review Improvements and Backend-Integration Impact

## Purpose

This document records the recommended improvements identified during the
frontend review, their priority, and whether each item affects the contract
between the Next.js frontend and the FastAPI backend project
(`language-tutor-assistant-backend`).

The browser-facing architecture is intentionally a backend-for-frontend (BFF):

```text
Browser -> Next.js /api/proxy/* -> FastAPI backend
```

Browsers do not call FastAPI directly. The Next.js proxy relays the allowed
request headers and streams or returns the upstream response without changing
the backend route contract.

## Integration Contract Baseline

The following existing cross-project contracts must remain compatible:

| Area | Frontend responsibility | Backend responsibility |
| --- | --- | --- |
| Service location | Server-only `BACKEND_URL` points to FastAPI. | Serve the existing API routes. |
| Authentication | `GET /api/auth/token` mints a one-hour HS256 JWT using `AUTH_SECRET`; the proxy forwards it as `Authorization: Bearer <token>`. | Verify HS256 signature and expiration with the same `AUTH_SECRET`. |
| Identity | JWT supplies `sub`, derived from the signed-in user email. | Scope all session access to `user_id == sub`. |
| Session data | Request `/session/{id}`, `/sessions`, and mutations through `/api/proxy/*`. | Maintain the current JSON schemas and ownership checks. |
| Chat | Relay `POST /chat` as an unbuffered SSE response. | Emit `data: { ... }` SSE events with `token`, `done`, and `error` types. |
| Audio | Relay TTS binary responses and cached-audio routes. | Continue returning the documented TTS/audio response headers and payloads. |

## Priority 0 — Resolve Production Dependency Vulnerabilities

### Recommendation

Update `next` from `16.2.6` to a patched release, at least `16.3.0`, and move
from `next-auth@5.0.0-beta.31` to a patched Auth.js-compatible release. After
choosing versions, regenerate the lockfile and run the complete validation
suite.

The original production audit reported 12 vulnerabilities: 2 critical, 7 high,
and 3 moderate. These should be addressed before feature or UX work.

### Backend impact: **Yes — integration validation required; API changes are not automatically expected**

The FastAPI project does not import Node packages, so changing Next.js or
Auth.js does not directly change backend dependencies or route definitions.
However, the Auth.js upgrade is cross-project sensitive because login and the
frontend session are prerequisites for minting the token consumed by FastAPI.

The present custom token bridge is:

1. The signed-in Auth.js session provides `session.user.id`.
2. `GET /api/auth/token` creates an independent one-hour JWT with `jose`,
   `alg: HS256`, `sub`, `email`, `name`, `iat`, and `exp`.
3. The BFF forwards that JWT to FastAPI as a bearer token.
4. FastAPI verifies it with PyJWT using `algorithms=["HS256"]` and verifies
   `exp` using the shared `AUTH_SECRET` (with the backend's legacy
   `NEXTAUTH_SECRET` fallback).

Therefore, preserve the token route and validate the following after the
upgrade:

- Google and GitHub sign-in produce a usable frontend session.
- `session.user.id` remains present and stable for the same user.
- `/api/auth/token` returns a token that FastAPI accepts.
- Missing, expired, mismatched-secret, and non-HS256 tokens remain rejected by
  FastAPI with HTTP 401.
- Protected proxied requests (`/session`, `/sessions`, `/chat`, TTS, and
  mistakes) still succeed for the authenticated owner and fail for unauthenticated
  requests.
- Sign-out and Auth.js session expiration stop access to the token endpoint and
  protected backend routes.

### Implementation checklist

- [ ] Choose patched versions compatible with React 19 and the existing
      Next.js App Router setup.
- [ ] Update `package.json` and the package-manager lockfile.
- [ ] Run `npm audit --omit=dev` and record any accepted residual advisories.
- [ ] Run frontend lint, typecheck, tests, and a production webpack build.
- [ ] Run the backend test suite with its required test configuration.
- [ ] Manually complete the cross-project authentication matrix above.

## Priority 1 — Prevent Stale Session Data and Navigation Races

### Recommendation

Keep cached session data for immediate rendering, then call
`refreshSessionInBackground(sessionId)` to revalidate it. Apply the refreshed
result only if the requested session is still the active session when the
request completes. Add tests for cache expiry, refresh behavior, and switching
between sessions while a prior request is unresolved.

Currently `lib/api/sessions.ts` uses a 30-second in-memory cache for individual
sessions and `refreshSessionInBackground()` already fetches and updates a cache
entry. The chat session loader renders the cached value via `getSession()`, but
does not currently use the refresh helper.

### Backend impact: **No API/schema change; increased read traffic**

This change uses the existing authenticated `GET /session/{session_id}` route
and `SessionDetailResponse` schema. It requires no FastAPI route, database, or
authentication change.

The backend consideration is operational: each active-session load can add one
revalidation read. Confirm that this request pattern is acceptable for the
SQLite deployment and that the existing ownership check remains in place. The
backend already loads the session and verifies `session["user_id"]` matches the
JWT subject before returning its contents, so it remains the authorization
authority for every revalidation.

### Required race-safety rules

- [ ] Capture the session ID for each load/refresh request.
- [ ] Before hydrating UI state from an asynchronous result, confirm that the
      captured ID still equals the current requested/active session ID.
- [ ] Ignore late responses for a session the user has navigated away from.
- [ ] Do not let a background refresh replace locally active streaming chat
      state with an older server snapshot.
- [ ] Retain existing 404 behavior: redirect to `/language` only when the
      still-current session load returns 404.

### Test coverage

- [ ] Fresh cache returns immediately and triggers one background request.
- [ ] Expired or absent cache blocks only for the required foreground request.
- [ ] Background success updates the cache and current matching UI state.
- [ ] Background failure leaves currently displayed cached content intact.
- [ ] Session A's late load/refresh cannot overwrite Session B after navigation.
- [ ] A completed chat or TTS operation cannot display content/audio in a newly
      selected session.

## Priority 2 — Maintain the Existing BFF and Token Boundary

### Recommendation

Keep all browser API calls on same-origin `/api/proxy/*` routes, keep
`BACKEND_URL` server-only, and preserve the proxy's strict origin/path and
header allowlists. Treat modifications to token minting, proxy forwarding, or
FastAPI authentication as coordinated cross-project changes.

### Backend impact: **Yes — this is the core cross-project contract**

No change is required merely to retain the current design. Any future change to
one of the following needs synchronized frontend and backend work:

- JWT signing secret, signing algorithm, claims, issuer/audience requirements,
  or token lifetime;
- bearer-token header format;
- proxied path/method allowlist;
- session identity mapping (`sub`/email to backend `user_id`);
- SSE event schema or response header behavior;
- backend URL, deployment topology, or CORS configuration if direct browser
  access is ever introduced.

For the current BFF deployment, FastAPI CORS is not on the normal browser
request path because the browser calls Next.js. It still matters for local
development, diagnostics, or any intentional direct FastAPI consumer, and must
contain the deployed frontend origin when applicable.

## Priority 3 — General Correctness, Security, and Maintainability Follow-up

Work through the remaining review recommendations with correctness and security
ahead of UX and performance refinements. For every change, classify it before
implementation:

| Change category | Likely backend impact | Required action |
| --- | --- | --- |
| Pure React presentation, accessibility, local state, or styling | No | Frontend tests and visual/manual verification. |
| Client cache, request ordering, or retry behavior using unchanged endpoints | Usually no | Confirm request volume/error behavior; add race tests. |
| API payload shape, endpoint, HTTP method, or response parsing | Yes | Update FastAPI schema/handler and both projects' tests together. |
| Authentication/session/token/proxy behavior | Yes | Validate the complete JWT and protected-route matrix. |
| Streaming, TTS, cached audio, or error envelope behavior | Yes | Validate SSE/binary forwarding and backend response contracts. |
| Database/session persistence semantics | Usually yes | Update backend persistence/migrations and frontend types/UI together. |

## Cross-Project Validation Matrix

Run this matrix after dependency upgrades and after any integration-affecting
change:

1. Configure the same non-empty `AUTH_SECRET` in both projects and configure
   the frontend's server-only `BACKEND_URL` to the FastAPI origin.
2. Start FastAPI and Next.js, then sign in through both Google and GitHub.
3. Request `/api/auth/token` while signed in; submit that bearer token to a
   protected FastAPI endpoint and confirm it is accepted.
4. Confirm invalid, expired, wrong-secret, and wrong-algorithm tokens are
   rejected by FastAPI.
5. Create, list, load, rename, and delete an owned session through the Next.js
   proxy; confirm another identity cannot load it.
6. Send a chat message and confirm token/done/error SSE handling is preserved
   end to end without proxy buffering.
7. Generate TTS and reload cached audio through the proxy.
8. Switch sessions during a pending session load, chat stream, and TTS request;
   confirm no stale UI, text, or audio is applied.
9. Sign out or wait for session/token expiration; confirm protected access is
   denied and the frontend recovers cleanly.

## Current Conclusion

- The session stale-data mitigation is safe to implement without changing the
  FastAPI API, provided it keeps the existing session response contract and
  guards against client-side navigation races.
- The Next.js upgrade should not itself require backend code changes, but it
  requires full BFF and OAuth regression testing.
- Replacing/upgrading the vulnerable Auth.js beta has a material integration
  risk because it may change frontend session behavior. The custom HS256 token
  route isolates FastAPI from Auth.js's own session-cookie/JWT format, so the
  backend should remain compatible if that token route's claims, secret,
  algorithm, and expiration behavior are preserved.