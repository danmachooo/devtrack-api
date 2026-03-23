# AGENTS.md — DevTrack

> Primary instruction file for Codex. Read this file and all referenced files before writing any code.

---

## 1. Orientation

You are working on **DevTrack**, a TypeScript + Express 5 REST API for project delivery tracking with Notion-backed ticket sync and client dashboard access. There is no frontend in this repository.

Before doing anything else, read these files in order:

1. `agents/CONTEXT.md` — architecture, data models, middleware, patterns
2. `agents/MEMORY.md` — lessons learned from previous sessions, known gotchas
3. `agents/STANDARDS.md` — coding conventions and quality rules
4. `agents/SKILLS.md` — what you are allowed to do and implementation recipes
5. `agents/PLAN.md` — current session tasks (if it exists)
6. Any source files directly relevant to the task at hand

Do not write any code until you have read all of the above.

---

## 2. How to Explore the Codebase

When the task touches an area you haven't read yet, inspect it before writing:

```bash
# Full file tree
find . -type f ! -path '*/node_modules/*' ! -path '*/.git/*' ! -path '*/dist/*' | sort

# Prisma schema
cat prisma/schema.prisma

# Source structure
find ./src -type f | sort

# Specific feature
cat src/features/<feature>/*.ts
```

Always verify actual file contents. Never assume structure from memory.

---

## 3. How to Add a New Feature

Follow this sequence exactly:

1. **Read first** — read `agents/CONTEXT.md` and all relevant existing source files before writing anything
2. **Schema** — if new models or fields are needed, update `prisma/schema.prisma` and generate a migration
3. **Repo** — add Prisma queries or third-party proxy functions in a `*.repo.ts` file
4. **Service** — implement business logic, ownership checks, and orchestration in a `*.service.ts` file
5. **Schema/validation** — define Zod schemas and export input types in a `*.schema.ts` file
6. **Controller** — write a thin controller in `*.controller.ts` that reads validated input, calls the service, and returns `sendResponse`
7. **Routes** — register the route in `*.routes.ts` with `requireAuthMiddleware` and `requireRoleMiddleware` applied
8. **Register** — wire the new router into `src/routes/index.ts`

Do not skip steps. Do not merge responsibilities across layers.

---

## 4. Coding Rules

These are non-negotiable. Full details are in `agents/STANDARDS.md` — read that file. The rules below are a hard summary.

### Style
- TypeScript strict mode. No `any`. No implicit returns.
- Named exports only. No default exports.
- `async/await` only. No `.then()` chains.
- Verbose and explicit over clever. Prioritize readability.
- No magic strings — use constants or enums.

### File naming
- Files: `kebab-case.ts`
- Types/interfaces: `PascalCase`
- Variables/functions: `camelCase`
- Constants: `SCREAMING_SNAKE_CASE`

### Prisma
- Always scope queries by `organizationId`.
- Use parameterized queries only — never string-interpolate into raw SQL.
- Handle `PrismaClientKnownRequestError` explicitly — never let ORM errors leak to the client.
- Normal project reads must use safe selects that omit `notionToken`. Use `findProjectByIdWithSecrets` only when Notion credentials are actually needed.

### Errors
- Throw typed errors from services: `AppError`, `ValidationError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`.
- Never embed ad hoc response logic in controllers for error cases.
- Never expose stack traces or internal messages to the client.

### Environment and secrets
- Access env vars only through `src/config/config.ts`. Never read `process.env` directly in feature code.
- Never log secret values. Mask them in any debug output.
- Notion tokens must be encrypted before storage and decrypted only inside service methods that need live Notion access.

### Responses
- Always use `sendResponse` with the standard `{ statusCode, message, data }` envelope.
- Never construct raw `res.json(...)` responses in controllers.

---

## 5. Authorization Rules

Every internal route must satisfy all four checks in this order:

1. Is the user authenticated? (`requireAuthMiddleware`)
2. Is there an active organization? (checked in service via `req.user.organizationId`)
3. Does the target resource belong to that organization? (checked in service)
4. Does the user role allow this action? (`requireRoleMiddleware`)

Never skip or reorder these. Never leave a route unprotected.

### Role reference

| Action | Allowed roles |
|---|---|
| Project read | All authenticated |
| Project create / update / delete | `TEAM_LEADER` |
| Feature read | All authenticated |
| Feature create / update / delete | `TEAM_LEADER`, `BUSINESS_ANALYST` |
| Ticket listing | All authenticated |
| Ticket feature assignment | `TEAM_LEADER`, `BUSINESS_ANALYST` |
| Client access link | `TEAM_LEADER`, `BUSINESS_ANALYST` |
| Notion connect / mapping | `TEAM_LEADER` |
| Manual sync enqueue | `TEAM_LEADER`, `BUSINESS_ANALYST` |
| Sync log listing | All authenticated |
| Org management | `TEAM_LEADER` |

---

## 6. Background Worker Rules

When working on anything sync or queue related:

- Manual enqueue must deduplicate by job ID — never double-queue a project.
- Always acquire a Redis lock per project before syncing to prevent concurrent duplicate runs.
- Sync must never hard-delete tickets. Mark absent tickets as missing (`isMissingFromSource: true`, `missingFromSourceAt`).
- If a previously missing ticket reappears, clear its missing flags.
- Rate limit errors (Notion 429) must map to `RATE_LIMITED` sync log status.
- Scheduler upserts run every minute — new sync-connected projects are picked up automatically.

---

## 7. What Not To Do

- Do not bypass or remove `requireAuthMiddleware` or `requireRoleMiddleware` on any route.
- Do not return data outside the active `organizationId` scope.
- Do not put business logic in controllers.
- Do not put Prisma queries in services — use repos.
- Do not use `console.log` — use the Winston logger.
- Do not introduce a new dependency without first checking if `package.json` already covers the need.
- Do not use default exports.
- Do not write `.then()` chains.
- Do not read `process.env` directly in feature code.
- Do not leak `notionToken` in normal project reads.
- Do not hard-delete tickets during sync.
- Do not leave TODOs without explaining why in your response.

---

## 8. PLAN.md

If `agents/PLAN.md` exists, read it before starting any work. It contains the current session's tasks and goals. Work through it top to bottom unless instructed otherwise. If no `agents/PLAN.md` exists, ask what to work on before writing any code.

---

## 9. Phase Completion Protocol

When a plan is divided into phases, do not move from one phase to the next automatically. After completing every phase, stop and report the following before proceeding:

**1. What was done**
List every file that was created or modified and briefly describe what changed in each one.

**2. What was verified**
List every check that was run — type errors, linting, logic review against `agents/STANDARDS.md`, and any manual verification steps from the plan.

**3. What was tested**
Run the following after every phase and report the actual output — not what you expect, but what actually happened:

```bash
# Type check — must pass with zero errors before anything else
npx tsc --noEmit

# Run tests for the affected feature
npx vitest run src/features/<feature>/<feature>.test.ts
```

Every new or modified endpoint must have a corresponding Vitest + Supertest test. For worker or sync changes, write a test that mocks the Notion client and Prisma calls and asserts the correct sync behavior.

Follow this loop until all tests pass:

```
run tsc --noEmit
  → if errors: fix → repeat
run vitest
  → if any test fails: fix → re-run vitest → repeat
  → if all pass: report and wait for confirmation
```

Do not break out of this loop by skipping a failing test, marking it as skipped, or commenting it out. Every test must pass. Only then report phase completion and ask for confirmation.

See `agents/SKILLS.md` for the full testing recipe.

**4. Confidence level**
State your confidence that the phase is complete and correct. If anything is uncertain, name it explicitly. Do not paper over doubts.

**4. What comes next**
State which phase is next and what it will touch.

Then wait for explicit confirmation before continuing.

Example format:

> ✅ Phase 1 complete.
>
> **Done:**
> - `notion.repo.ts` — added `getNotionDatabaseSchema`
> - `notion.mapper.ts` — added `buildDefaultStatusMapping`
> - `notion.service.ts` — added `getDefaultStatusMappingService`
> - `notion.controller.ts` — added `getDefaultStatusMappingController`
> - `notion.routes.ts` — registered `GET /:projectId/status-mapping/default`
>
> **Verified:**
> - No `any` types used
> - Notion token decrypted in service only, never logged
> - Route protected with `requireRoleMiddleware('TEAM_LEADER')`
> - Unknown Notion statuses default to `TODO`
> - Existing save-mapping endpoint untouched
>
> **Tested:**
> - `npx tsc --noEmit` — 0 errors
> - `npx vitest run src/features/notion/notion.test.ts` — 6 passed, 0 failed
>   - ✓ returns pre-filled status mapping for connected project
>   - ✓ unknown Notion statuses default to TODO
>   - ✓ returns 400 when project has no Notion connection
>   - ✓ returns 404 when project not found
>   - ✓ returns 401 when unauthenticated
>   - ✓ returns 403 when role is not TEAM_LEADER
>
> **Confidence:** High. The only uncertainty is whether some Notion workspaces use a property name other than `Status` — this is noted in the plan's context block.
>
> **Next:** Phase 2 — auto feature mapping in the sync worker.
>
> Confirm to proceed?

---

## 10. End of Session

Before ending any session:

1. Cross off completed tasks in `agents/PLAN.md` by replacing `[ ]` with `[x]`
2. Generalize the key takeaways from this session and append them to `agents/MEMORY.md` using the format defined in that file
3. Only include lessons that would have changed your approach if you had known them earlier