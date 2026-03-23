# PLAN.md - Automation Enhancements

> Current session plan. Work through tasks top to bottom unless instructed otherwise.
> Cross off tasks as you complete them by replacing `[ ]` with `[x]`.

---

## Goal

Reduce manual setup work when connecting a Notion database to a DevTrack project. Specifically:

1. **Auto status mapping** - when connecting Notion, pre-fill the status mapping by pulling all status options directly from the Notion database schema, so the user gets a smart default instead of a blank form.
2. **Auto feature mapping** - during every sync, read each ticket's `Module/Feature` column from Notion and automatically assign it to a matching DevTrack feature. If no matching feature exists, create it automatically.

---

## Context

### Affected files (read these before writing anything)

- `src/features/notion/notion.routes.ts`
- `src/features/notion/notion.controller.ts`
- `src/features/notion/notion.service.ts`
- `src/features/notion/notion.repo.ts`
- `src/features/notion/notion.schema.ts`
- `src/features/notion/notion.mapper.ts`
- `src/features/features/feature.repo.ts`
- `src/features/tickets/ticket.repo.ts`
- `src/workers/sync.worker.ts`
- `src/workers/sync.queue.ts`
- `prisma/schema.prisma`

### Key constraints to preserve

- Notion tokens must be decrypted in the service layer only - never passed raw to repos or logged.
- Feature `order` is maintained explicitly. Any auto-created feature must be inserted with a correct `order` value, rebalancing neighbors transactionally if needed.
- Tickets are never hard-deleted. Missing-from-source behavior must be preserved.
- Sync must remain idempotent - running it twice should produce the same result.
- All Prisma writes that touch multiple rows must be wrapped in a transaction.
- Auto-created feature names must be normalized before insert: trim whitespace, consistent casing (title case). Deduplicate by normalized name before creating.

---

## Task Breakdown

### Phase 1 - Auto Status Mapping

#### 1.1 - Pull status options from Notion database schema

- [x] In `notion.repo.ts`, add a function `getNotionDatabaseSchema(databaseId, notionToken)` that calls the Notion API to retrieve the database object and extracts all options from the `Status` property (or equivalent select/multi-select property).
- [x] Return a list of raw status option names as strings.

#### 1.2 - Map Notion statuses to DevTrack TicketStatus enum

- [x] In `notion.mapper.ts`, add a function `buildDefaultStatusMapping(notionStatuses: string[])` that takes the raw Notion status names and maps each one to the closest `TicketStatus` enum value using the existing default mapping logic.
- [x] Return a `Record<string, TicketStatus>` where keys are Notion status names and values are the mapped DevTrack statuses.
- [x] Unknown statuses that cannot be confidently mapped should default to `TODO`.

#### 1.3 - Add a new endpoint to fetch the pre-filled mapping

- [x] In `notion.schema.ts`, add a schema for the request params (just `projectId`).
- [x] In `notion.service.ts`, add `getDefaultStatusMappingService(projectId, organizationId)` that:
  - verifies the project belongs to the active org
  - loads the project with Notion secrets
  - decrypts the token
  - calls `getNotionDatabaseSchema` from the repo
  - calls `buildDefaultStatusMapping` from the mapper
  - returns the mapping object
- [x] In `notion.controller.ts`, add `getDefaultStatusMappingController`.
- [x] In `notion.routes.ts`, register `GET /:projectId/status-mapping/default` with `requireAuthMiddleware` and `requireRoleMiddleware('TEAM_LEADER')`.

#### 1.4 - Verify

- [ ] Hit the new endpoint with a connected project and confirm it returns a pre-filled `Record<string, TicketStatus>`.
- [x] Confirm unknown Notion statuses default to `TODO`.
- [ ] Confirm the existing save-mapping endpoint still works and the user can override the pre-filled values before saving.

---

### Phase 2 - Auto Feature Mapping During Sync

#### 2.1 - Extract Module/Feature value from Notion pages

- [x] In `notion.mapper.ts`, update the ticket mapping logic to extract the `Module` or `Feature` property from each Notion page (check both names - the column may be called either).
- [x] Add `moduleName: string | null` to the `SyncedTicketRecord` type.
- [x] If the property does not exist or is empty, set `moduleName` to `null`.

#### 2.2 - Add feature upsert helper to feature repo

- [x] In `feature.repo.ts`, add `upsertFeatureByName(projectId, name)` that:
  - normalizes the name (trim + title case)
  - checks if a feature with that normalized name already exists for the project
  - if yes, returns the existing feature
  - if no, creates a new feature with the next available `order` value inside a transaction
- [x] Deduplication must be case-insensitive.

#### 2.3 - Update sync worker to auto-assign features

- [x] In `sync.worker.ts`, after fetching tickets from Notion and before persisting them, collect all unique non-null `moduleName` values from the synced ticket records.
- [x] For each unique module name, call `upsertFeatureByName` to ensure the feature exists. Build a `Map<normalizedName, featureId>` lookup.
- [x] When persisting each ticket, resolve its `featureId` from the lookup using its `moduleName`.
- [x] If `moduleName` is null, leave `featureId` unchanged from its current value (do not unassign manually-assigned features).
- [x] If `moduleName` is set, update `featureId` to the resolved ID - even if it was previously assigned to a different feature. This keeps DevTrack in sync with Notion on every run.

#### 2.4 - Verify

- [ ] Run a sync on a project where Notion tickets have a `Module` or `Feature` column.
- [x] Confirm new features are auto-created with normalized names.
- [x] Confirm tickets are assigned to the correct features.
- [x] Confirm tickets without a module value are not unassigned.
- [ ] Confirm running the sync twice produces the same result (idempotency).
- [x] Confirm the sync log still records correctly after the changes.

---

### Phase 3 - Cleanup and Memory

- [x] Review all changed files against `STANDARDS.md` - no `any`, no default exports, no raw `process.env`, no `console.log`.
- [x] Confirm Notion token is never logged or leaked in any new code path.
- [x] Confirm all new Prisma writes that touch multiple rows are wrapped in transactions.
- [x] Append key takeaways from this session to `MEMORY.md`.

---

## Out of Scope

- Changes to the client dashboard
- Changes to auth or session behavior
- UI for reviewing or editing auto-generated features (manual feature editing already exists)
- Deleting features that no longer appear in Notion (too destructive for now)
