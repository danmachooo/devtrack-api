# DevTrack API — Agent Instructions

Instructions for AI coding agents (Codex, Cursor, Copilot, etc.) working on this repository. Read this fully before writing any code.

---

## What This Repo Is

A backend REST API for DevTrack — a client-facing project progress dashboard. The API syncs tickets from Notion, maps them to client-facing features, and exposes progress data to internal teams and clients via magic link access.

For full context on the domain, data model, and architecture read `CONTEXT.md` first.

---

## What You Are Allowed To Do

- Read and understand existing code before writing anything
- Write new features that follow the existing patterns exactly
- Refactor existing code when it improves clarity — but only if the task asks for it
- Make small, localized architectural decisions (naming, helper extraction, minor abstractions) on your own
- Ask before making any decision that affects more than one feature module or the overall structure

---

## What You Must Never Do

- **Change the folder structure** — the layered feature-module pattern is fixed
- **Install new dependencies without asking** — state what it does, why you need it, and whether there is a simpler alternative using what is already installed
- **Modify the Prisma schema without asking** — schema changes affect the entire system and require a migration
- **Change the response shape** — all responses must use the existing `response` utility and follow `{ statusCode, message, data }`
- **Rewrite working code unprompted** — if existing code works, leave it alone unless the task explicitly says to change it
- **Use `.then()` chains** — async/await only
- **Use default exports** — named exports everywhere
- **Write clever or implicit code** — verbose and explicit always

---

## Before You Write Any Code

1. Read `CONTEXT.md` to understand the domain, architecture, and what is already built
2. Find the existing `projects` feature module and read all four files — routes, controller, service, repo — to understand the exact pattern you must follow
3. Identify which files you need to create or modify
4. If the task requires a schema change, a new dependency, or a structural decision — stop and ask first

---

## Folder Structure

The structure is fixed. Do not add, rename, or reorganize folders.

```
src/
├── app.ts
├── server.ts
├── config/
├── lib/
├── core/
│   ├── middleware/
│   ├── utils/
│   ├── logger/
│   └── types/
├── common/
│   ├── middleware/
│   └── types/
├── routes/
└── features/
    └── [feature-name]/
        ├── [feature].routes.ts
        ├── [feature].controller.ts
        ├── [feature].service.ts
        └── [feature].repo.ts
```

Every new feature gets its own folder under `src/features/` with exactly these four files. Nothing else.

---

## The Pattern — Follow This Exactly

Every feature follows this exact vertical slice. Use the `projects` feature as your reference implementation.

### Routes
- Mounts `requireAuthMiddleware` and `requireRoleMiddleware` per route
- Uses `validate(schema)` before the controller
- Wraps every controller in `asyncHandler`
- No business logic here — only middleware chain and controller reference

```typescript
import { Router } from 'express'
import { requireAuthMiddleware } from '@/common/middleware/require-auth.middleware'
import { requireRoleMiddleware } from '@/common/middleware/require-role.middleware'
import { validate } from '@/core/middleware/validate'
import { asyncHandler } from '@/core/middleware/async-handler'
import { createFeatureSchema } from './feature.schema'
import { createFeature, getFeatures } from './feature.controller'

export const featureRouter = Router({ mergeParams: true })

featureRouter.get(
  '/',
  requireAuthMiddleware,
  requireRoleMiddleware('TEAM_LEADER', 'BUSINESS_ANALYST', 'QUALITY_ASSURANCE', 'DEVELOPER'),
  asyncHandler(getFeatures)
)

featureRouter.post(
  '/',
  requireAuthMiddleware,
  requireRoleMiddleware('TEAM_LEADER', 'BUSINESS_ANALYST'),
  validate(createFeatureSchema),
  asyncHandler(createFeature)
)
```

### Controller
- Reads from `req.body`, `req.params`, `req.user`
- Calls the service
- Returns via the `response` utility
- No business logic, no Prisma calls, no try/catch

```typescript
import { type HttpContext } from '@/core/types/http-context.types'
import { sendSuccess } from '@/core/utils/response'
import { createFeatureService, getFeaturesService } from './feature.service'

export const getFeatures = async (http: HttpContext): Promise<void> => {
  const { projectId } = http.req.params
  const features = await getFeaturesService(projectId)
  sendSuccess(http.res, 200, 'Features retrieved successfully', features)
}

export const createFeature = async (http: HttpContext): Promise<void> => {
  const { projectId } = http.req.params
  const userId = http.req.user!.id
  const feature = await createFeatureService(projectId, userId, http.req.body)
  sendSuccess(http.res, 201, 'Feature created successfully', feature)
}
```

### Service
- Contains all business logic
- Calls the repo for data access
- Throws typed error classes for error cases — never returns error objects
- No HTTP, no Express types

```typescript
import { NotFoundError } from '@/core/errors/not-found.error'
import { type CreateFeatureInput } from './feature.schema'
import { findFeaturesByProject, insertFeature } from './feature.repo'

export const getFeaturesService = async (projectId: string) => {
  const features = await findFeaturesByProject(projectId)
  return features
}

export const createFeatureService = async (
  projectId: string,
  userId: string,
  input: CreateFeatureInput
) => {
  const feature = await insertFeature(projectId, input)
  return feature
}
```

### Repo
- Prisma calls only
- No business logic
- No error handling — let Prisma errors bubble up to the error handler

```typescript
import { prisma } from '@/lib/prisma'
import { type CreateFeatureInput } from './feature.schema'

export const findFeaturesByProject = async (projectId: string) => {
  return prisma.feature.findMany({
    where: { projectId },
    orderBy: { order: 'asc' },
  })
}

export const insertFeature = async (projectId: string, input: CreateFeatureInput) => {
  return prisma.feature.create({
    data: {
      name: input.name,
      projectId,
    },
  })
}
```

---

## After Writing Every File

After writing or modifying any file, you must run these two commands and resolve all issues before considering the task done:

```bash
npm run lint
npm run typecheck
```

**Rules:**
- Do not move on to the next file if either command produces errors
- Fix every lint error and type error in the file you just wrote — do not suppress them with `// eslint-disable` or `// @ts-ignore`
- If a type error requires a change in another file, make that change and re-run both commands
- Only tell the user the file is done after both commands pass clean

---

## Updating TODOLIST.md

After completing any task, you must update `TODOLIST.md` — but only under these exact conditions:

**Mark `[x]` only when ALL of the following are true:**
- The file exists and is fully written — no placeholder comments, no `// TODO`, no stub functions
- `npm run lint` passes with zero errors
- `npm run typecheck` passes with zero errors
- The logic is correct and you are fully confident in the implementation — not just that it compiles
- Every edge case in the task description is handled — not just the happy path
- Error cases are handled — missing records, unauthorized access, invalid input
- The file is wired up end to end — schema, repo, service, controller, and route are all connected

**Never mark `[x]` if:**
- You are not fully confident the logic is correct
- The task is partially done — e.g. the service exists but the route is not wired up yet
- You wrote the file but skipped error handling or validation
- You made assumptions about behavior that were not confirmed

**Use `[~]` for in-progress tasks** — when a file is written but not yet tested or not fully complete.

**When in doubt, leave it `[ ]`** and tell the user what still needs to be verified before it can be marked done.

At the end of every session, report which items you marked and why. If you are unsure about any item, list it explicitly and ask the user to verify before marking it.

---

## Validation

Every route that accepts a body must have a Zod schema. Place it in the same feature folder as a `[feature].schema.ts` file.

```typescript
import { z } from 'zod'

export const createFeatureSchema = z.object({
  name: z.string().min(1, 'Feature name is required').max(100),
})

export type CreateFeatureInput = z.infer<typeof createFeatureSchema>
```

Pass it to the `validate()` middleware on the route. Never access `req.body` without it being validated first.

---

## Error Handling

Never use try/catch inside controllers or services. Throw typed error classes. The global error handler in `src/core/middleware/error-handler.ts` catches everything.

```typescript
import { NotFoundError } from '@/core/errors/not-found.error'
import { ForbiddenError } from '@/core/errors/forbidden.error'
import { UnauthorizedError } from '@/core/errors/unauthorized.error'

// In a service:
if (!project) {
  throw new NotFoundError('Project not found')
}

if (project.createdById !== userId) {
  throw new ForbiddenError('You do not have access to this project')
}
```

---

## Role Permissions

Use these role rules consistently across all routes. Do not invent new permission patterns.

| Action | TEAM_LEADER | BUSINESS_ANALYST | QUALITY_ASSURANCE | DEVELOPER |
|---|---|---|---|---|
| Create / delete project | ✅ | ❌ | ❌ | ❌ |
| Connect / configure Notion | ✅ | ❌ | ❌ | ❌ |
| Create / delete features | ✅ | ✅ | ❌ | ❌ |
| Assign tickets to features | ✅ | ✅ | ❌ | ❌ |
| Update ticket status | ✅ | ✅ | ✅ | ❌ |
| Read projects, features, tickets | ✅ | ✅ | ✅ | ✅ |
| Trigger manual sync | ✅ | ✅ | ❌ | ❌ |

Client access is token-based via `ClientAccess.token` — not session-based, not role-based. Client routes use a separate `requireClientAuthMiddleware`.

---

## Naming Conventions

| Thing | Convention | Example |
|---|---|---|
| Files | kebab-case | `feature.service.ts` |
| Folders | kebab-case | `src/features/sync-logs/` |
| Functions | camelCase | `createFeatureService` |
| Types / Interfaces | PascalCase | `CreateFeatureInput` |
| Zod schemas | camelCase + Schema suffix | `createFeatureSchema` |
| Route exports | camelCase + Router suffix | `featureRouter` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_SYNC_INTERVAL` |
| Prisma enum values | SCREAMING_SNAKE_CASE | `TEAM_LEADER`, `IN_DEV` |

---

## Security

Never ignore security vulnerabilities. If you spot one, flag it immediately before continuing with the task.

**Ownership checks:**
- Always verify a resource belongs to the current user's organization before reading or modifying it
- Never trust IDs from `req.params` or `req.body` without checking ownership in the service layer
- A user from Org A must never be able to access or modify resources belonging to Org B

**Sensitive field exposure:**
- Never include `notionToken` in any API response — it is encrypted at rest and must never leave the server
- Never expose raw `Session`, `Account`, or `Verification` records in responses
- The client dashboard endpoint (`GET /api/client/:token`) must never return internal fields — no ticket IDs, assignee names, Notion IDs, sync logs, or user info
- Scrub sensitive fields explicitly before returning any response — do not rely on accidentally omitting them

**Input handling:**
- Never trust client input — always validate through Zod before using any value
- Never construct raw SQL or dynamic Prisma queries from unvalidated input
- Never use `any` to bypass type safety on request data

**Tokens and secrets:**
- Never log session tokens, Notion tokens, magic link tokens, or passwords
- Never return a raw error message that reveals internal implementation details (stack traces, Prisma errors, file paths)
- Magic link tokens must be validated via constant-time comparison — never use `===` for token comparison

**Vulnerabilities:**
- If you find a security issue in existing code while working on a task, stop and flag it before proceeding
- Never suppress a security warning with a comment — fix it or ask
- Never use `// @ts-ignore` or `// eslint-disable` to work around a type or lint error that is hiding a real security issue

---

## Staying Up To Date

Before using any method from Better Auth, BullMQ, Prisma, or any other dependency:

1. Check the installed version in `package.json`
2. Use only APIs and methods that exist in that exact version
3. Never use methods marked as deprecated in that version's changelog
4. If the docs you are referencing are for a different version, stop and find the correct version's docs
5. If you are unsure whether a method is current, state that uncertainty and ask before using it

This applies especially to **Better Auth's organizations plugin** — its API changes between versions. Always verify against the installed version, not the latest docs.

---

## When To Ask

Ask before proceeding if the task requires any of the following:

- Adding a new npm package
- Changing or adding to the Prisma schema
- Adding a new folder outside the established structure
- Changing how authentication or session resolution works
- Changing the response shape or the `response` utility
- Introducing a new pattern that does not exist anywhere in the codebase
- Modifying any file in `src/core/` or `src/common/`

For everything else — naming, helper extraction, minor abstractions within a feature module — use your best judgment and follow the existing code as the reference.