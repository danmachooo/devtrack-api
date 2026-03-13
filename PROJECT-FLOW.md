# DevTrack Project Flow

This document explains how the DevTrack system is intended to be used from end to end.

DevTrack has two UI domains:

1. Internal team UI
2. Client dashboard UI

The internal team UI is where authenticated organization members manage projects, features, tickets, syncing, and client access.

The client dashboard UI is a limited public-facing dashboard opened through a project-specific magic link. Clients do not create accounts and do not sign in with a normal session.

---

## System Overview

At a high level, the workflow is:

1. A team member creates an account.
2. A team leader creates an organization.
3. The team leader invites internal teammates into that organization.
4. The team leader creates a project for a client.
5. The team leader connects the project to a Notion database.
6. The team leader saves the Notion-to-DevTrack status mapping.
7. A manual or scheduled sync imports Notion tickets into DevTrack.
8. The internal team creates client-facing features.
9. Tickets are assigned to those features.
10. DevTrack calculates feature and project progress.
11. Internal users generate the client share link.
12. The client opens the public dashboard with the magic link.

---

## Internal Team UI Flow

This section describes how internal users operate the system.

### 1. Create an Account

The first user journey starts with authentication.

- Sign up with email, name, and password.
- Sign in with the same credentials.
- Load the current session to confirm authentication and active organization state.
- Sign out when needed.

Implemented auth endpoints:

- `POST /api/auth/sign-up`
- `POST /api/auth/sign-in`
- `GET /api/auth/session`
- `POST /api/auth/sign-out`

Important behavior:

- Authentication is session-based.
- A user can exist before belonging to an organization.
- If the user belongs to exactly one organization, the active organization may be restored automatically on sign-in or session fetch.

### 2. Create or Join an Organization

Projects and all protected business data are organization-scoped, so this is the first required setup step after sign-in.

#### Path A: Create a new organization

The team leader creates the organization.

- Create the organization.
- Confirm the active organization is now available.

Implemented endpoints:

- `POST /api/org`
- `GET /api/org`

#### Path B: Join through an invitation

If a team leader has already created the organization, another user joins through the invite flow.

- Sign up or sign in using the same email address that was invited.
- Check personal pending invitations.
- Accept or reject the invitation.
- After acceptance, confirm the organization is active in the session.

Implemented endpoints:

- `GET /api/org/invitations/me`
- `POST /api/org/invitations/:id/accept`
- `POST /api/org/invitations/:id/reject`

Important behavior:

- Invitation acceptance depends on matching the invited email.
- Accepting an invitation also sets the active organization for the current session.

### 3. Invite and Manage Internal Team Members

This flow is handled by the team leader.

- Invite internal users by email and assign their organization role.
- Review all organization invitations.
- Cancel pending invitations if needed.
- View current organization members.
- Update a member role.
- Remove a member from the organization.

Implemented endpoints:

- `POST /api/org/invite`
- `GET /api/org/invitations`
- `POST /api/org/invitations/:id/cancel`
- `GET /api/org/members`
- `PATCH /api/org/members/:id`
- `DELETE /api/org/members/:id`

Role notes:

- Only `TEAM_LEADER` can invite members and manage membership.

### 4. Understand Role Permissions

Roles control what each internal user can do.

- `TEAM_LEADER`: full internal setup and project administration
- `BUSINESS_ANALYST`: feature management, ticket assignment, manual sync trigger, client link access
- `QUALITY_ASSURANCE`: read access plus ticket-status-related operational visibility
- `DEVELOPER`: read-only access to internal dashboard data

Practical permission boundaries in the current system:

- Project create, update, delete: `TEAM_LEADER`
- Notion connect, test, databases, mapping: `TEAM_LEADER`
- Manual sync trigger: `TEAM_LEADER`, `BUSINESS_ANALYST`
- Feature create, update, delete: `TEAM_LEADER`, `BUSINESS_ANALYST`
- Ticket assignment to feature: `TEAM_LEADER`, `BUSINESS_ANALYST`
- Read projects, features, tickets, sync logs: all four roles
- Get client access link: `TEAM_LEADER`, `BUSINESS_ANALYST`

### 5. Create a Project

After the organization is ready, the team leader creates a project for a client.

Project setup includes:

- project name
- client name
- client email

Implemented endpoints:

- `POST /api/projects`
- `GET /api/projects`
- `GET /api/projects/:id`
- `PATCH /api/projects/:id`
- `DELETE /api/projects/:id`

Important behavior:

- Projects are always scoped to the active organization.
- Cross-organization project access is rejected.
- When a project is created, a `ClientAccess` record is generated automatically for future client sharing.

### 6. Connect the Project to Notion

Once the project exists, the team leader configures the Notion integration.

There are three main setup flows:

#### Test a Notion connection before saving it

Use this to verify the integration token and database selection without persisting the credentials.

- Submit a Notion token and target database details to test connectivity.
- Confirm the database can be reached successfully.

Endpoint:

- `POST /api/projects/:id/notion/test`

#### List accessible Notion databases

After a project has a saved Notion connection, DevTrack can fetch the available databases the integration can access.

Endpoint:

- `GET /api/projects/:id/notion/databases`

#### Save the Notion connection for the project

Persist the Notion token and selected database for ongoing sync.

- Save the Notion token.
- Save the target Notion database ID.

Endpoint:

- `POST /api/projects/:id/notion/connect`

Important behavior:

- Notion tokens are encrypted at rest.
- Notion tokens must never be returned in API responses.

### 7. Save the Status Mapping

Notion statuses need to be mapped into DevTrack ticket statuses so progress can be calculated consistently.

The team leader configures a mapping between Notion status values and DevTrack status values.

Endpoint:

- `POST /api/projects/:id/notion/mapping`

Outcome:

- Future syncs normalize Notion ticket statuses into DevTrack’s internal status model.

### 8. Trigger Sync and Keep Tickets Updated

After Notion is connected and the mapping is configured, DevTrack can import tickets from Notion.

There are two sync modes:

#### Manual sync

Used when the team wants an immediate refresh.

Endpoint:

- `POST /api/projects/:id/notion/sync`

Who can trigger it:

- `TEAM_LEADER`
- `BUSINESS_ANALYST`

#### Scheduled sync

Used for automatic recurring updates based on the project’s configured `syncInterval`.

Important behavior:

- Sync jobs upsert tickets into the system.
- Missing source tickets are not deleted. They are marked with `isMissingFromSource`.
- A successful sync updates `Project.lastSyncedAt`.
- Every sync attempt writes a sync log record.

### 9. Review and Organize Client-Facing Features

Features are the client-facing buckets that internal teams use to group synced tickets into meaningful deliverables.

Common workflow:

1. Create a project.
2. Create features under that project.
3. Reorder or rename features as work evolves.
4. Delete features if they are no longer needed.

Implemented endpoints:

- `GET /api/projects/:projectId/features`
- `POST /api/projects/:projectId/features`
- `PATCH /api/features/:id`
- `DELETE /api/features/:id`

Important behavior:

- Features are scoped through project ownership.
- Feature ordering is stable and maintained by the backend.
- Deleting a feature sets related ticket `featureId` values to `null`.

### 10. Review Synced Tickets

Once sync runs, internal users can inspect imported tickets per project.

Endpoint:

- `GET /api/projects/:id/tickets`

Supported ticket filtering includes:

- filter by `featureId`
- filter by `status`
- filter unassigned tickets
- optionally include tickets missing from the source

Important behavior:

- Ticket access is scoped through the owning project’s organization.
- Conflicting filters are rejected.

### 11. Assign Tickets to Features

After tickets are synced, the internal team maps raw tickets into the client-facing feature structure.

Typical workflow:

1. Review the synced ticket list.
2. Identify which feature each ticket belongs to.
3. Assign the ticket to a feature.
4. Unassign it later if reclassification is needed.

Endpoint:

- `PATCH /api/tickets/:id/feature`

Who can do this:

- `TEAM_LEADER`
- `BUSINESS_ANALYST`

Important behavior:

- Cross-project feature assignment is rejected.
- The ticket and target feature must belong to the same project.

### 12. Track Progress

Progress is derived from synced ticket status and ticket-to-feature assignment.

Current progress logic:

- Feature progress is based on assigned, non-missing tickets.
- `APPROVED` and `RELEASED` count as complete.
- Project progress is the average of feature progress values.
- Unassigned tickets do not contribute to project progress.

Where progress appears:

- Internal project responses
- Public client dashboard responses

Operational meaning:

- Notion sync keeps raw ticket data current.
- Ticket assignment determines which feature gets credit.
- Status mapping determines which tickets count as complete.

### 13. Review Sync History

Internal users can inspect recent sync activity for a project.

Endpoint:

- `GET /api/projects/:id/sync/logs`

What this is used for:

- confirm whether sync jobs are succeeding
- inspect recent job outcomes
- troubleshoot failed or missing sync runs

Who can access it:

- `TEAM_LEADER`
- `BUSINESS_ANALYST`
- `QUALITY_ASSURANCE`
- `DEVELOPER`

### 14. Generate the Client Share Link

Once the project has meaningful feature grouping and ticket progress, internal users can retrieve the shareable client dashboard link.

Endpoint:

- `GET /api/projects/:id/client-access`

Who can access it:

- `TEAM_LEADER`
- `BUSINESS_ANALYST`

What the response gives:

- `projectId`
- `clientAccessLink`
- `lastViewedAt`

Important behavior:

- The link is frontend-ready.
- Internal project responses do not expose the raw `clientAccess.token`.

---

## Client Dashboard UI Flow

This section describes how the external client uses the public dashboard.

### 1. Receive the Share Link

The client does not sign up and does not sign in through the internal auth system.

Instead:

1. An internal team member retrieves the project’s client access link.
2. The link is shared with the client.
3. The client opens that link in the client-facing UI domain.

### 2. Access the Dashboard with the Magic Link

The public dashboard is loaded through a tokenized route.

Implemented endpoint:

- `GET /api/client/:token`

Important behavior:

- The token is validated through dedicated client auth middleware.
- Invalid client tokens are rejected.
- On successful access, `ClientAccess.lastViewedAt` is updated.

### 3. View Client-Safe Project Progress

The client dashboard is intentionally limited and should only expose safe, client-facing data.

The dashboard is designed to show:

- project name
- overall progress
- features with progress
- recent activity or recent progress-related data

Security constraints:

- No internal user information should be exposed.
- No raw ticket IDs should be exposed.
- No Notion IDs should be exposed.
- No sync logs should be exposed.
- No internal auth or membership data should be exposed.

### 4. Revisit the Dashboard Over Time

The client can reopen the same link whenever the team shares ongoing progress.

As the internal team continues to:

- sync Notion
- assign tickets to features
- move work into complete statuses

the client dashboard reflects the updated project state.

---

## Recommended End-to-End Usage Sequence

If a team is starting from zero, this is the recommended order:

1. Create a user account.
2. Sign in.
3. Create an organization.
4. Invite teammates.
5. Accept invitations on teammate accounts.
6. Create a project.
7. Test the Notion connection.
8. Save the Notion connection.
9. List databases if needed and confirm the correct source database.
10. Save the status mapping.
11. Trigger a manual sync.
12. Create client-facing features.
13. Review synced tickets.
14. Assign tickets to features.
15. Review progress.
16. Review sync logs if something looks wrong.
17. Retrieve the client access link.
18. Share the link with the client.
19. Continue recurring sync and ticket organization as the project evolves.

---

## Operational Notes

- All protected internal data depends on the current active organization.
- Ownership checks are enforced in the service layer, so users from one organization cannot access another organization’s projects, features, tickets, or sync logs.
- The client dashboard uses token-based access, not internal session auth.
- Notion is the external source of ticket data, but DevTrack controls feature grouping, ticket assignment, progress calculation, and client-safe presentation.
- The most important internal operating rhythm is: sync tickets, organize them into features, then share progress outward through the client link.
