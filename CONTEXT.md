# DevTrack API - Project Context

## What This Repo Is

DevTrack is a backend REST API for a client-facing project progress dashboard.

Internal team members use it to:
- create and manage organizations
- manage client projects
- group work into client-facing features
- sync tickets from Notion
- expose progress safely to clients

Clients do not get normal user accounts. They access a limited public dashboard through a magic-link token tied to a project.

---

## Current Status

The repo has completed:
- foundation setup
- projects CRUD
- auth and organization management

The next major build target is:
- Phase 3 - Features CRUD

---

## Tech Stack

- Runtime: Node.js
- Framework: Express 5 + TypeScript
- Database: PostgreSQL with Prisma
- Auth: Better Auth with the organizations plugin
- Validation: Zod
- Background jobs: BullMQ + Redis
- External API: Notion

---

## Architecture Pattern

The project uses a fixed feature-module vertical slice:

```text
feature.routes.ts -> feature.controller.ts -> feature.service.ts -> feature.repo.ts
```

Layer responsibilities:
- routes: middleware chain only
- controller: read request data and send standardized response
- service: business logic and permission/ownership checks
- repo: data access only

Global rules:
- all responses must use `{ statusCode, message, data }`
- async controllers are wrapped with `asyncHandler`
- request body and params are validated with Zod
- services throw typed errors instead of returning error objects

---

## Current Folder Landmarks

Important files and what they do:

- `src/lib/auth.ts` - Better Auth instance, organizations plugin, auth callbacks
- `src/lib/prisma.ts` - Prisma client singleton
- `src/common/middleware/require-auth.middleware.ts` - resolves the current session and attaches `req.user`
- `src/common/middleware/require-role.middleware.ts` - RBAC middleware
- `src/features/auth/*` - auth endpoints and session shaping
- `src/features/organization/*` - organization, invitation, and membership flows
- `src/features/projects/*` - org-scoped project CRUD

---

## Authentication Model

Authentication is session-based through Better Auth.

Implemented auth endpoints:
- `POST /api/auth/sign-up`
- `POST /api/auth/sign-in`
- `POST /api/auth/sign-out`
- `GET /api/auth/session`

Important implementation details:
- the Better Auth base URL is normalized to `/api/auth`
- proxy requests inject `Origin` when Postman or other clients do not send one
- session reads disable Better Auth cookie cache to avoid stale org state
- when a user belongs to exactly one organization, sign-in and session retrieval auto-restore `activeOrganizationId`

`req.user` shape used by protected routes:

```ts
{
  id: string
  email: string
  name: string
  role: Role
  organizationId?: string
}
```

---

## Organization Model

Organizations are managed through Better Auth's organizations plugin, but exposed through this app's own REST endpoints.

Implemented organization endpoints:
- `POST /api/org`
- `GET /api/org`
- `POST /api/org/invite`
- `GET /api/org/invitations`
- `GET /api/org/invitations/me`
- `POST /api/org/invitations/:id/accept`
- `POST /api/org/invitations/:id/reject`
- `POST /api/org/invitations/:id/cancel`
- `GET /api/org/members`
- `PATCH /api/org/members/:id`
- `DELETE /api/org/members/:id`

Invitation lifecycle implemented:
1. Leader creates org
2. Leader invites a user by email and role
3. Invited user signs up or signs in using the same email
4. User lists pending invitations
5. User accepts or rejects invitation
6. Leader can also cancel a pending invitation

Important behavior:
- a user must use the same email that was invited
- invitation acceptance also sets the active organization for the current session
- org and member endpoints append Better Auth `Set-Cookie` headers back to the client

Email notifications:
- invite email sending is wired through `nodemailer`
- SMTP config is intentionally not finalized yet
- without SMTP config, the mailer warns and does not send

---

## RBAC Model

Current roles:
- `TEAM_LEADER`
- `BUSINESS_ANALYST`
- `QUALITY_ASSURANCE`
- `DEVELOPER`

Current practical rules in the API:
- `TEAM_LEADER` can create orgs, invite users, manage invitations, manage members, and manage projects
- `BUSINESS_ANALYST` will manage features and ticket assignment
- `QUALITY_ASSURANCE` will have ticket status update permissions
- `DEVELOPER` is read-only for the internal dashboard area

Important nuance:
- membership role is organization-based
- `requireAuthMiddleware` resolves the effective role from the active org membership when possible

---

## Project Ownership and Scoping

Projects are organization-scoped.

This is already enforced in the projects feature:
- every project query uses `organizationId`
- if no active organization is selected, project access is rejected
- users from one org cannot read or modify projects from another org

This org scoping is the base security rule that later features must continue to follow:
- features must be scoped through project ownership
- tickets must be scoped through project ownership
- sync logs must be scoped through project ownership

---

## Current Domain Model

### User
Managed by Better Auth. Has a base role field, but effective access is determined from org membership when an active org is set.

### Organization
Top-level container for members, invitations, and projects.

### Member
Join table between user and organization. Stores the org-level role.

### Invitation
Pending, accepted, rejected, or canceled org invite tracked by Better Auth.

### Project
Belongs to an organization. Holds client info, Notion config, sync config, and progress-related records.

### Feature
Client-facing grouping of work under a project. Phase 3 will build this out.

### Ticket
Will be synced from Notion and optionally assigned to a feature.

### ClientAccess
Per-project token for the public client dashboard.

### SyncLog
One record per sync job execution.

---

## What Is Already Verified

Phase 2.5 was smoke-tested successfully through Postman.

Verified flows:
- sign up
- sign in
- sign out
- get session
- create org
- get org
- invite member
- list org invitations
- list current-user invitations
- accept invitation
- reject invitation
- cancel invitation
- list members
- update member role
- remove member
- create and list org-scoped projects
- verify project isolation across organizations

---

## Known Implementation Notes

- Better Auth organization actions do not always return the same JSON shape; repo typings must match each endpoint exactly.
- `organization/set-active` may succeed without returning a useful response body, so success is determined by HTTP status, not payload presence.
- A fresh login creates a new session, so active organization restoration is handled explicitly when the user belongs to exactly one org.
- If multi-org membership is introduced later, the app will need an explicit "switch active organization" endpoint instead of relying on single-org restoration.

---

## What To Build Next

Build order from this point:

1. Features CRUD
2. Notion integration
3. Ticket sync
4. Ticket management
5. Progress calculation
6. Client dashboard
7. Sync logs

Immediate next target:
- implement Phase 3 - Features CRUD using the existing projects/auth/org patterns

---

## Working Assumptions For Future Changes

When continuing work in this repo, assume:
- auth and org flows are already complete and verified
- project endpoints must always be organization-scoped
- Better Auth is the source of truth for sessions, org membership, and invitations
- response shape must remain standardized
- new features should follow the existing vertical slice pattern exactly
