# Identity & Auth Hardening — Locked Plan

> Status: **Locked for later execution.** Decision-backed record of the identity
> hardening and related infrastructure decisions. Phase 1 is the critical path;
> Phases 2–3 are optional/deferred. Companion docs:
> `FRONTEND_REVIEW_IMPROVEMENTS.md`, `EXERCISE_HISTORY_DECISIONS.md`.

## Decisions (locked)

| # | Decision | Choice |
|---|---|---|
| 1 | Identity model | `account_id` UUID keyed on `(provider, provider_sub)`; **email = data, not identity** |
| 2 | Accounts storage | Split `accounts` + `account_providers` from day one (one account → many login methods) |
| 3 | Cross-provider login | Per-provider accounts for now; **no auto-merge by raw email** |
| 4 | Linking | Bundle the **logic** (auto-link + explicit-connect); UI deferred |
| 5 | Security boundary | **GitHub never auto-links** (unverified email); Google auto-links only on provider-verified email |
| 6 | Settings page / UI | **Deferred** until real accounts exist |
| 7 | Legacy data | **Wipe** email-keyed sessions (fresh start, no backfill) |
| 8 | Secrets | `AUTH_SECRET` only on both sides; drop `NEXTAUTH_SECRET` fallback |
| 9 | Package manager | Stay on **npm**; delete dead `pnpm.overrides`; `npm audit fix` |
| 10 | DB strategy | **SQLite local dev / Postgres cloud** via SQLAlchemy (async) abstraction |
| 11 | Hosting | Stay **lightweight** (Railway + managed Postgres); big-cloud deferred |
| 12 | Deploy order | Backend before frontend; same fresh `AUTH_SECRET` on both |
| 13 | Deferred features | Settings UI, exercise history, email+password signup |

---

## Phase 1 — Identity & Auth Foundation (CRITICAL)

**Goal:** replace email-based identity with a stable, system-minted `account_id`
UUID keyed on `(provider, provider_sub)`. Email becomes a stored field, never
the identity/ownership key.

### Backend

1. **DB layer** — adopt **SQLAlchemy (async)** as the abstraction so the same
   code path runs on **SQLite (local dev)** and **Postgres (cloud)**. One code
   path, both environments; avoid writing DB access twice.
2. **Schema** — `accounts` + `account_providers` (split):
   - `accounts(account_id PK, email, created_at, updated_at)`
   - `account_providers(account_id FK ON DELETE CASCADE, provider, provider_sub, created_at)`
   - `UNIQUE(provider, provider_sub)` (a provider id is never double-linked)
   - `PRIMARY KEY(account_id, provider)` (one method per provider per account)
   - Email stored as data; **no uniqueness on email**.
3. **Resolver** — `find_account_by_provider`, `find_account_by_email`,
   `create_account`, `link_provider` (double-link guard) →
   `get_or_create_account(provider, provider_sub, email, email_verified) -> account_id`.
   Keep `INSERT ... ON CONFLICT DO NOTHING` (supported on both SQLite + Postgres).
4. **Endpoint** — `POST /auth/account` (intentional bootstrap; NOT behind
   `CurrentUser` — chicken-and-egg). Returns `{ "account_id": ... }`. Field
   length caps; inherit `extra="forbid"`.
5. **Tighten `_user_id`** — read `sub` only; raise 401 on missing (verified:
   maps cleanly via the global `TutorError` handler).
6. **Remove `NEXTAUTH_SECRET` fallback** in `config.auth_secret()` →
   `os.getenv("AUTH_SECRET", "")`; update `.env.example`.
7. **Wipe** legacy email-keyed `sessions` rows (fresh start; no backfill).
8. **Tests** — idempotency + race/`ON CONFLICT`; `resolve_login` cases;
   missing-`sub` → 401; fallback-removal test updated to expect failure.

### Frontend

1. `lib/auth/index.ts` — expose `provider` + `providerSub` on the session via a
   custom `accountId` claim (do **not** clobber NextAuth's internal `sub`);
   extend the `Session.user` type.
2. `app/api/auth/token/route.ts` — resolve `account_id` via proxy `/auth/account`
   (cached in session after first call); mint `sub = account_id`.
3. Update `FRONTEND_REVIEW_IMPROVEMENTS.md` identity/contract table.
4. **Tests** — token route `sub` == resolved `account_id`; missing provider → 401.
5. **No changes** to chat/SSE/audio/session-hydration/proxy/API client
   (verified: `session.user.id` is consumed only in the token route).

### Linking logic (bundled, logic-only this phase)

- **Auto-link (Half B):** link only on a provider-verified email
  (`email_verified: true`) — **Google only**. **GitHub never auto-links**
  (security boundary — GitHub does not verify email). No match → new account.
- **Explicit connect (Half A, logic only):** `link_provider` with double-link
  guard. Frontend "Connect" trigger deferred to Phase 3 (settings UI).
- **Ambiguous-login prompt** (thin, ships now): when login can't safely auto-link
  but the email matches — "This email already has an account" (no linking performed).

**Why the security boundary matters:** makes the login resolution independent
of the fragile, mutable email, so an attacker presenting a victim's email via
an unverified provider (e.g. GitHub) cannot take over their sessions. Two
sign-ins with the same email but different providers are separate accounts
until explicit linking is built.

---

## Phase 2 — Housekeeping, DB, Hosting

### Dependency & secrets cleanup
- Delete the dead `pnpm.overrides` block from `package.json`; run
  `npm audit fix`; re-run `tsc` / `lint` / `test` / `build` green. **Stay on npm.**
- Generate one fresh `AUTH_SECRET`; set the **same value** on Vercel + Railway;
  **delete any `NEXTAUTH_SECRET`** from both dashboards.
- Deploy **backend before frontend**.

### DB strategy (locked direction)
- **SQLite for local dev; Postgres for cloud** via the SQLAlchemy abstraction
  (one code path, no drift). Add a **Postgres CI check** — treat Postgres as
  the source of truth (SQLite is more lenient; catch strictness early).
- Migration note: `INSERT ... ON CONFLICT DO NOTHING` works on both; SQLite
  `PRAGMA` statements (WAL, busy_timeout, foreign_keys) are SQLite-only and are
  dropped for the Postgres path (Postgres has MVCC/WAL built in).
- **Postgres hosting (decision-pending):** Railway Postgres (same region) =
  *default*; Neon (serverless/branching/pooling); Render; or Postgres in the
  Docker Compose stack / DO-Hetzner Managed DB (VPS route). Connection pooling
  via the app pool (asyncpg/SQLAlchemy) or the provider's pooler if serverless.

### Hosting co-location (decision-pending) — NOT big-cloud yet
- **Stance:** stay lightweight — Railway (backend + same-region managed
  Postgres). Real-world experience confirms the common case: delay was
  insignificant, UX was good. Big-cloud (AWS/GCP/Azure) is deferred as a
  **non-breaking repoint** later (same containers + `DATABASE_URL` swap).
- **Google GenAI is not a latency factor** — model generation time dominates
  (hundreds of ms to seconds), dwarfing the sub-ms-to-low-ms network hop.
  GCP hosting only matters later if adopting **Vertex AI** for IAM/regional
  tooling (auth/integration reasons, not speed).

---

## Phase 3 — Deferred (not committed)

1. **Settings page / UI** — explicit provider-connect + connected-methods view
   (build once real accounts exist).
2. **Exercise history** feature — now cleanly account-keyed; use
   `EXERCISE_HISTORY_DECISIONS.md`.
3. **Email+password** signup — add `account_credentials(account_id, password_hash)`
   and email-backed linking (verified, user-initiated). Same-person linking
   across all methods happens only via this explicit mechanism.

---

## Acceptance criteria (done = all green)

1. Fresh Google login → creates an account; `/auth/account` returns a stable
   `account_id`; **re-login returns the same UUID**.
2. A second user → different UUID; cross-user session access → 403.
3. Google email change → same account (email just updates); history persists.
4. GitHub login → **new account, never auto-linked** to an existing email account.
5. Explicit connect to an already-linked provider → **refused**.
6. Token: missing `sub` / wrong secret / expired / wrong alg → 401.
7. Frontend: `tsc`, `lint`, `test`, `build` green. Backend: tests green.
8. Legacy email-keyed rows wiped.
9. Same code path verified against SQLite (local) + Postgres (CI/cloud).

---

## Execution order

- **Phase 1 first** (identity + linking logic + SQLAlchemy + wipe + tests) —
  closes the auth risk and is the cheap migration-cost window.
- **Then Phase 2** (cleanup, secrets, Postgres wiring, hosting decision).
- **Phase 3** when/if desired (settings UI → exercise history → email+password).