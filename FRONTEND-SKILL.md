# Frontend Skill - DevTrack

This document defines the recommended frontend approach for building the DevTrack UI.

It is meant to guide implementation decisions so the frontend feels consistent, modular, and aligned with the backend product flow.

For the current frontend phase, the goal is to build the UI statically first.

That means:

- do not couple the frontend to the backend yet
- do not implement real API integration yet
- use mock data instead
- keep mock data aligned to the real backend response shapes so integration later is straightforward

## Product Intent

DevTrack is not a generic dashboard. It is a system that transforms internal delivery complexity into a client-safe progress story.

That means the frontend should support two different but related experiences:

- an internal team workspace
- a client-facing progress dashboard

These two surfaces should feel connected in brand and quality, but they should not feel identical in density or tone.

## Recommended Design Direction

Use a **premium modern B2B dashboard** style with a **neutral foundation and deep teal accent**.

This is the best fit for DevTrack because it:

- feels professional for internal team operations
- feels trustworthy for clients
- supports dense workflows without looking like an admin template
- avoids the generic look of default Material UI
- avoids the overly soft document feel of a Notion clone

### Visual Character

- calm
- structured
- polished
- high-trust
- quietly premium

### What To Avoid

- default Material UI visual identity
- heavy glassmorphism
- neon startup aesthetics
- overly playful illustrations
- strict monochrome with no semantic color
- a full Notion-like document UI

## Color Direction

Use a neutral base with one strong accent and restrained semantic colors.

### Foundation

- warm off-white background
- soft stone and slate surfaces
- charcoal text
- muted border colors

### Primary Accent

- deep teal

Use the accent for:

- primary actions
- active navigation
- highlighted progress moments
- focused states

### Semantic Colors

- green for completed or healthy states
- amber for in-progress or attention-needed states
- muted red for failure states
- blue-gray for inactive or neutral states

Do not overuse status colors. They should communicate meaning, not decorate the interface.

## Typography

Use a clean modern sans-serif with good readability in both dashboards and dense table views.

Recommended options:

- `Manrope`
- `Geist`
- `Plus Jakarta Sans`

Typography should communicate structure clearly:

- larger, more spacious headings on client-facing pages
- tighter, more operational hierarchy on internal pages

## UX Principles

### 1. Progress Over Raw Data

DevTrack should lead with progress, not tickets.

Always prioritize:

- project progress
- feature progress
- sync freshness
- setup completion

Raw tickets should support the story, not dominate it.

### 2. Progressive Disclosure

Show high-signal summaries first and operational details second.

Examples:

- show progress cards before ticket tables
- show feature summaries before ticket-level inspection
- keep sync diagnostics available but secondary

### 3. Role-Aware UX

The UI should reflect what each role needs most:

- `TEAM_LEADER`: setup, governance, project administration
- `BUSINESS_ANALYST`: feature management, assignment, sync triggers
- `QUALITY_ASSURANCE`: visibility and validation
- `DEVELOPER`: read-only visibility

### 4. Guided Workflow

The UI should naturally guide users through this sequence:

1. Create or join organization
2. Create project
3. Connect Notion
4. Map statuses
5. Trigger first sync
6. Create features
7. Assign tickets
8. Review progress
9. Share client link

Use setup cards, empty states, and contextual next steps to support this flow.

### 5. Trust Through Freshness

Users need to trust the data.

Always make freshness visible:

- last synced time
- sync in progress state
- recent sync outcomes
- empty or stale data messaging

## Experience Split

## Internal Team UI

The internal app should feel like a calm operations workspace.

Recommended traits:

- structured layout
- information-dense where necessary
- strong hierarchy
- excellent filter and table UX
- clear setup states
- visible permissions and action boundaries

Recommended components:

- project setup checklist
- status chips
- progress bars
- filter bars
- sortable feature lists
- data tables
- side panels and dialogs for editing focused records

## Client Dashboard UI

The client dashboard should feel simpler and more presentational.

Recommended traits:

- more whitespace
- fewer controls
- larger type
- stronger emphasis on overall progress
- simple feature progress summaries
- reassurance over operational detail

The client should never feel like they are viewing the internal tool.

## Next.js Skills And Build Recommendations

Use Next.js to create a structured app with strong routing, server rendering where useful, and modular UI composition.

### Recommended Stack Shape

- Next.js App Router
- TypeScript
- server components by default where appropriate
- client components only where interaction is required
- route groups for separating internal and client experiences
- API consumption through typed frontend service modules

### Recommended Route Structure

Example direction:

```text
app/
  (marketing-or-auth)/
    sign-in/
    sign-up/
  (internal)/
    dashboard/
    projects/
    projects/[id]/
    features/
    tickets/
    organization/
  (client)/
    client/[token]/
```

This keeps the internal and client experiences conceptually separate while still living in one app.

### Recommended Next.js Skills

- use nested layouts to keep shared shells consistent
- use server components for read-heavy screens
- use client components for forms, filters, dialogs, and interactive tables
- use loading states and skeletons intentionally for async routes
- use error boundaries for route-level resilience
- use metadata per route for polished browser and sharing behavior
- use route groups to isolate internal and client shells
- use server actions only if they fit the team’s preferred data mutation style

### Data Fetching Guidance

- keep API access centralized in typed modules
- avoid scattering raw fetch calls throughout components
- separate transport logic from rendering logic
- normalize backend responses in one place if needed

Example direction:

```text
src/
  features/
    auth/
      api/
      components/
      hooks/
      types/
    projects/
      api/
      components/
      hooks/
      types/
    tickets/
      api/
      components/
      hooks/
      types/
```

This mirrors the backend feature-slice mindset and makes the frontend easier to scale.

## Modular Frontend Building Approach

Build the frontend in feature modules, not by dumping everything into shared folders too early.

### Recommended Module Shape

Each feature should own:

- API calls
- UI components
- types
- validation if needed
- hooks or state helpers
- local view-model mapping helpers

Example:

```text
src/features/projects/
  api/
  components/
  hooks/
  lib/
  types/
```

### Shared Layer Guidance

Create shared modules only for things that are truly reused:

- base UI primitives
- layout shells
- theme tokens
- utility helpers
- reusable table and form patterns

Do not over-centralize too early.

## Suggested Design System Shape

Recommended design system layers:

```text
src/
  components/
    ui/
    layout/
  features/
  lib/
  styles/
```

Where:

- `components/ui` holds reusable primitives
- `components/layout` holds page shells and navigation structures
- `features` holds domain-specific UI
- `lib` holds app-level helpers and API clients
- `styles` holds tokens, globals, and theme definitions

## Key Screens To Prioritize

Build these first in order:

1. Auth screens
2. Organization setup and invitation flow
3. Project list
4. Project detail page with setup guidance
5. Notion connect and mapping flows
6. Ticket review and assignment UI
7. Progress-focused project overview
8. Client dashboard

## Component Priorities

Important component patterns for DevTrack:

- setup checklist cards
- project summary header
- progress cards
- feature list with ordering support
- ticket table with filters
- role-aware action bars
- sync history list
- share-link panel

## State Management Guidance

Prefer simple state management first.

Suggested approach:

- server state through route-level fetching and feature API modules
- local UI state inside feature components
- introduce a global client store only if multiple distant areas truly need shared interactive state

Avoid overengineering early with a complex global state solution unless the product proves it is needed.

## Accessibility And Usability

The frontend should be visually polished, but it must remain practical.

Always support:

- keyboard navigation
- visible focus states
- strong contrast
- clear labels
- meaningful empty states
- responsive layouts for laptop-first use with mobile-safe behavior

## Final Direction

If choosing one clear direction for DevTrack, choose this:

**Calm premium operations dashboard for internal users, paired with a cleaner progress-story dashboard for clients.**

That means:

- premium modern B2B visual style
- neutral surfaces
- deep teal accent
- modular Next.js App Router architecture
- feature-based frontend structure
- progress-first UX
- role-aware and workflow-guided screens

## Confirmed Decisions

The current recommended frontend direction is now fixed to the following choices:

### App Shape

- one Next.js app for both the internal workspace and client dashboard

### Auth Integration

- the frontend should call the existing custom backend routes such as `/api/auth/*` and `/api/org/*`
- do not switch frontend auth flows to Better Auth client directly

### Component Foundation

- use `shadcn/ui` as the component foundation
- customize it to match DevTrack’s visual identity instead of leaving it at default styling

### Responsive Priorities

- internal workspace: desktop-first
- client dashboard: both mobile and desktop

### Documentation Direction

- this skill should include a stricter implementation guide with exact structure and page-by-page module recommendations

## Strict Frontend Implementation Spec

This section defines the recommended implementation shape for the first DevTrack frontend build.

## Recommended App Architecture

Build one Next.js application using the App Router and route groups to separate experiences cleanly.

Recommended top-level route idea:

```text
app/
  (auth)/
    sign-in/
    sign-up/
  (internal)/
    dashboard/
    projects/
    projects/[id]/
    tickets/
    organization/
    settings/
  (client)/
    client/[token]/
```

This gives one deployable frontend while still separating:

- public auth
- internal authenticated workspace
- public client dashboard

## Recommended Source Structure

Use a modular feature-oriented structure.

```text
src/
  app/
  components/
    ui/
    layout/
    feedback/
  features/
    auth/
    organization/
    projects/
    notion/
    features-management/
    tickets/
    progress/
    sync-logs/
    client-dashboard/
  lib/
    api/
    auth/
    config/
    utils/
  styles/
    globals.css
    tokens.css
  types/
```

## Shared Layer Rules

### `components/ui`

Place reusable `shadcn/ui`-based primitives here:

- button
- input
- card
- dialog
- dropdown-menu
- sheet
- table
- badge
- tabs
- tooltip
- skeleton

Only keep truly reusable primitives in this folder.

### `components/layout`

Place reusable structural pieces here:

- app shell
- sidebar
- header
- page section wrapper
- project detail layout
- client dashboard shell

### `components/feedback`

Place shared feedback components here:

- empty states
- loading blocks
- error states
- success banners
- stale-data notices

## Feature Module Rules

Each feature should own its own logic and rendering helpers.

Recommended feature module shape:

```text
src/features/projects/
  api/
  components/
  hooks/
  lib/
  schemas/
  types/
```

Use this pattern for all major domains.

Inside each feature:

- `api/` contains typed request functions
- `components/` contains feature-specific UI
- `hooks/` contains feature-specific client logic
- `lib/` contains mapping helpers or local utility functions
- `schemas/` contains client-side validation where useful
- `types/` contains local domain types

## Static UI-First Data Rules

For now, the frontend should be built with mock data and mock feature flows.

Do not:

- connect pages directly to the backend yet
- scatter temporary mock objects inside page files
- invent response shapes that differ from the backend contract

Recommended structure:

```text
src/lib/mocks/
  api-shapes.ts
  session.mock.ts
  organization.mock.ts
  projects.mock.ts
  project-detail.mock.ts
  tickets.mock.ts
  client-dashboard.mock.ts
```

Each mock file should export typed data that mirrors the backend response contracts as closely as possible.

### Mock Data Rules

- mock objects should follow the real `{ statusCode, message, data }` response wrapper when simulating API payloads
- individual item shapes should match the backend docs
- IDs should look realistic
- timestamps should be realistic ISO strings
- role values and status values should match backend enums
- never use placeholder shapes that will force major refactors later

### Mock Layer Guidance

Use a small mock access layer so feature components do not care whether data is mocked or real.

Example direction:

```text
src/features/projects/api/
  list-projects.mock.ts
  get-project.mock.ts
```

or

```text
src/features/projects/data/
  list-projects.ts
  get-project.ts
```

Where the current implementation returns mock data, but the exported function names are close to the eventual real data access functions.

This makes it much easier to swap mock implementations for real API calls later.

## Auth Flow Rules

Use your backend routes as the future source of truth for auth and organization flows, but do not integrate them yet in this static UI phase.

For now, create mock session and organization states that simulate these backend flows:

- `/api/auth/sign-up`
- `/api/auth/sign-in`
- `/api/auth/sign-out`
- `/api/auth/session`
- `/api/org/*`

Do not build frontend logic that bypasses these route shapes when defining mock data.

Recommended auth frontend responsibilities:

- session bootstrap
- route guarding for internal screens
- role-aware action visibility
- empty state if no active organization exists

In the static phase, these should be simulated from typed mock state rather than real network requests.

## Layout Guidance

## Internal Workspace Layout

Use a desktop-first application shell:

- left sidebar for primary navigation
- top header for organization context, user menu, and quick actions
- wide main content area optimized for dense project work

Recommended internal navigation:

- Dashboard
- Projects
- Tickets
- Organization

Feature-specific sections like Notion setup and Sync Logs should live inside the project detail experience rather than the global sidebar.

## Client Dashboard Layout

Use a simpler presentation shell:

- top hero area with project name and overall progress
- stacked feature sections
- recent activity section
- mobile-friendly vertical flow

The client dashboard should avoid admin-layout patterns such as sidebars, dense control bars, and large data tables.

## Visual System Guidance

Use `shadcn/ui` only as a foundation. The product should not look like stock `shadcn`.

### Styling Rules

- apply DevTrack color tokens globally
- customize radius, spacing, shadows, and typography
- use subtle borders and restrained shadows
- keep the internal workspace sharper and denser
- keep the client dashboard more spacious and presentational

### Token Direction

Suggested token groups:

- background
- foreground
- surface
- surface-muted
- border
- accent
- accent-foreground
- success
- warning
- danger

## Page-By-Page Frontend Build Order

Build pages in this order.

### Phase 1 - Foundation

1. Global theme tokens
2. App shell
3. Mock data layer
4. Session bootstrap
5. Shared UI primitives

### Phase 2 - Auth

Build:

- sign-in page
- sign-up page
- session check flow

Requirements:

- simple centered layout
- clear error handling
- immediate redirect behavior when authenticated

### Phase 3 - Organization Setup

Build:

- create organization page or panel
- invitation list page
- organization members page

Requirements:

- strong empty states
- clear active organization context
- role-aware actions

### Phase 4 - Project List

Build:

- projects index page
- create project dialog or page

Requirements:

- summary cards or clean table
- visible progress and sync freshness
- clear CTA for creating the first project

### Phase 5 - Project Detail

This is the most important internal screen.

Build sections for:

- project summary
- setup checklist
- notion connection state
- status mapping
- sync trigger
- feature overview
- ticket overview
- client link area

Requirements:

- page should guide the user toward the next incomplete setup step
- setup actions should be contextual and obvious

### Phase 6 - Feature Management

Build:

- feature creation flow
- feature list
- reorder interaction
- rename and delete actions

Requirements:

- should feel editorial and organized
- feature order should be easy to understand visually

### Phase 7 - Tickets

Build:

- project ticket table
- filter bar
- assign/unassign feature controls

Requirements:

- dense but readable
- optimized for desktop use
- clear assignment behavior

### Phase 8 - Sync Logs And Progress

Build:

- sync log list
- project progress presentation
- feature progress blocks

Requirements:

- freshness and system confidence should be obvious

### Phase 9 - Client Dashboard

Build:

- public client page
- mobile and desktop responsive layouts
- feature progress sections
- recent activity display

Requirements:

- calm visual tone
- no internal operational clutter
- strong readability on phone screens

## Feature Responsibilities

## `auth`

Owns:

- sign-in and sign-up forms
- session state bootstrap
- auth route handling

## `organization`

Owns:

- create organization flow
- invitations
- members
- role-driven visibility for org actions

## `projects`

Owns:

- project list
- project summary header
- create and edit project actions
- client access panel

## `notion`

Owns:

- notion connect form
- test connection flow
- database display state
- status mapping form
- sync trigger action state

## `features-management`

Owns:

- feature list
- creation
- rename
- reorder
- delete flow

## `tickets`

Owns:

- ticket table
- filters
- assignment controls

## `progress`

Owns:

- progress cards
- feature progress summaries
- project progress summary blocks

## `sync-logs`

Owns:

- recent sync activity list
- sync result badges
- empty and error states for sync history

## `client-dashboard`

Owns:

- client page shell
- project hero
- overall progress display
- feature progress presentation
- recent activity display

## Practical UI Rules

- internal tables should prioritize scanability over decoration
- destructive actions should be clearly separated from normal actions
- every empty state should point to the next useful action
- progress indicators should always be paired with plain-language labels
- stale or never-synced projects should be visually obvious
- role-limited actions should be hidden or disabled consistently
- mock states should cover happy path, empty state, loading state, and error state screens

## Backend Shape Alignment

Even though the frontend is static for now, shape discipline matters.

Build mock payloads to match the backend contract for:

- auth session
- organization
- invitations
- members
- projects list
- project detail
- features list
- tickets list
- sync logs
- client dashboard

Recommended practice:

- create TypeScript types for the response wrappers and feature payloads
- keep those types close to the mock layer
- map UI-friendly view models from those typed mock payloads only when useful

This avoids building a fake frontend data model that later conflicts with the backend.

## Mobile Guidance

### Internal Workspace

- desktop-first
- mobile can degrade gracefully
- do not optimize complex ticket workflows for phone-first use in the first release

### Client Dashboard

- must work well on mobile and desktop from the first release
- prioritize stacked layouts
- avoid tiny charts or dense tables

## Recommended Next Step

The next useful frontend document after this one is a page inventory and static data plan that maps:

- frontend route
- mock data source
- future backend endpoint
- owning feature module
- required user role
- main components on the page
