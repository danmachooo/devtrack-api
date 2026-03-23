# STANDARDS.md — DevTrack

> The technical quality guardrail for this codebase. Read this alongside AGENTS.md. These standards exist to prevent agentic drift — where different files end up written in different styles across sessions.

---

## TypeScript

- Strict mode is enabled. Never use `any`. Never suppress type errors with `@ts-ignore` or `as unknown as X`.
- Use `interface` over `type` for object shapes. Use `type` only for unions, intersections, or aliasing primitives.
- Named exports everywhere. No default exports — not for classes, not for functions, not for constants.
- All async functions must be explicitly typed with their return value: `async function foo(): Promise<Bar>`.
- Never use non-null assertion (`!`) unless you can prove the value is present. Prefer explicit null checks.
- Use `satisfies` for config objects where you want type-checking without widening.

---

## Async

- `async/await` only. No `.then()`, no `.catch()` chains anywhere in the codebase.
- All errors from async operations must be caught explicitly — either with `try/catch` or via `asyncHandler`.
- Never fire-and-forget async calls without handling the result or error.

---

## Naming

| Thing | Convention |
|---|---|
| Files | `kebab-case.ts` |
| Interfaces and types | `PascalCase` |
| Classes | `PascalCase` |
| Functions and variables | `camelCase` |
| Constants | `SCREAMING_SNAKE_CASE` |
| Zod schemas | `camelCase` with `Schema` suffix (e.g. `createProjectSchema`) |
| Exported input types from Zod | `PascalCase` with `Input` suffix (e.g. `CreateProjectInput`) |
| Route files | `<feature>.routes.ts` |
| Controller files | `<feature>.controller.ts` |
| Service files | `<feature>.service.ts` |
| Repo files | `<feature>.repo.ts` |
| Schema files | `<feature>.schema.ts` |

---

## Code Style

- Verbose and explicit over clever and concise. If something needs a comment to be understood, write the comment.
- No magic strings. Every string used as an identifier, status, or key must be a constant or enum value.
- No inline ternaries that span more than one line. Use an explicit `if/else` block instead.
- Destructure function parameters when there are more than two arguments.
- Keep functions short and single-purpose. If a function needs a large comment block to explain what it does, it probably needs to be split.

---

## Error Handling

- Services and middleware throw typed errors from `src/core/errors/`. Never construct `res.json({ error: ... })` manually inside a controller.
- The error classes to use:
  - `AppError` — generic, takes a status code and message
  - `ValidationError` — for malformed input (400)
  - `UnauthorizedError` — for missing or invalid auth (401)
  - `ForbiddenError` — for insufficient role (403)
  - `NotFoundError` — for missing resources (404)
- Never let Prisma errors reach the client. Catch `PrismaClientKnownRequestError` and map to the appropriate typed error.
- Never expose stack traces in API responses.

---

## Validation

- All route inputs are validated with Zod schemas defined in `*.schema.ts` files.
- The `validate(schema)` middleware populates `req.validatedBody`, `req.validatedParams`, and `req.validatedQuery`.
- Controllers always read from `req.validated*`. Never read from `req.body`, `req.params`, or `req.query` directly.
- Zod schemas should be strict — use `.strict()` on object schemas to reject unknown keys unless there is a deliberate reason not to.

---

## API Responses

- Always use `sendResponse` from `src/core/http/`.
- Response shape is always: `{ statusCode, message, data? }`.
- Never use `res.json(...)` or `res.send(...)` directly in controllers.
- `data` should be a plain object or array — never a raw Prisma model with sensitive fields included.
- Omit `data` entirely when there is nothing meaningful to return (e.g. delete operations).

---

## Prisma and Database

- All queries must be scoped by `organizationId`. Never return cross-org data.
- Use parameterized queries. Never string-interpolate user input into raw SQL.
- Use transactions (`prisma.$transaction`) whenever multiple writes must be atomic.
- Handle `PrismaClientKnownRequestError` explicitly — map error codes to typed app errors:
  - `P2002` → resource already exists (409)
  - `P2025` → record not found (404)
- Normal project reads must use safe selects that omit `notionToken`. Only `findProjectByIdWithSecrets` may include it.
- After any schema change, always run `npx prisma generate` before running migrations.

---

## Logging

- Use the Winston logger from `src/core/logger/logger.ts`. Never use `console.log` in production paths.
- Log levels:
  - `logger.error` — unrecoverable errors, unexpected failures
  - `logger.warn` — recoverable issues, degraded behavior
  - `logger.info` — significant lifecycle events (server start, job completion)
  - `logger.debug` — detailed tracing for development only
- Never log secret values, tokens, passwords, or encryption keys. Mask them before logging.

---

## Environment and Config

- All env var access goes through `src/config/config.ts`. Never read `process.env` directly in feature code.
- Env vars are validated at startup by `src/config/env.ts` using Zod. If a required var is missing, the process should fail fast with a clear error.
- When adding a new env var, add it to both `env.ts` (Zod schema) and `config.ts` (normalized export), and document it in `CONTEXT.md`.

---

## Security

- Notion tokens must be encrypted before storage using `src/lib/encryption.ts` (AES-256-GCM).
- Decrypt Notion tokens only inside service methods that need live Notion access.
- Client dashboard tokens must be compared using `timingSafeEqual` — never with `===`.
- Auth session cookies are `SameSite=None` and `Secure`. Do not change these settings.
- CORS trusted origins come from config. Never hardcode origins or allow `*` in production.

---

## Middleware Composition Order

When composing middleware on a route, always apply in this order:

1. `requireAuthMiddleware` (if internal route)
2. `requireRoleMiddleware(...roles)` (if role-gated)
3. `validate(schema)` (if input validation needed)
4. Controller handler wrapped in `asyncHandler`

For client routes:

1. `validate(schema)` (for token param)
2. `requireClientAuthMiddleware`
3. Controller handler wrapped in `asyncHandler`

---

## What to Avoid

- Default exports
- `.then()` chains
- `console.log` in any non-throwaway code
- `any` type
- Non-null assertions without proof
- Reading `process.env` directly in feature code
- Raw `res.json(...)` in controllers
- Prisma queries in service files
- Business logic in controller files
- Leaking `notionToken` in project reads
- Hard-deleting tickets during sync
- Unsynchronized feature order mutations