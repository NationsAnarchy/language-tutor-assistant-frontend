# Language Tutor Assistant Frontend

## Tooling

- Use npm. Keep `package-lock.json` in sync; do not introduce another package manager or lockfile.
- Run `npm test` for Vitest tests and `npm run lint` before handing off changes.
- Run `npx tsc --noEmit` for a TypeScript check.
- Use `npm run build -- --webpack` for production-build verification. The default Turbopack build can retain a stale `.next/lock` in this environment.

## Client boundaries

- Keep `@/lib/api` as the public API façade. Endpoint-specific code belongs in `lib/api/client.ts`, `lib/api/sessions.ts`, or `lib/api/chat.ts`; shared error behavior belongs in `lib/api/errors.ts`.
- Convert backend session data through `hydrateChatSession`; do not duplicate language, level, or history fallback rules in page and navigation code.
- Keep chat submission state transitions in `components/chat/use-chat-workflow.ts`. Presentation components should own only UI-specific state.
- Preserve request cancellation and stale-operation guards when changing session or streaming behavior.

## Testing

- Keep most tests in Vitest's Node environment. Browser-hook tests use a per-file jsdom environment declaration.
- Add focused regressions for API/error mapping and state transitions when changing client-boundary behavior.

## Scope

- The worktree may contain unrelated user changes. Do not revert or reformat files outside the requested scope.
