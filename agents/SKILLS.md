# SKILLS.md — DevTrack

> What Codex is capable of doing in this codebase, and step-by-step recipes for the most common implementation tasks. Use this to guide implementation — do not improvise patterns that already have a defined recipe here.

---

## Capabilities

Codex is allowed and expected to:

- Add new Prisma models, fields, and relations
- Generate and run Prisma migrations
- Add new API feature modules following the route/controller/service/repo/schema pattern
- Add new middleware (global or per-router)
- Add new Zod validation schemas
- Add new BullMQ jobs or scheduler entries
- Add new Notion integration behaviors
- Extend existing repos, services, and controllers with new methods
- Refactor existing code to preserve or improve consistency with STANDARDS.md
- Append lessons to MEMORY.md at the end of a session
- Create or update PLAN.md to reflect task progress

Codex must not:

- Change auth or session behavior without explicit instruction
- Remove or bypass `requireAuthMiddleware` or `requireRoleMiddleware`
- Delete tickets from the database during sync
- Return cross-org data
- Introduce new dependencies without checking `package.json` first
- Modify MEMORY.md entries that already exist (only append new ones)

---

## Recipe: Add a New API Feature Module

Use this when adding a new domain feature from scratch.

### 1. Create the feature folder

```
src/features/<feature-name>/
```

### 2. Define the Zod schema (`<n>.schema.ts`)

```ts
import { z } from 'zod';

export const createThingSchema = z.object({
  body: z.object({
    name: z.string().min(1),
  }).strict(),
});

export type CreateThingInput = z.infer<typeof createThingSchema>['body'];
```

### 3. Write the repo (`<n>.repo.ts`)

```ts
import { prisma } from '../../lib/prisma.js';

export const createThing = async (data: {
  name: string;
  organizationId: string;
}) => {
  return prisma.thing.create({ data });
};

export const findThingById = async (id: string, organizationId: string) => {
  return prisma.thing.findFirst({ where: { id, organizationId } });
};
```

### 4. Write the service (`<n>.service.ts`)

```ts
import { NotFoundError, AppError } from '../../core/errors/index.js';
import { createThing, findThingById } from './thing.repo.js';
import type { CreateThingInput } from './thing.schema.js';

export const createThingService = async (
  input: CreateThingInput,
  organizationId: string | undefined,
): Promise<{ id: string; name: string }> => {
  if (!organizationId) {
    throw new AppError(400, 'No active organization.');
  }

  const thing = await createThing({ name: input.name, organizationId });
  return { id: thing.id, name: thing.name };
};
```

### 5. Write the controller (`<n>.controller.ts`)

```ts
import type { Request, Response } from 'express';
import { sendResponse } from '../../core/http/index.js';
import { createThingService } from './thing.service.js';
import type { AuthenticatedHttpContext } from '../../common/types/auth.type.js';
import type { CreateThingInput } from './thing.schema.js';

export const createThingController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const body = req.validatedBody as CreateThingInput;
  const { organizationId } = (req as AuthenticatedHttpContext).user;

  const data = await createThingService(body, organizationId);

  sendResponse(res, { statusCode: 201, message: 'Thing created.', data });
};
```

### 6. Define routes (`<n>.routes.ts`)

```ts
import { Router } from 'express';
import { asyncHandler } from '../../core/middleware/async-handler.js';
import { requireRoleMiddleware } from '../../common/middleware/require-role.middleware.js';
import { validate } from '../../core/middleware/validate.js';
import { createThingSchema } from './thing.schema.js';
import { createThingController } from './thing.controller.js';

export const thingRouter = Router();

thingRouter.post(
  '/',
  requireRoleMiddleware('TEAM_LEADER'),
  validate(createThingSchema),
  asyncHandler(createThingController),
);
```

### 7. Register in `src/routes/index.ts`

```ts
import { thingRouter } from '../features/thing/thing.routes.js';

router.use('/things', requireAuthMiddleware, thingRouter);
```

---

## Recipe: Add a New Prisma Model

### 1. Edit `prisma/schema.prisma`

Add the model with all fields and relations. Follow existing model conventions — use `@id @default(cuid())`, use `@map` for snake_case column names if needed.

### 2. Generate the Prisma client

```bash
npx prisma generate
```

### 3. Create and apply the migration

```bash
npx prisma migrate dev --name <descriptive-name>
```

Always use a descriptive migration name like `add-thing-model` or `add-project-client-email`.

### 4. Verify

```bash
npx prisma studio
```

Or query the table directly to confirm the migration applied cleanly.

---

## Recipe: Add a Field to an Existing Model

1. Add the field to `prisma/schema.prisma`
2. If the field is required (non-nullable), provide a `@default(...)` or plan a two-step migration
3. Run `npx prisma generate`
4. Run `npx prisma migrate dev --name add-<field>-to-<model>`
5. Update any repo select objects that need to include the new field
6. Update affected service response shapes and TypeScript types

---

## Recipe: Add a New Background Job

### 1. Define the job payload type in `src/workers/sync.queue.ts`

```ts
export type NewJobPayload = {
  projectId: string;
  someOtherField: string;
};
```

### 2. Add a queue helper

```ts
export const enqueueNewJob = async (payload: NewJobPayload): Promise<void> => {
  await syncQueue.add('new-job-name', payload, {
    jobId: `new-job-${payload.projectId}`,
    removeOnComplete: true,
    removeOnFail: false,
  });
};
```

### 3. Handle the job in `src/workers/sync.worker.ts`

```ts
if (job.name === 'new-job-name') {
  const payload = job.data as NewJobPayload;
  // implementation
}
```

### 4. Call the enqueue helper from the appropriate service

---

## Recipe: Add a New Notion Integration Behavior

1. Read the existing Notion feature: `src/features/notion/`
2. Check `src/lib/notion.ts` for the existing Notion client setup
3. Add your Notion API call to the notion repo
4. Decrypt the project token in the service before passing it to the repo
5. Never store or log the decrypted token
6. If the behavior involves ticket data, check whether it belongs in the sync worker instead of a request handler

---

## Recipe: Extend an Existing Route with a New Endpoint

1. Add the Zod schema to the existing `*.schema.ts`
2. Add the repo method to the existing `*.repo.ts`
3. Add the service method to the existing `*.service.ts`
4. Add the controller method to the existing `*.controller.ts`
5. Register the new route in the existing `*.routes.ts` with appropriate middleware
6. No changes to `src/routes/index.ts` needed unless it is a new router

---

## Recipe: End of Session — Update MEMORY.md

At the end of a session, reflect on what you built or debugged and append a new entry to `MEMORY.md`:

```
### YYYY-MM-DD — <short title>
<What happened, what was discovered, or what tripped you up>
<What to do differently or watch out for next time>
```

Only include lessons that would have changed your approach earlier. Do not add generic observations already covered in STANDARDS.md or CONTEXT.md.

---

## Recipe: Testing After Each Phase

Run these checks after every phase before reporting completion. Do not skip any step.

### Step 1 — Type check

```bash
npx tsc --noEmit
```

Must return zero errors. If it fails, fix all type errors before proceeding.

### Step 2 — Write tests for the phase

Every new or modified endpoint must have a corresponding test file at:

```
src/features/<feature>/<feature>.test.ts
```

For worker changes, the test file lives at:

```
src/workers/sync.worker.test.ts
```

Use **Vitest** as the test runner and **Supertest** to make HTTP requests against the Express app. Mock all external dependencies — Prisma, Notion client, Redis, BullMQ — so tests are fast, isolated, and require no live services.

### Step 3 — Test file structure

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../app.js';

// Mock Prisma
vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    project: {
      findFirst: vi.fn(),
    },
  },
}));

// Mock auth — simulate an authenticated TEAM_LEADER session
vi.mock('../../lib/auth.js', () => ({
  auth: {
    api: {
      getSession: vi.fn().mockResolvedValue({
        user: {
          id: 'user-1',
          email: 'test@example.com',
          name: 'Test User',
          role: 'TEAM_LEADER',
        },
        session: {
          activeOrganizationId: 'org-1',
        },
      }),
    },
  },
}));

describe('GET /api/projects/:projectId/status-mapping/default', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns pre-filled status mapping for a connected project', async () => {
    // arrange
    prisma.project.findFirst.mockResolvedValue({
      id: 'project-1',
      organizationId: 'org-1',
      notionToken: '<encrypted>',
      notionDatabaseId: 'db-1',
    });

    // act
    const res = await request(app)
      .get('/api/projects/project-1/status-mapping/default')
      .set('Cookie', 'session=mock');

    // assert
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      'In Progress': 'IN_DEV',
      'Done': 'APPROVED',
    });
  });

  it('returns 400 when project has no Notion connection', async () => {
    prisma.project.findFirst.mockResolvedValue({
      id: 'project-1',
      organizationId: 'org-1',
      notionToken: null,
      notionDatabaseId: null,
    });

    const res = await request(app)
      .get('/api/projects/project-1/status-mapping/default')
      .set('Cookie', 'session=mock');

    expect(res.status).toBe(400);
  });

  it('returns 404 when project does not exist', async () => {
    prisma.project.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/projects/project-1/status-mapping/default')
      .set('Cookie', 'session=mock');

    expect(res.status).toBe(404);
  });

  it('returns 401 when unauthenticated', async () => {
    auth.api.getSession.mockResolvedValueOnce(null);

    const res = await request(app)
      .get('/api/projects/project-1/status-mapping/default');

    expect(res.status).toBe(401);
  });

  it('returns 403 when role is not TEAM_LEADER', async () => {
    auth.api.getSession.mockResolvedValueOnce({
      user: { id: 'user-2', role: 'DEVELOPER' },
      session: { activeOrganizationId: 'org-1' },
    });

    const res = await request(app)
      .get('/api/projects/project-1/status-mapping/default')
      .set('Cookie', 'session=mock');

    expect(res.status).toBe(403);
  });
});
```

### Step 4 — Minimum test cases per endpoint

Every endpoint must cover at minimum:

| Case | Expected status |
|---|---|
| Happy path — valid input, correct role | 200 / 201 |
| Unauthenticated request | 401 |
| Wrong role | 403 |
| Resource not found | 404 |
| Invalid or missing input | 400 |

### Step 5 — Run the tests

```bash
npx vitest run src/features/<feature>/<feature>.test.ts
```

All tests must pass before reporting phase completion. Paste the actual test output — pass/fail counts — in the phase report. Do not summarize or paraphrase the result.

### Step 6 — Worker tests

For sync worker changes, mock the Notion client and Prisma and assert:

- New tickets are created when Notion pages are new
- Existing tickets are updated when pages still exist
- Missing flags are set when pages disappear from Notion
- Missing flags are cleared when pages reappear
- `SyncLog` is inserted with the correct status
- No tickets are hard-deleted

```ts
vi.mock('../../lib/notion.js', () => ({
  getNotionClient: vi.fn().mockReturnValue({
    databases: {
      query: vi.fn().mockResolvedValue({ results: [...mockPages] }),
    },
  }),
}));
```