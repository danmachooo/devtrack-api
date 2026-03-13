# DevTrack API - Agent Instructions

Instructions for AI coding agents (Codex, Cursor, Copilot, etc.) working on this repository. Read this fully before writing any code.

---

## What This Repo Is

A backend REST API for DevTrack - a client-facing project progress dashboard. The API syncs tickets from Notion, maps them to client-facing features, and exposes progress data to internal teams and clients via magic link access.

For full context on the domain, data model, and architecture read `CONTEXT.md` first.

---

## What You Are Allowed To Do

- Read and understand existing code before writing anything
- Write new features that follow the existing patterns exactly
- Refactor existing code when it improves clarity - but only if the task asks for it
- Make small, localized architectural decisions (naming, helper extraction, minor abstractions) on your own
- Create a new custom typed error class when the existing error classes do not cover the needed case, as long as it follows the established error pattern
- Ask before making any decision that affects more than one feature module or the overall structure

---

## What You Must Never Do

- **Change the folder structure** - the layered feature-module pattern is fixed
- **Install new dependencies without asking** - state what it does, why you need it, and whether there is a simpler alternative using what is already installed
- **Modify the Prisma schema without asking** - schema changes affect the entire system and require a migration
- **Change the response shape** - all responses must use the existing response utility and follow `{ statusCode, message, data }`
- **Rewrite working code unprompted** - if existing code works, leave it alone unless the task explicitly says to change it
- **Use `.then()` chains** - async/await only
- **Invent a new export style** - follow the existing file pattern in the module you are touching
- **Write clever or implicit code** - verbose and explicit always

---

## Before You Write Any Code

1. Read `CONTEXT.md` to understand the domain, architecture, and what is already built
2. Find the existing `projects` feature module and read its route, controller, service, repo, and schema files to understand the exact pattern you must follow
3. Identify which files you need to create or modify
4. If the task requires a schema change, a new dependency, or a structural decision - stop and ask first

---

## Folder Structure

The structure is fixed. Do not add, rename, or reorganize folders.

```text
src/
|- app.ts
|- server.ts
|- config/
|- lib/
|- core/
|  |- middleware/
|  |- utils/
|  |- logger/
|  `- types/
|- common/
|  |- middleware/
|  `- types/
|- routes/
`- features/
   `- [feature-name]/
      |- [feature].routes.ts
      |- [feature].controller.ts
      |- [feature].service.ts
      |- [feature].repo.ts
      `- [feature].schema.ts
```

Every new feature gets its own folder under `src/features/` using the same file pattern as the existing modules. Validation schemas live in the same feature folder.

---

## The Pattern - Follow This Exactly

Every feature follows the same vertical slice:

```text
feature.routes.ts -> feature.controller.ts -> feature.service.ts -> feature.repo.ts
```

Use the `projects` and `features` modules as the reference implementation.

### Routes

- `requireAuthMiddleware` is mounted in `src/routes/index.ts` for protected route groups
- Route files usually apply `requireRoleMiddleware(...)` per endpoint
- Use `validateBody`, `validateParams`, and `validateQuery` from `src/core/middleware/validate.ts`
- Controllers are already wrapped with `asyncHandler` inside the controller file, so route files pass the controller directly
- No business logic here - only middleware chain and controller reference

```typescript
import { Router } from 'express'
import { requireRoleMiddleware } from '@/common/middleware/require-role.middleware'
import { validateBody, validateParams } from '@/core/middleware/validate'
import {
  createFeatureController,
  getFeaturesController
} from '@/features/features/feature.controller'
import {
  createFeatureSchema,
  featureProjectIdentifierSchema
} from '@/features/features/feature.schema'

const projectFeatureRouter = Router({ mergeParams: true })

projectFeatureRouter.get(
  '/',
  requireRoleMiddleware(
    'TEAM_LEADER',
    'BUSINESS_ANALYST',
    'QUALITY_ASSURANCE',
    'DEVELOPER'
  ),
  validateParams(featureProjectIdentifierSchema),
  getFeaturesController
)

projectFeatureRouter.post(
  '/',
  requireRoleMiddleware('TEAM_LEADER', 'BUSINESS_ANALYST'),
  validateParams(featureProjectIdentifierSchema),
  validateBody(createFeatureSchema),
  createFeatureController
)

export { projectFeatureRouter }
```

### Controller

- Controllers use `asyncHandler(...)`
- Read validated input from `req.validatedBody`, `req.validatedParams`, and `req.validatedQuery`
- Use `AuthenticatedHttpContext` for protected routes
- Call the service
- Return via `sendResponse`
- No business logic, no Prisma calls, no try/catch

```typescript
import { asyncHandler } from '@/core/middleware/async-handler'
import { sendResponse } from '@/core/utils/response'
import type { AuthenticatedHttpContext } from '@/common/types/auth.type'
import type {
  CreateFeatureInput,
  FeatureProjectIdentifier
} from '@/features/features/feature.schema'
import {
  createFeature,
  listFeatures
} from '@/features/features/features.service'

export const getFeaturesController = asyncHandler(
  async (http: AuthenticatedHttpContext) => {
    const project: FeatureProjectIdentifier = http.req.validatedParams

    const result = await listFeatures(
      project.projectId,
      http.req.user.organizationId
    )

    return sendResponse(http.res, 200, 'Features have been found.', result)
  }
)

export const createFeatureController = asyncHandler(
  async (http: AuthenticatedHttpContext) => {
    const project: FeatureProjectIdentifier = http.req.validatedParams
    const body: CreateFeatureInput = http.req.validatedBody

    const result = await createFeature(
      project.projectId,
      http.req.user.organizationId,
      body
    )

    return sendResponse(http.res, 201, 'Feature has been created.', result)
  }
)
```

### Service

- Contains all business logic
- Calls the repo for data access
- Enforces organization ownership and resource existence
- Throws typed error classes for error cases - never returns error objects
- No HTTP, no Express types

```typescript
import { ForbiddenError } from '@/core/errors/forbidden.error'
import { NotFoundError } from '@/core/errors/not-found.error'
import { findProjectById } from '@/features/projects/projects.repo'
import {
  findFeaturesByProject,
  insertFeature
} from '@/features/features/features.repo'
import type { CreateFeatureInput } from '@/features/features/feature.schema'

export async function listFeatures(
  projectId: string,
  organizationId: string | undefined
) {
  if (!organizationId) {
    throw new ForbiddenError('No active organization selected.')
  }

  const project = await findProjectById(projectId, organizationId)

  if (!project) {
    throw new NotFoundError('Project not found.')
  }

  return findFeaturesByProject(projectId)
}

export async function createFeature(
  projectId: string,
  organizationId: string | undefined,
  input: CreateFeatureInput
) {
  if (!organizationId) {
    throw new ForbiddenError('No active organization selected.')
  }

  const project = await findProjectById(projectId, organizationId)

  if (!project) {
    throw new NotFoundError('Project not found.')
  }

  return insertFeature(projectId, input, 0)
}
```

### Repo

- Prisma calls only
- No business logic
- No error handling - let Prisma errors bubble up to the global error handler
- Includes can be used when needed to support controller responses

```typescript
import { prisma } from '@/lib/prisma'
import type { CreateFeatureInput } from '@/features/features/feature.schema'

export async function findFeaturesByProject(projectId: string) {
  return prisma.feature.findMany({
    where: {
      projectId
    },
    orderBy: {
      order: 'asc'
    },
    include: {
      _count: {
        select: {
          tickets: true
        }
      }
    }
  })
}

export async function insertFeature(
  projectId: string,
  input: CreateFeatureInput,
  order: number
) {
  return prisma.feature.create({
    data: {
      name: input.name,
      order,
      projectId
    }
  })
}
```

---

## Current Conventions To Match

- Route-level auth is usually mounted in `src/routes/index.ts`, not repeated inside every route file
- Protected controllers use `AuthenticatedHttpContext`
- Validated data comes from `req.validatedBody`, `req.validatedParams`, and `req.validatedQuery`
- The shared response helper is `sendResponse`, not `sendSuccess`
- Export style is based on existing files:
  `project.routes.ts` currently uses a default export
  Most controllers, services, repos, and schema files use named exports
- Follow the exact style already used in the feature you are extending instead of trying to normalize the whole repo

---

## After Writing Every File

After writing or modifying any file, you must run these two commands and resolve all issues before considering the task done:

```bash
npm run lint
npm run typecheck
```

Rules:

- Do not move on if either command produces errors caused by your change
- Fix every lint error and type error in the file you just wrote - do not suppress them with `// eslint-disable` or `// @ts-ignore`
- If a type error requires a change in another file, make that change and re-run both commands
- Only tell the user the task is done after both commands pass clean

---

## Updating TODOLIST.md

After completing any task, you must update `TODOLIST.md` - but only under these exact conditions:

Mark `[x]` only when all of the following are true:

- The file exists and is fully written - no placeholder comments, no `// TODO`, no stub functions
- `npm run lint` passes with zero errors
- `npm run typecheck` passes with zero errors
- The logic is correct and you are fully confident in the implementation - not just that it compiles
- Every edge case in the task description is handled - not just the happy path
- Error cases are handled - missing records, unauthorized access, invalid input
- The file is wired up end to end - schema, repo, service, controller, and route are all connected

Never mark `[x]` if:

- You are not fully confident the logic is correct
- The task is partially done - for example the service exists but the route is not wired up yet
- You wrote the file but skipped error handling or validation
- You made assumptions about behavior that were not confirmed

Use `[~]` for in-progress tasks when a file is written but not yet tested or not fully complete.

When in doubt, leave it `[ ]` and tell the user what still needs to be verified before it can be marked done.

At the end of every session, report which items you marked and why. If you are unsure about any item, list it explicitly and ask the user to verify before marking it.

---

## Validation

Every route that accepts body, params, or query input must validate it with Zod using the shared middleware helpers.

```typescript
import { z } from 'zod'

export const ticketProjectIdentifierSchema = z.strictObject({
  id: z.string().uuid()
})

export const createFeatureSchema = z.strictObject({
  name: z.string().min(1, 'Feature name is required').max(100)
})

export type CreateFeatureInput = z.infer<typeof createFeatureSchema>
```

Use:

- `validateBody(schema)` for request bodies
- `validateParams(schema)` for route params
- `validateQuery(schema)` for query strings

Never access raw request input in a controller when a validated version should be used.

---

## Error Handling

Never use try/catch inside controllers or services. Throw typed error classes. The global error handler in `src/core/middleware/error-handler.ts` catches everything.

If the right typed error class does not exist yet, you may create a new custom error class in the existing errors area and follow the same pattern as the current error classes. Do not force an unrelated existing error class just to avoid creating one.

```typescript
import { ForbiddenError } from '@/core/errors/forbidden.error'
import { NotFoundError } from '@/core/errors/not-found.error'

if (!organizationId) {
  throw new ForbiddenError('No active organization selected.')
}

if (!project) {
  throw new NotFoundError('Project not found.')
}
```

---

## Role Permissions

Use these role rules consistently across all routes. Do not invent new permission patterns.

| Action | TEAM_LEADER | BUSINESS_ANALYST | QUALITY_ASSURANCE | DEVELOPER |
|---|---|---|---|---|
| Create / delete project | Yes | No | No | No |
| Connect / configure Notion | Yes | No | No | No |
| Create / delete features | Yes | Yes | No | No |
| Assign tickets to features | Yes | Yes | No | No |
| Update ticket status | Yes | Yes | Yes | No |
| Read projects, features, tickets | Yes | Yes | Yes | Yes |
| Trigger manual sync | Yes | Yes | No | No |

Client access is token-based via `ClientAccess.token`, not session-based and not role-based. Client routes use a separate `require-client-auth` middleware when that feature is introduced.

---

## Naming Conventions

| Thing | Convention | Example |
|---|---|---|
| Files | kebab-case | `feature.service.ts` |
| Folders | kebab-case | `src/features/sync-logs/` |
| Functions | camelCase | `createFeature` |
| Types / Interfaces | PascalCase | `CreateFeatureInput` |
| Zod schemas | camelCase + Schema suffix | `createFeatureSchema` |
| Router exports | match the existing module | `featureRouter`, `projectFeatureRouter` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_SYNC_INTERVAL` |
| Prisma enum values | SCREAMING_SNAKE_CASE | `TEAM_LEADER`, `IN_DEV` |

---

## Security

Never ignore security vulnerabilities. If you spot one, flag it immediately before continuing with the task.

Ownership checks:

- Always verify a resource belongs to the current user's organization before reading or modifying it
- Never trust IDs from `req.params`, `req.query`, or `req.body` without checking ownership in the service layer
- A user from Org A must never be able to access or modify resources belonging to Org B

Sensitive field exposure:

- Never include `notionToken` in any API response - it is encrypted at rest and must never leave the server
- Never expose raw `Session`, `Account`, or `Verification` records in responses
- The client dashboard endpoint `GET /api/client/:token` must never return internal fields such as ticket IDs, assignee names, Notion IDs, sync logs, or user info
- Scrub sensitive fields explicitly before returning any response - do not rely on accidentally omitting them

Input handling:

- Never trust client input - always validate through Zod before using any value
- Never construct raw SQL or dynamic Prisma queries from unvalidated input
- Never use `any` to bypass type safety on request data

Tokens and secrets:

- Never log session tokens, Notion tokens, magic link tokens, or passwords
- Never return a raw error message that reveals internal implementation details such as stack traces, Prisma errors, or file paths
- Magic link tokens must be validated via constant-time comparison - never use `===` for token comparison

Vulnerabilities:

- If you find a security issue in existing code while working on a task, stop and flag it before proceeding
- Never suppress a security warning with a comment - fix it or ask
- Never use `// @ts-ignore` or `// eslint-disable` to work around a type or lint error that is hiding a real security issue

---

## Staying Up To Date

Before using any method from Better Auth, BullMQ, Prisma, or any other dependency:

1. Check the installed version in `package.json`
2. Use only APIs and methods that exist in that exact version
3. Never use methods marked as deprecated in that version's changelog
4. If the docs you are referencing are for a different version, stop and find the correct version's docs
5. If you are unsure whether a method is current, state that uncertainty and ask before using it

This applies especially to Better Auth's organizations plugin - its API changes between versions. Always verify against the installed version, not the latest docs.

---

## When To Ask

Ask before proceeding if the task requires any of the following:

- Adding a new npm package
- Changing or adding to the Prisma schema
- Adding a new folder outside the established structure
- Changing how authentication or session resolution works
- Changing the response shape or the response utility
- Introducing a new pattern that does not exist anywhere in the codebase
- Modifying any file in `src/core/` or `src/common/`

Exception:
- Creating a new custom error class in the existing error class area is allowed when an appropriate typed error does not already exist

For everything else - naming, helper extraction, minor abstractions within a feature module - use your best judgment and follow the existing code as the reference.
