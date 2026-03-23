# DevTrack API Understanding

## What This Project Is

This repository is a TypeScript + Express API for a product called DevTrack. It is built for internal teams and their clients.

The core product flow looks like this:

- Internal users sign up and sign in with Better Auth.
- Users belong to organizations and operate inside an active organization context.
- Organizations create projects for client work.
- Each project can be broken into ordered features.
- A project can be connected to a Notion database.
- Ticket data is synced from Notion into the local database.
- Internal users organize synced tickets under features and monitor sync health.
- Clients get read-only dashboard access through a per-project tokenized link.

The intended users appear to be:

- Team leaders who manage organizations, projects, Notion connections, and membership.
- Business analysts and QA/developers who need visibility into project progress and ticket grouping.
- External clients who only need a dashboard view of project progress and recent sync activity.

This is not just a generic scaffold anymore, even though `package.json` still describes it that way. The real domain is project delivery tracking with Notion-backed ticket sync and client visibility.

## Tech Stack and Runtime Shape

- Express 5 is the HTTP framework.
- TypeScript is compiled with `module`/`moduleResolution` set to `NodeNext`.
- Prisma targets PostgreSQL.
- Better Auth handles email/password auth and organization features.
- BullMQ + Redis handle background ticket sync jobs and recurring schedulers.
- Nodemailer sends organization invitation emails.
- Zod validates env vars and request input.
- Winston handles request and application logging.

There are two runtime entrypoints:

- `src/server.ts` starts the HTTP API.
- `src/worker.ts` starts the background sync worker and scheduler refresher.

## Project Structure

- `src/app.ts`: Express app setup and global middleware.
- `src/server.ts`: API process bootstrap and graceful shutdown.
- `src/worker.ts`: worker process bootstrap and graceful shutdown.
- `src/routes/index.ts`: central API router registration.
- `src/config/*`: env parsing and normalized config object.
- `src/lib/*`: shared integrations for auth, Prisma, Redis, Notion, mail, encryption.
- `src/core/*`: framework-level middleware, errors, logger, shared HTTP helpers, type augmentation.
- `src/common/*`: cross-feature auth/RBAC middleware and shared auth request types.
- `src/features/*`: each domain feature organized by route/controller/service/repo/schema.
- `src/workers/*`: BullMQ queue, scheduler refresh, and worker implementation.

The feature folders follow a consistent pattern:

- `*.routes.ts`: route definitions and middleware composition.
- `*.controller.ts`: thin request/response layer.
- `*.service.ts`: business rules, authorization checks, orchestration.
- `*.repo.ts`: data access or third-party proxy logic.
- `*.schema.ts`: Zod request validation and exported input types.

## Prisma Data Model

### Role enum

`Role` is the app-wide user/member role enum:

- `TEAM_LEADER`
- `BUSINESS_ANALYST`
- `QUALITY_ASSURANCE`
- `DEVELOPER`

### Better Auth / organization models

#### User

Represents an authenticated user.

- Primary key: `id`
- Unique: `email`
- Has a default app-level `role` enum value of `DEVELOPER`
- Relations:
  - one-to-many `sessions`
  - one-to-many `accounts`
  - one-to-many `projects` through `createdBy`
  - one-to-many `memberships`
  - one-to-many `invitationsSent`

Important nuance: the user has a base `role`, but the active role used in requests is overridden by membership role when an active organization exists.

#### Session

Better Auth session row.

- Belongs to one `user`
- Stores `token`, `expiresAt`, request metadata, and optional `activeOrganizationId`
- `token` is unique

`activeOrganizationId` is central to the app because many API operations depend on the selected organization context.

#### Account

Better Auth account/provider row.

- Belongs to one `user`
- Supports provider metadata plus optional password fields

#### Verification

Generic Better Auth verification records.

- Indexed by `identifier`

#### Organization

Represents a tenant/team.

- Unique `slug`
- Optional `logo` and `metadata`
- Relations:
  - one-to-many `members`
  - one-to-many `invitations`
  - one-to-many `projects`

#### Member

Join model between `Organization` and `User`.

- Contains `role` as a string
- Unique composite key on `(organizationId, userId)`
- Many-to-one to `organization`
- Many-to-one to `user`

This is the organization-scoped RBAC record.

#### Invitation

Organization invitation record.

- Belongs to one `organization`
- Belongs to one `inviter` user
- Tracks `email`, `role`, `status`, and `expiresAt`

### DevTrack domain models

#### Project

Represents a client-facing delivery project within an organization.

- Belongs to one `organization`
- Belongs to one `createdBy` user
- Stores client metadata: `clientName`, `clientEmail`
- Stores Notion integration info:
  - `notionDatabaseId`
  - `notionToken` (encrypted before storage)
  - `statusMapping` JSON
  - `syncInterval`
  - `lastSyncedAt`
- Relations:
  - one-to-many `features`
  - one-to-many `tickets`
  - one-to-one `clientAccess`
  - one-to-many `syncLogs`

#### Feature

Represents an ordered grouping of tickets inside a project.

- Belongs to one `project`
- Has numeric `order`
- One-to-many `tickets`

Feature order is maintained explicitly and rebalanced in repo transactions.

#### Ticket

Represents a synced Notion page normalized into a project ticket.

- Unique `notionPageId`
- Belongs to one `project`
- Optionally belongs to one `feature`
- Tracks both:
  - `notionStatus` raw external status
  - `devtrackStatus` normalized internal enum
- Also stores `assigneeName`, `notionUpdatedAt`, `syncedAt`
- Tracks source drift with:
  - `isMissingFromSource`
  - `missingFromSourceAt`

If a ticket disappears from the current Notion dataset, it is not deleted. It is marked missing.

#### TicketStatus enum

Internal normalized workflow status:

- `TODO`
- `IN_DEV`
- `QA`
- `APPROVED`
- `RELEASED`
- `BLOCKED`

#### ClientAccess

One-to-one client dashboard access record for a project.

- Unique `token`
- Unique `projectId`
- Tracks `lastViewedAt`

This powers the read-only client dashboard route.

#### SyncLog

Per-project sync history.

- Belongs to one `project`
- Stores `status`, `ticketsAdded`, `ticketsUpdated`, optional `errorMessage`

#### SyncStatus enum

- `SUCCESS`
- `FAILED`
- `RATE_LIMITED`

## Express App Structure

### Global app setup

`src/app.ts` applies middleware in this order:

- `helmet()`
- `cors(...)`
- `express.json()`
- `requestLogger`
- `/health` route
- `/api` router
- `errorHandler`

Notes:

- CORS origins come from `TRUSTED_ORIGINS`, split on `|`.
- CORS credentials are enabled.
- Allowed methods are hardcoded to common REST verbs.
- `allowedHeaders` currently includes `"Authorization "` with a trailing space, which is worth preserving carefully unless intentionally fixing it later.

### Route registration

All API routes are registered in `src/routes/index.ts` under `/api`.

- `/api/auth` -> `authRouter`
- `/api/org` -> `organizationRouter`
- `/api/client` -> `clientRouter`
- `/api/projects` -> `requireAuthMiddleware` then project router
- `/api/projects/:projectId/features` -> `requireAuthMiddleware` then nested feature router
- `/api/projects/:id/notion` -> `requireAuthMiddleware` then notion router
- `/api/projects/:id/sync` -> `requireAuthMiddleware` then sync log router
- `/api/projects/:id/tickets` -> `requireAuthMiddleware` then nested ticket router
- `/api/features` -> `requireAuthMiddleware` then feature router
- `/api/tickets` -> `requireAuthMiddleware` then ticket router

Pattern: auth is often applied at the router mount level, then finer RBAC is applied inside the feature router.

## Middleware Model

### Global middleware

- `requestLogger`: logs method, URL, response status, and duration after response finishes.
- `errorHandler`: converts known app errors into standard API responses and logs unexpected failures.

### Validation middleware

`src/core/middleware/validate.ts` parses `body`, `params`, and `query` with Zod and writes results onto:

- `req.validatedBody`
- `req.validatedParams`
- `req.validatedQuery`

Controllers rely on these validated fields rather than raw request input.

### Async wrapper

`asyncHandler` wraps controller and middleware functions so thrown/rejected errors reach Express error handling.

### Auth middleware

`requireAuthMiddleware`:

- calls `auth.api.getSession(...)`
- disables Better Auth cookie cache for freshness
- reads `activeOrganizationId` from the session
- looks up the matching `Member` record when there is an active org
- populates `req.user` with:
  - `id`
  - `email`
  - `name`
  - `role`
  - `organizationId`

Important behavior:

- If membership exists, `req.user.role` comes from `member.role`.
- If there is no active org or membership is missing, it falls back to `session.user.role`.

### Role middleware

`requireRoleMiddleware(...allowedRoles)`:

- requires `req.user`
- checks whether `req.user.role` is in the allowed role list
- throws `UnauthorizedError` if the user is missing
- throws `ForbiddenError` if the role is not allowed

### Client token middleware

`requireClientAuthMiddleware`:

- expects a validated `token` route param
- resolves a client access record through `getClientAccessByToken`
- attaches `req.clientAccess = { id, projectId }`

This is separate from Better Auth and does not use a user session.

## Auth and RBAC

### Better Auth setup

`src/lib/auth.ts` configures Better Auth with:

- Prisma adapter
- email/password login
- custom password hashing via Argon2
- trusted origins from app config
- compact cookie cache
- secure, `SameSite=None` session cookies
- organization plugin enabled

The organization plugin is important:

- users are allowed to create organizations
- creator role is `TEAM_LEADER`
- invitation emails are sent through `sendOrganizationInvitationEmail`
- organization roles are mapped so:
  - `TEAM_LEADER` uses `ownerAc`
  - other roles use `memberAc`

There is also a Better Auth user-level additional field called `role`, defaulting to `TEAM_LEADER` in auth config. The Prisma schema default is `DEVELOPER`, so the auth layer is the effective source for newly created Better Auth users.

### Where auth is enforced

- Session auth is enforced with `requireAuthMiddleware`.
- Route-level RBAC is enforced with `requireRoleMiddleware`.
- Client dashboard access is enforced with `requireClientAuthMiddleware`.

### Role usage by feature

- Auth routes are public.
- Organization creation/invites/member management are mostly `TEAM_LEADER` only.
- Project read access is open to all authenticated roles.
- Project create/update/delete is `TEAM_LEADER` only.
- Client access link lookup is `TEAM_LEADER` or `BUSINESS_ANALYST`.
- Feature read is open to all authenticated roles.
- Feature create/update/delete is `TEAM_LEADER` or `BUSINESS_ANALYST`.
- Ticket listing is open to all authenticated roles.
- Ticket feature assignment is `TEAM_LEADER` or `BUSINESS_ANALYST`.
- Notion connect/test/list databases/save mapping is `TEAM_LEADER`.
- Manual sync enqueue is `TEAM_LEADER` or `BUSINESS_ANALYST`.
- Sync log listing is open to all authenticated roles.

## Service Layer Pattern

The codebase consistently uses a controller -> service -> repo split.

### Controllers

Controllers are intentionally thin. They usually do only four things:

- read validated params/body/query
- read authenticated user info from `req.user`
- call a service
- return `sendResponse(...)`

They do not contain real business logic.

### Services

Services are where most application rules live:

- checking `organizationId` exists on the request context
- verifying resource ownership within the active organization
- throwing `ForbiddenError`, `NotFoundError`, `ValidationError`, or `AppError`
- orchestrating multiple repo calls
- shaping/sanitizing response payloads
- handling side effects like cookie restoration or queue scheduling

### Repos

Repos are used for two different styles of persistence/integration:

- Prisma data access repos for local DB entities
- proxy repos for Better Auth organization/auth endpoints

That split is useful to preserve:

- domain services should not talk directly to Better Auth HTTP handler details
- controllers should not talk directly to Prisma

## Feature-by-Feature Behavior

### Auth feature

- Routes: sign up, sign in, sign out, get session.
- Repo pattern: proxies requests into `auth.handler(...)` using constructed `Request` objects.
- Service layer:
  - normalizes Better Auth responses
  - sanitizes returned user objects
  - merges `Set-Cookie` headers back to Express responses
  - auto-restores active organization when the user belongs to exactly one organization
  - resolves membership role for the current active organization in session responses

This means session restoration is not purely Better Auth default behavior; the service adds app-specific convenience.

### Organization feature

- Uses Better Auth organization endpoints through proxy repo functions.
- Handles organization creation, invites, member listing, member role changes, member removal, invitation acceptance/rejection/cancelation.
- On invitation acceptance, service also sets the accepted organization as active by calling `setActiveOrganizationRecord`.
- Services sanitize Better Auth-shaped records into app-friendly response objects.

### Projects feature

- CRUD for projects plus client access link retrieval.
- A project can only be created/read/updated/deleted within the active organization.
- Project creation automatically creates its one-to-one `clientAccess` row.
- Listing projects also computes a progress summary for each project.
- Project detail returns ordered features plus a progress summary.
- Client access link is assembled from `FRONTEND_URL` and the stored client token.

Important repo detail:

- project select payloads intentionally omit sensitive Notion token data in normal read operations.
- a separate `findProjectByIdWithSecrets` exists when Notion credentials are actually needed.

### Features feature

- Lists, creates, updates, and deletes project features.
- Preserves explicit feature ordering.
- Insert/update/delete operations rebalance neighboring feature `order` values in Prisma transactions.
- Ownership is checked by loading the feature and its parent project organization.

### Tickets feature

- Lists tickets for a project with filtering, search, pagination, and sorting.
- Allows assigning one ticket or many tickets to a feature.
- Bulk assignment requires all tickets to belong to the same project.
- Feature assignment allows `featureId: null` to unassign.
- Missing-from-source tickets are hidden by default unless `showMissing=true`.

Supported filters include:

- `featureId`
- `status`
- `unassigned`
- `showMissing`
- `page`
- `limit`
- `search`
- `assignee`
- `sortBy`
- `sortOrder`

### Notion feature

- Connects a project to Notion.
- Tests token/database access without persisting.
- Lists accessible Notion databases for an already connected project.
- Saves custom status mapping.
- Enqueues manual sync jobs.
- Fetches ticket pages from Notion for sync processing.

Key implementation details:

- Notion token is encrypted before being stored in Prisma.
- Decryption only happens inside service methods that need live Notion access.
- A database must expose at least one accessible data source.
- Ticket status normalization uses explicit custom mapping first, then falls back to defaults in `notion.mapper.ts`.
- Sync reads all pages from the primary data source and converts them into `SyncedTicketRecord` values.

### Client feature

- Public-ish token route: `GET /api/client/:token`
- Uses constant-time token comparison via `timingSafeEqual`.
- Loads project name, ordered features, ticket completion state, and the five most recent sync logs.
- Computes:
  - per-feature progress
  - per-feature status
  - overall project progress as the average of feature progress values
- Updates `clientAccess.lastViewedAt` on successful dashboard read

One notable implementation detail:

- token validation currently loads all client access records and compares in memory rather than querying by token directly. That is a deliberate security-oriented pattern here because the comparison is timing-safe, but it may matter for scale later.

### Sync logs feature

- Returns recent sync log entries for a project.
- Verifies the project belongs to the active organization before listing logs.

### Progress service

This is a shared calculation layer used by project listing/detail and the worker.

It computes:

- overall progress
- assigned non-missing ticket count
- completed assigned non-missing ticket count
- unassigned ticket count
- missing ticket count
- number of features with progress
- total features
- optional per-feature summaries

Important rule:

- overall project progress is the average of feature progress values, not a weighted percentage by ticket count.

## Background Worker and Sync Flow

### Queue layer

`src/workers/sync.queue.ts` defines:

- queue name: `ticket-sync`
- job name: `sync-project-tickets`
- job payload: `{ projectId, trigger }`
- helper IDs for manual jobs and recurring schedulers

Behavior:

- manual enqueue deduplicates based on job id and pending states
- recurring schedulers are upserted per project using the configured sync interval
- retry attempts are enabled with a custom backoff type for rate limits

### Scheduler refresh

`src/workers/sync.scheduler.ts` runs every minute and:

- finds all projects with both `notionToken` and `notionDatabaseId`
- upserts schedulers for them
- removes stale schedulers for disconnected projects

### Worker execution

`src/workers/sync.worker.ts`:

- starts a BullMQ worker with concurrency `2`
- acquires a Redis lock per project to avoid duplicate concurrent syncs
- fetches tickets from Notion
- persists ticket sync results
- calculates project progress
- inserts a sync log with `SUCCESS`, `FAILED`, or `RATE_LIMITED`

Rate limiting behavior:

- Notion 429 errors map to `AppError(429, ...)`
- worker backoff is exponential from 30 seconds up to 10 minutes

Persistence behavior during sync:

- create new local tickets when Notion pages are new
- update existing tickets when pages still exist
- clear missing flags for tickets seen again
- mark local tickets as missing when their Notion page no longer appears
- update project `lastSyncedAt`

There is no hard delete of tickets during sync.

## Shared Utilities, Types, and Constants

### Config and env

- `src/config/env.ts` is the strict env contract.
- `src/config/config.ts` is the normalized app config object used everywhere else.

Useful normalized behavior:

- `BETTER_AUTH_URL` is normalized to end in `/api/auth`
- `TRUSTED_ORIGINS` becomes an array by splitting on `|`

### Logging

- `src/core/logger/logger.ts` writes to `logs/error.log` and `logs/combined.log`
- Console logging is colorized outside production.

### Error model

Custom error classes:

- `AppError`
- `ValidationError`
- `UnauthorizedError`
- `ForbiddenError`
- `NotFoundError`

These are the main mechanism for clean API error responses.

### Response helper

`sendResponse` always returns:

- `statusCode`
- `message`
- optional `data`

That response envelope is used consistently across the app.

### Express type augmentation

`src/core/types/express.d.ts` adds:

- `req.user`
- `req.validatedBody`
- `req.validatedParams`
- `req.validatedQuery`

### Auth request type helpers

`src/common/types/auth.type.ts` exports `AuthenticatedHttpContext`, which is commonly used in controllers that assume `req.user` exists.

### Password utility

- Password hashing and verification are delegated to `@node-rs/argon2`.
- Better Auth uses these functions.

### Encryption utility

- AES-256-GCM is used for Notion token encryption.
- Stored format is `iv:authTag:ciphertext`, all base64 segments.

## Environment Variables

The app depends on the following env vars defined in `src/config/env.ts`:

### App/runtime

- `NODE_ENV`
- `PORT`
- `BASE_URL`
- `LOG_LEVEL`
- `TRUSTED_ORIGINS`

### Auth

- `BETTER_AUTH_URL`
- `BETTER_AUTH_SECRET`

### Database

- `DATABASE_URL`

### Redis / BullMQ

- `REDIS_URL` optional
- `REDIS_PORT`
- `REDIS_HOST`
- `REDIS_USERNAME`
- `REDIS_PASSWORD`
- `REDIS_DB_INDEX`
- `UPSTASH_REDIS_TCP_URL`

Notes:

- Redis config prefers `UPSTASH_REDIS_TCP_URL`, then falls back to `REDIS_URL`, then finally non-URL host/port options.
- Even though `REDIS_URL` is optional, several host-based Redis vars are required by the schema.

### Frontend

- `FRONTEND_URL`

### SMTP

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`
- `SMTP_SECURE`

### Notion crypto

- `NOTION_ENCRYPTION_KEY`

This must be at least 32 characters and is hashed with SHA-256 to form the AES key.

## Patterns and Conventions To Preserve

### 1. Keep controllers thin

New controllers should keep using this style:

- rely on validated request data
- delegate to a service
- return `sendResponse`
- avoid embedding business logic

### 2. Keep business rules in services

Authorization checks, ownership checks, data shaping, orchestration, and side effects belong in services.

### 3. Keep persistence/integration details in repos

Prisma queries and Better Auth proxy mechanics are intentionally isolated from controllers.

### 4. Validate everything with Zod

Each feature defines schemas beside its routes. New endpoints should follow the same pattern and populate `req.validated*` through shared middleware.

### 5. Use app errors, not ad hoc response branches

Services and middleware should throw typed errors. The centralized error handler is the expected path.

### 6. Respect active organization context

Most internal features assume:

- the user is authenticated
- an active organization exists
- the target resource belongs to that organization

That organization guard is one of the most consistent patterns in the codebase.

### 7. Reuse RBAC middleware explicitly

Router files are where role access is easiest to understand. New routes should continue declaring `requireRoleMiddleware(...)` close to the route definition.

### 8. Preserve response envelope consistency

Responses should continue using the standard `{ statusCode, message, data }` format via `sendResponse`.

### 9. Be careful with “safe” selects

Project repos distinguish between normal project reads and secret-bearing reads. New repo methods should avoid leaking encrypted Notion token fields unless truly needed.

### 10. Preserve ordering semantics for features

Feature order is not incidental. Inserts, updates, and deletes rebalance surrounding records transactionally.

### 11. Preserve soft-missing ticket behavior

Sync does not delete absent tickets; it marks them missing. New sync work should preserve that historical behavior unless intentionally redesigned.

### 12. Keep background behavior idempotent

The sync system already deduplicates queueing and adds Redis locks. Any future sync-related work should maintain those anti-duplication guarantees.

## Practical Mental Model For Future Work

When adding a new internal API feature, the expected shape is:

1. add/extend a Prisma query in a repo
2. put ownership and business rules in a service
3. define Zod schemas for inputs
4. create thin controller methods
5. register routes with `requireAuthMiddleware` and role checks
6. return a standard response envelope

When adding anything organization-sensitive, always think in this order:

1. is the user authenticated?
2. is there an active organization?
3. does the target record belong to that organization?
4. does the user role allow this action?

When adding anything Notion-related, always think in this order:

1. is the project in the active organization?
2. does the project have Notion credentials configured?
3. is the token decrypted only where needed?
4. should the work happen inline or via the sync queue/worker?

This codebase is fairly disciplined already. The biggest thing to preserve is its separation of concerns: routing and middleware at the edges, services for rules, repos for external/data access, and shared helpers for repeated HTTP/auth/config behavior.
