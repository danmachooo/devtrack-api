# CONTEXT.md — DevTrack

> Distilled codebase reference for Codex. Read this alongside AGENTS.md before writing any code.

---

## What DevTrack Is

A TypeScript + Express 5 REST API for project delivery tracking. Internal teams use it to manage projects, sync tickets from Notion, and group them into features. Clients get read-only dashboard access via a tokenized link.

**This is a backend API only.** No frontend, no SSR, no file serving.

### User roles

| Role | Access level |
|---|---|
| `TEAM_LEADER` | Full access — org, projects, Notion, sync |
| `BUSINESS_ANALYST` | Features, tickets, client links, sync |
| `QUALITY_ASSURANCE` | Read-only internal access |
| `DEVELOPER` | Read-only internal access |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js (ESM) |
| Framework | Express 5 |
| Language | TypeScript strict, NodeNext modules |
| ORM | Prisma + PostgreSQL |
| Auth | Better Auth (email/password + org plugin) |
| Queue | BullMQ + Redis |
| Validation | Zod |
| Logging | Winston |
| Email | Nodemailer |
| Encryption | AES-256-GCM (`@node-rs/argon2` for passwords) |

### Two runtime processes

- `src/server.ts` — HTTP API
- `src/worker.ts` — background sync worker + scheduler

---

## Project Structure

```
src/
  app.ts                  # Express app setup and global middleware
  server.ts               # API process entry + graceful shutdown
  worker.ts               # Worker process entry + graceful shutdown
  routes/
    index.ts              # Central router registration under /api
  config/
    env.ts                # Zod env contract
    config.ts             # Normalized app config (always use this, never process.env)
  lib/                    # Shared integrations: auth, prisma, redis, notion, mail, encryption
  core/                   # Framework-level: middleware, errors, logger, response helper, type augmentation
  common/                 # Cross-feature auth/RBAC middleware + auth request types
  features/               # Domain features, each with route/controller/service/repo/schema
  workers/                # BullMQ queue, scheduler, worker implementation
```

### Feature folder convention

Every feature follows this exact structure:

```
src/features/<name>/
  <name>.routes.ts       # Route definitions and middleware composition
  <name>.controller.ts   # Thin request/response layer
  <name>.service.ts      # Business logic, auth checks, orchestration
  <name>.repo.ts         # Prisma queries or third-party proxy functions
  <name>.schema.ts       # Zod schemas and exported input types
```

---

## Data Models

### Role enum

```
TEAM_LEADER | BUSINESS_ANALYST | QUALITY_ASSURANCE | DEVELOPER
```

### Better Auth models

**User** — authenticated user. Has a base `role` (default `DEVELOPER` in Prisma, `TEAM_LEADER` in auth config for new signups). Active role in requests is overridden by membership role when an org is active.

**Session** — Better Auth session. Stores `activeOrganizationId` which drives org-scoped access throughout the app.

**Organization** — tenant/team. Unique `slug`.

**Member** — join between org and user. Stores `role` as string. Unique on `(organizationId, userId)`. This is the source of truth for org-scoped RBAC.

**Invitation** — org invite. Tracks `email`, `role`, `status`, `expiresAt`.

### DevTrack domain models

**Project** — client delivery project within an org.
- Stores client metadata: `clientName`, `clientEmail`
- Stores Notion config: `notionDatabaseId`, `notionToken` (encrypted), `statusMapping` JSON, `syncInterval`, `lastSyncedAt`
- Relations: features, tickets, clientAccess (1:1), syncLogs

**Feature** — ordered grouping of tickets within a project.
- Has explicit `order` field — maintained and rebalanced transactionally on insert/update/delete

**Ticket** — synced Notion page.
- Unique `notionPageId`
- Tracks `notionStatus` (raw) and `devtrackStatus` (normalized enum)
- Missing-from-source behavior: never deleted, marked with `isMissingFromSource` + `missingFromSourceAt`

**TicketStatus enum**: `TODO | IN_DEV | QA | APPROVED | RELEASED | BLOCKED`

**ClientAccess** — 1:1 per project. Unique `token`. Powers the public client dashboard route. Tracks `lastViewedAt`.

**SyncLog** — per-project sync history. Stores `status`, `ticketsAdded`, `ticketsUpdated`, `errorMessage`.

**SyncStatus enum**: `SUCCESS | FAILED | RATE_LIMITED`

---

## Request Lifecycle

```
Request
  → Global middleware (helmet, CORS, body parser, requestLogger)
  → requireAuthMiddleware       # validates session, populates req.user
  → requireRoleMiddleware(...)  # checks req.user.role against allowed roles
  → validate(schema)            # Zod parse → req.validatedBody/Params/Query
  → Controller                  # reads validated input, calls service
  → Service                     # business rules, ownership checks, orchestration
  → Repo                        # Prisma queries or Better Auth proxy
  → sendResponse(...)           # standard { statusCode, message, data } envelope
  → errorHandler                # catches thrown AppError subclasses
```

---

## Middleware Reference

### `requireAuthMiddleware`
- Calls `auth.api.getSession()`
- Reads `activeOrganizationId` from session
- Looks up `Member` record for active org
- Populates `req.user` with `{ id, email, name, role, organizationId }`
- Role comes from membership if org is active, falls back to session user role

### `requireRoleMiddleware(...roles)`
- Requires `req.user` (throws `UnauthorizedError` if missing)
- Checks `req.user.role` against allowed roles (throws `ForbiddenError` if not allowed)

### `requireClientAuthMiddleware`
- Reads validated `token` param
- Resolves `ClientAccess` record using timing-safe comparison
- Attaches `req.clientAccess = { id, projectId }`
- Entirely separate from Better Auth — no user session involved

### `validate(schema)`
- Parses `body`, `params`, `query` with Zod
- Writes results to `req.validatedBody`, `req.validatedParams`, `req.validatedQuery`
- Controllers always read from these, never from raw `req.body`

### `asyncHandler`
- Wraps controller/middleware functions so thrown errors reach `errorHandler`

---

## Auth and Organization

Better Auth is configured with:
- Prisma adapter
- Email/password login with Argon2 hashing
- Secure `SameSite=None` session cookies
- Organization plugin (creator role: `TEAM_LEADER`)
- Invitation emails via `sendOrganizationInvitationEmail`

Organization context is set via `session.activeOrganizationId`. Almost all internal operations depend on this being set. Services check for it explicitly and throw if missing.

On sign-in, the auth service auto-restores the active organization when the user belongs to exactly one org.

---

## Service Layer Responsibilities

| Layer | Responsibility |
|---|---|
| Controller | Read `req.validated*` and `req.user`, call service, return `sendResponse` |
| Service | Business rules, org ownership checks, error throwing, orchestration, response shaping |
| Repo | Prisma queries, Better Auth proxy calls — no business logic |

**Key service behaviors to preserve:**
- Always verify resource belongs to `req.user.organizationId` before acting
- Throw typed errors (`NotFoundError`, `ForbiddenError`, etc.) — never construct response objects in services
- Decrypt Notion tokens only inside service methods that need live Notion access
- Use safe project selects by default — `findProjectByIdWithSecrets` only when credentials are needed

---

## Background Sync

### Queue

- Queue name: `ticket-sync`
- Job: `sync-project-tickets` with payload `{ projectId, trigger }`
- Manual enqueue deduplicates by job ID
- Recurring schedulers upserted per project using configured `syncInterval`

### Scheduler

Runs every minute. Finds all projects with Notion credentials and upserts their schedulers. Removes stale schedulers for disconnected projects.

### Worker behavior

On each sync job:
1. Acquire Redis lock per project (skip if locked)
2. Fetch all ticket pages from Notion
3. Create new local tickets for new Notion pages
4. Update existing tickets for pages still present
5. Clear missing flags for tickets seen again
6. Mark local tickets as `isMissingFromSource` when absent from current Notion dataset
7. Update `project.lastSyncedAt`
8. Calculate project progress
9. Insert `SyncLog` with `SUCCESS`, `FAILED`, or `RATE_LIMITED`

Tickets are **never hard-deleted** during sync.

---

## Progress Calculation

Owned by a shared progress service used by project listing, project detail, and the worker.

**Overall project progress = average of feature progress values** (not a weighted ticket count percentage).

Per-feature progress counts only assigned, non-missing tickets. Completed = `APPROVED` or `RELEASED` status.

---

## Shared Utilities

| Utility | Location | Purpose |
|---|---|---|
| App config | `src/config/config.ts` | Normalized env — always use this |
| Logger | `src/core/logger/logger.ts` | Winston, writes to `logs/` |
| Error classes | `src/core/errors/` | `AppError`, `ValidationError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError` |
| Response helper | `src/core/http/` | `sendResponse({ statusCode, message, data })` |
| Encryption | `src/lib/encryption.ts` | AES-256-GCM, format: `iv:authTag:ciphertext` |
| Express types | `src/core/types/express.d.ts` | Augments `req.user`, `req.validated*` |
| Auth context type | `src/common/types/auth.type.ts` | `AuthenticatedHttpContext` for typed controllers |

---

## Environment Variables

Defined and validated in `src/config/env.ts`. Never read `process.env` directly in feature code.

| Group | Variables |
|---|---|
| App | `NODE_ENV`, `PORT`, `BASE_URL`, `LOG_LEVEL`, `TRUSTED_ORIGINS` (pipe-separated) |
| Auth | `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET` |
| Database | `DATABASE_URL` |
| Redis | `UPSTASH_REDIS_TCP_URL` (preferred), `REDIS_URL`, or `REDIS_HOST/PORT/USERNAME/PASSWORD/DB_INDEX` |
| Frontend | `FRONTEND_URL` |
| SMTP | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `SMTP_SECURE` |
| Notion crypto | `NOTION_ENCRYPTION_KEY` (min 32 chars, SHA-256 hashed to AES key) |

Note: `CORS` allows origins from `TRUSTED_ORIGINS` split on `|`. The `allowedHeaders` config currently contains `"Authorization "` with a trailing space — preserve this unless intentionally fixing it.

---

## Key Patterns to Preserve

1. **Controllers stay thin** — validated input in, service call, `sendResponse` out
2. **Business rules belong in services** — ownership checks, role enforcement beyond middleware, orchestration
3. **Persistence belongs in repos** — Prisma and Better Auth proxy mechanics stay out of services
4. **Zod everywhere** — all endpoint inputs validated via `*.schema.ts` and `validate()` middleware
5. **Typed errors, centralized handler** — throw, don't branch
6. **Always scope by org** — every internal query must verify `organizationId`
7. **RBAC declared at the router** — `requireRoleMiddleware` lives close to the route definition
8. **Standard response envelope** — always `sendResponse`, never raw `res.json`
9. **Safe selects by default** — never leak `notionToken` in normal project reads
10. **Feature order is transactional** — rebalance neighbors on insert/update/delete
11. **Tickets are never deleted** — mark missing, never remove
12. **Sync is idempotent** — deduplication at queue level, Redis lock at worker level