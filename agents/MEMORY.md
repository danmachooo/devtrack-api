# MEMORY.md — DevTrack

> Persistent lessons learned across sessions. Codex should read this before starting work and append new takeaways at the end of each session using the format below.

---

## How to Use This File

**At the start of a session:** Read all entries. Let them inform your approach before writing any code.

**At the end of a session:** Generalize the key takeaways from what you just built or fixed and append them as a new dated entry. Only include lessons that would have changed your approach if you had known them earlier.

---

## Entry Format

```
### YYYY-MM-DD — <short title>
<What happened or was discovered>
<What to do differently or remember next time>
```

---

## Known Gotchas (Seeded from Codebase Audit)

### 2025-01-01 — Argon2 password hashing default vs auth config role conflict
The Prisma schema sets `role` default to `DEVELOPER`, but the Better Auth config sets the default to `TEAM_LEADER` for newly created users. The auth layer is the effective source of truth for new signups. Do not rely on the Prisma default when reasoning about what role a freshly created user will have.

### 2025-01-01 — `allowedHeaders` trailing space
The CORS config in `src/app.ts` includes `"Authorization "` with a trailing space. This is the current production behavior. Do not silently fix this unless explicitly asked — changing it could break existing clients.

### 2025-01-01 — Always run `prisma generate` after schema changes
After any edit to `prisma/schema.prisma`, always run:
```bash
npx prisma generate
```
Then run the migration:
```bash
npx prisma migrate dev --name <descriptive-name>
```
Never skip generation. The TypeScript types will be stale otherwise and the build will lie to you.

### 2025-01-01 — `findProjectByIdWithSecrets` is not the default
Normal project reads use a safe select that omits `notionToken`. Only use `findProjectByIdWithSecrets` inside service methods that genuinely need live Notion credentials. If you add a new project read and accidentally include the token, it will leak in API responses.

### 2025-01-01 — Client token comparison is intentionally in-memory
`requireClientAuthMiddleware` loads all client access records and compares tokens in memory using `timingSafeEqual` rather than querying by token directly. This is a deliberate timing-safe security pattern. Do not refactor it to a direct DB lookup without understanding the tradeoff.

### 2025-01-01 — Feature order rebalancing is transactional
When inserting, updating, or deleting features, the surrounding `order` values of neighboring features must be rebalanced inside a Prisma transaction. Do not perform order changes in separate queries — they must be atomic.

### 2025-01-01 — Tickets are never hard-deleted during sync
The sync worker marks absent Notion pages as `isMissingFromSource: true` with a `missingFromSourceAt` timestamp. It never calls `prisma.ticket.delete`. If you add sync-related code, preserve this behavior.

### 2025-01-01 — Redis config has three fallback layers
The app prefers `UPSTASH_REDIS_TCP_URL`, then `REDIS_URL`, then individual `REDIS_HOST/PORT/...` vars. When debugging Redis connection issues, check which layer is actually being used in `src/config/config.ts` before assuming env vars are wrong.

### 2025-01-01 — `activeOrganizationId` drives almost everything
Most internal service methods start by checking `req.user.organizationId`. If this is undefined, the service throws before doing anything else. When writing new services, always add this guard at the top — do not assume it will be set just because `requireAuthMiddleware` ran.

---

<!-- Append new entries below this line after each session -->