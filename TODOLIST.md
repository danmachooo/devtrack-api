# DevTrack API - Todolist

## Legend
- `[ ]` Not started
- `[~]` In progress
- `[x]` Done
- `[!]` Blocked

---

## Phase 1 - Foundation

- [x] Project setup - Express 5, TypeScript, Prisma, folder structure
- [x] Environment variable validation - `src/config/env.ts` with Zod
- [x] Prisma client singleton - `src/lib/prisma.ts`
- [x] Better Auth setup - `src/lib/auth.ts`
- [x] App bootstrap - `src/app.ts`, `src/server.ts`, helmet, cors, JSON parser, request logger
- [x] Async handler wrapper - `src/core/middleware/async-handler.ts`
- [x] Zod validation middleware - `src/core/middleware/validate.ts`
- [x] Global error handler - `src/core/middleware/error-handler.ts`
- [x] Standardized response utility - `src/core/utils/response.ts`
- [x] Auth middleware - `src/common/middleware/require-auth.middleware.ts`
- [x] RBAC middleware - `src/common/middleware/require-role.middleware.ts`
- [x] Express request types - `src/core/types/express.d.ts`

---

## Phase 2 - Projects

- [x] Prisma schema - `Project`, `Feature`, `Ticket`, `ClientAccess`, `SyncLog`, enums
- [x] `src/features/projects/project.schema.ts` - Zod schemas
- [x] `src/features/projects/projects.repo.ts` - Prisma queries
- [x] `src/features/projects/projects.service.ts` - business logic
- [x] `src/features/projects/project.controller.ts` - request handling
- [x] `src/features/projects/project.routes.ts` - Express router
- [x] `GET    /api/projects` - list projects for current user
- [x] `GET    /api/projects/:id` - get single project
- [x] `POST   /api/projects` - create project
- [x] `PATCH  /api/projects/:id` - update project
- [x] `DELETE /api/projects/:id` - delete project
- [x] `ClientAccess` token auto-generated on project creation

---

## Phase 2.5 - Auth & Organizations

- [x] Enable Better Auth organizations plugin in `src/lib/auth.ts`
- [x] Update Prisma schema - add `Organization`, `Member`, `Invitation`, and Better Auth session org support
- [x] Run migration after schema update
- [x] `POST /api/auth/sign-up` - register with email + password
- [x] `POST /api/auth/sign-in` - login with email + password
- [x] `POST /api/auth/sign-out` - logout, invalidate session
- [x] `GET  /api/auth/session` - return current session and user info
- [x] `POST /api/org` - create organization (TEAM_LEADER only, one per user)
- [x] `GET  /api/org` - get current user's organization
- [x] `POST /api/org/invite` - invite member by email + assign role (TEAM_LEADER only)
- [x] `GET  /api/org/invitations` - list organization invitations (TEAM_LEADER only)
- [x] `GET  /api/org/invitations/me` - list invitations for current user
- [x] `POST /api/org/invitations/:id/accept` - accept organization invitation
- [x] `POST /api/org/invitations/:id/reject` - reject organization invitation
- [x] `POST /api/org/invitations/:id/cancel` - cancel organization invitation (TEAM_LEADER only)
- [x] `GET  /api/org/members` - list all members in the org
- [x] `PATCH /api/org/members/:id` - update member role (TEAM_LEADER only)
- [x] `DELETE /api/org/members/:id` - remove member from org (TEAM_LEADER only)
- [x] Attach `organizationId` to all project queries - projects are scoped to the org
- [x] Smoke test the full auth + org + project scoping flow

---

## Phase 3 - Features

- [x] `src/features/features/feature.schema.ts` - Zod schemas for create and update
- [x] `src/features/features/features.repo.ts` - Prisma queries
- [x] `src/features/features/features.service.ts` - business logic
- [x] `src/features/features/feature.controller.ts` - request handling
- [x] `src/features/features/feature.routes.ts` - Express router
- [x] `GET    /api/projects/:id/features` - list features for a project
- [x] `POST   /api/projects/:id/features` - create feature
- [x] `PATCH  /api/features/:id` - rename or reorder feature
- [x] `DELETE /api/features/:id` - delete feature, tickets set to null featureId

---

## Phase 4 - Notion Integration

- [x] `src/lib/encryption.ts` - AES encrypt / decrypt for storing Notion tokens
- [x] `src/lib/notion.ts` - Notion API client wrapper
- [x] `src/features/notion/notion.schema.ts` - Zod schemas for connect and mapping
- [x] `src/features/notion/notion.service.ts` - testConnection, listDatabases, fetchTickets
- [x] `src/features/notion/notion.mapper.ts` - maps Notion status to DevTrack `TicketStatus`
- [x] `src/features/notion/notion.controller.ts`
- [x] `src/features/notion/notion.routes.ts`
- [x] `POST /api/projects/:id/notion/connect` - save encrypted token + database ID
- [x] `POST /api/projects/:id/notion/test` - test connection, return database info
- [x] `GET  /api/projects/:id/notion/databases` - list accessible Notion databases
- [x] `POST /api/projects/:id/notion/mapping` - save status field mapping as JSON

---

## Phase 5 - Ticket Sync

- [x] `src/workers/sync.queue.ts` - BullMQ queue definition
- [x] `src/workers/sync.worker.ts` - fetch Notion pages -> upsert `Ticket` rows -> update `lastSyncedAt`
- [x] `src/workers/sync.scheduler.ts` - register recurring sync jobs per project sync interval
- [x] `worker.ts` - worker entry point, runs as a separate process
- [x] Notion rate limit handling - retry with backoff on 429
- [x] Write one `SyncLog` row per job execution - success or failure
- [x] `POST /api/projects/:id/notion/sync` - manual sync trigger
- [x] Verify scheduled and manual sync behavior against a real Notion-connected project

---

## Phase 6 - Tickets

- [ ] `src/features/tickets/ticket.schema.ts` - Zod schema for assignment and filters
- [ ] `src/features/tickets/tickets.repo.ts` - Prisma queries
- [ ] `src/features/tickets/tickets.service.ts` - assignTicketToFeature, getTicketsByProject
- [ ] `src/features/tickets/ticket.controller.ts`
- [ ] `src/features/tickets/ticket.routes.ts`
- [ ] `GET   /api/projects/:id/tickets` - list tickets, supports filters (unassigned, by feature, by status)
- [ ] `PATCH /api/tickets/:id/feature` - assign or unassign ticket to a feature

---

## Phase 7 - Progress

- [ ] `src/features/progress/progress.service.ts`
- [ ] `calculateFeatureProgress(featureId)` - percentage based on `RELEASED` + `APPROVED` tickets
- [ ] `calculateProjectProgress(projectId)` - average progress across all features
- [ ] Progress recalculates automatically after every sync

---

## Phase 8 - Client Dashboard

- [ ] `src/common/middleware/require-client-auth.middleware.ts` - validates magic link token, attaches project to request
- [ ] `src/features/client/client.service.ts` - getClientAccessByToken, getClientDashboardData
- [ ] `src/features/client/client.controller.ts`
- [ ] `src/features/client/client.routes.ts`
- [ ] `GET /api/client/:token` - public endpoint, returns project name, overall progress, features with progress and status, recent activity
- [ ] Update `ClientAccess.lastViewedAt` on every request

---

## Phase 9 - Sync Logs

- [ ] `src/features/sync-logs/sync-logs.repo.ts`
- [ ] `src/features/sync-logs/sync-logs.service.ts`
- [ ] `src/features/sync-logs/sync-logs.controller.ts`
- [ ] `src/features/sync-logs/sync-logs.routes.ts`
- [ ] `GET /api/projects/:id/sync/logs` - return last N sync events for a project

---

## Phase 10 - Deploy

- [ ] `.env.example` - all required keys documented
- [ ] Render PostgreSQL database created
- [ ] Render Redis instance created
- [ ] Render Web Service created - runs `node dist/server.js`
- [ ] Render Background Worker created - runs `node dist/worker.js`
- [ ] All environment variables set on both services
- [ ] `prisma migrate deploy` run on first deploy
- [ ] Both services start cleanly
- [ ] End-to-end test - create project -> connect Notion -> sync -> assign features -> client dashboard loads
