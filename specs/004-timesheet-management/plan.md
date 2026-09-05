# Implementation Plan: Timesheet Management

**Branch**: `004-timesheet-management` | **Date**: 2026-09-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-timesheet-management/spec.md`, revised per a
follow-up directive to make this the project's first database-backed feature.

## Summary

Replace the `/timesheets` placeholder with a fully interactive administrator page — reached
through the existing admin-only `(restricted)` route group, so no new access-control work is
needed — that reproduces `docs/ui/timesheets.png` and `docs/ui/add-timesheet.png`: three summary
cards (team hours, submitted count, average daily hours), a driver submissions table with a
driver filter, a week filter, and an Add Timesheet action, a per-row action menu, a driver
timesheet detail view showing daily entries, and full create/edit/delete of those entries with
totals and status recalculated automatically.

**Revision**: This feature now also stands up the project's persistence foundation, per the
constitution's Technology Foundation principle (PostgreSQL + Prisma), which no prior feature had
implemented yet. In scope: a Prisma schema with exactly the three models this feature needs
(`User`, `Driver`, `Timesheet` + its `TimesheetEntry` child), an initial migration, a development
seed script with a realistic driver roster and timesheet history, linking of the Clerk-
authenticated session to a local `User` row by Clerk user ID, a server-side data-access
("repository") layer, Server Actions for every timesheet mutation, and replacement of the
feature's mock data module with these database-backed equivalents. The existing Dashboard's
"Active drivers" and "Hours this week" summary metrics are also wired to the same real data,
since they measure the same underlying facts this feature now persists. Containers, Billing, and
Reports remain unmodeled — nothing in this revision touches those domains.

## Technical Context

**Language/Version**: TypeScript 5.x, strict mode (Next.js 16 / React 19 runtime, Node.js LTS)

**Primary Dependencies**: Next.js App Router, React, Tailwind CSS v4, shadcn/ui (`base-nova`
style) on `@base-ui/react`, Lucide icons, Zod, `@clerk/nextjs` — plus, newly added by this
revision: **`prisma`** and **`@prisma/client`** (the constitution's mandated ORM, not previously
installed by any feature) and **`tsx`** (dev-only, to run the TypeScript seed script — Prisma's
standard seeding mechanism). One local shadcn component is still scaffolded via the existing
`shadcn` CLI: `select` (for the driver/week filter dropdowns).

**Storage**: **PostgreSQL, via Prisma** — this is the first feature to introduce a database.
Schema lives at `prisma/schema.prisma` (repo root, Prisma's standard location); a single
`DATABASE_URL` environment variable (already absent from `.env`, must be added by whoever runs
this — see quickstart.md) points at a local or hosted Postgres instance. Only the three models
this feature needs are defined — `User`, `Driver`, `Timesheet`, `TimesheetEntry` — per
data-model.md. No Containers/Billing/Reports tables are added.

**Testing**: Vitest — unit tests for the pure derivation functions
(`src/features/timesheets/lib/calculations.ts`: status derivation, total-hours, average-daily-
hours, week-date generation), which remain database-agnostic and are the highest-value tests
here (FR-015, FR-016, SC-004). The data-access layer and Server Actions are thin, low-branching
Prisma wrappers plus an authorization check already covered by the existing
`route-access.test.ts`; per the constitution's risk-based testing strategy, they are not
additionally unit-tested with a mocked database, since that would test Prisma itself more than
this feature's logic. Manual verification against a real local Postgres is documented in
quickstart.md.

**Target Platform**: Web browsers (desktop-first, responsive), served by the existing Next.js
application; PostgreSQL as the persistence target (local for development, per quickstart.md)

**Project Type**: Web application — single Next.js project (App Router), no structural change
beyond adding `prisma/` at the repo root (Prisma's required convention, not part of `src/`)

**Performance Goals**: No new performance requirements; queries are scoped to a single week (and
optionally a single driver) at a time, over a dataset sized for one trucking company's roster
(tens of drivers, dozens of timesheet rows per week) — no pagination or indexing strategy beyond
the natural unique constraints in data-model.md is required at this scale

**Constraints**: Page MUST stay reachable only by administrators (already enforced by the
existing `(restricted)` layout; Server Actions additionally re-check this server-side —
authorization must never rely on hidden UI alone, per the constitution); Prisma Client MUST only
ever be imported from server-side code (Server Components, Server Actions, route handlers) —
never from a Client Component; layout/styling MUST closely match
`docs/ui/timesheets.png`/`docs/ui/add-timesheet.png` (FR-018); status derivation, total-hours
calculation, and the one-entry-per-date rule MUST follow the Clarifications in spec.md exactly,
now additionally enforced by a database unique constraint (defense in depth); no tenant/
organization abstractions (single-company app, per constitution Principle 7)

**Scale/Scope**: One page (`/timesheets`, route already exists as a placeholder), one feature
module (`src/features/timesheets/`), the project's first Prisma schema (3 models, 1 enum), one
migration, one seed script, and a small, targeted change to the existing Dashboard feature's data
source (two of its three summary metrics only — container-related data stays mocked, since
Containers is explicitly not modeled by this revision)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|---|---|---|
| 1. Technology Foundation | Next.js App Router, React, TS strict, `src/`, pnpm, Tailwind, shadcn/ui, Lucide, PostgreSQL, Prisma, Clerk, Zod | **Pass** — this revision is what actually brings PostgreSQL/Prisma into the stack for the first time, closing the gap the original plan had left as N/A; `prisma`/`@prisma/client` are the constitution's own named ORM, not a discretionary addition |
| 2. Next.js Architecture | Server Components default; `"use client"` minimized | **Pass** — `timesheets/page.tsx` is a Server Component reading `searchParams` and querying via the repository layer directly; mutations go through Server Actions; only the filter controls and dialogs (which need client state/events) are Client Components |
| 3. Feature-Oriented Architecture | Business logic out of presentation components | **Pass** — status/total-hours derivation stays in pure `lib/calculations.ts`; all Prisma access is isolated in `data/timesheet-repository.ts`; Server Actions in `actions/timesheet-actions.ts` do authorization + validation + a repository call, nothing more |
| 4. UI Design System | Reproduce `docs/ui/` screenshots; reuse shadcn/ui; Lucide icons | **Pass** — unchanged from the original plan; this revision only changes where data comes from, not the UI |
| 5. Responsive Design | Usable at tablet/mobile | **Pass** — unchanged from the original plan |
| 6. TypeScript Standards | Strict mode; no unjustified `any` | **Pass** — Prisma generates fully-typed models; repository functions return the same explicit view-model types (`DriverSubmissionRow`, `TimesheetSummary`, etc.) as before, now sourced from `@prisma/client` types instead of a mock array |
| 7. Data and Persistence | Postgres/Prisma canonical; server-side DB access only; no tenant abstractions | **Pass** — Prisma Client is only imported by `data/timesheet-repository.ts`, `lib/get-or-create-current-user.ts`, and `actions/timesheet-actions.ts`, all server-only modules; no tenant ID or organization-scoping column is introduced anywhere in the schema |
| 8. Validation and Data Integrity | Server-side validation for untrusted input | **Pass** (no longer partial) — this revision introduces a real server boundary: every Server Action validates its input with the `dailyEntryInputSchema` Zod schema before touching the database |
| 9. Authentication, Authorization, Security | Server-enforced role checks, not just hidden UI | **Pass** — each Server Action independently calls `resolveAdminOnlyAccess` (from 003-role-based-navigation) before performing any write, so authorization does not depend on the `(restricted)` layout alone |
| 10. Component and Code Quality | Reuse over duplication; no unrelated refactors | **Pass** — reuses the existing `getSessionAccess`/`resolveAdminOnlyAccess` functions rather than inventing a parallel authorization path; does not touch Containers, Drivers-page, or Reports |
| 11. Dependency Discipline | No unnecessary new packages | **Pass, justified** — `prisma` and `@prisma/client` are explicitly named as required by the constitution's Technology Foundation and were the one piece of that stack not yet installed by any feature; `tsx` is the standard, minimal way to run a TypeScript seed script under Prisma's own seeding convention (`prisma db seed`) |
| 12. User Experience States | Loading/empty/error states present | **Pass** — unchanged requirements; additionally, a failed database query now needs a real error state (not just a mock empty-array case) — see Edge Cases in spec.md and the error handling noted in research.md |
| 13. Accessibility | Semantic HTML, keyboard access, labels, focus | **Pass** — unchanged from the original plan |
| 14. Testing Strategy | Risk-based; required for authz/validation logic | **Pass** — unit tests target `lib/calculations.ts` (status/hours math, the actual regression risk); authorization is already covered by the existing `route-access.test.ts` and is reused, not reimplemented |
| 15. Quality Gates | Lint, typecheck, tests, build must pass | **Pass** — plan includes `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, plus `pnpm prisma migrate deploy`/`generate` as a prerequisite for `build` and `test` to succeed against the new schema |
| 16. AI Agent Discipline | Smallest coherent change; no speculative infra | **Pass** — schema is limited to exactly the models this feature needs (`User`, `Driver`, `Timesheet`, `TimesheetEntry`); no Containers/Billing/Reports tables, no Clerk webhook/sync infrastructure beyond the minimal lazy-upsert this feature actually requires (see research.md #2) |

No violations requiring justification. Complexity Tracking table intentionally omitted.

**Post-Phase 1 re-check**: `research.md`, `data-model.md`, and `contracts/` confirm the schema
stays to exactly three models, all Prisma access stays server-only, Server Actions re-check
authorization independently of the route layout, and status/total-hours derivation stays in the
same pure, unit-tested functions as before (now fed by real rows instead of mock ones). Gate
remains **Pass**.

## Project Structure

### Documentation (this feature)

```text
specs/004-timesheet-management/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
prisma/
├── schema.prisma                                # NEW: User, Driver, Timesheet, TimesheetEntry
│                                                #   models + UserRole enum (data-model.md)
├── seed.ts                                      # NEW: development seed — realistic driver
│                                                #   roster + several weeks of timesheet entries
└── migrations/
    └── <timestamp>_init_timesheets/              # NEW: initial migration, generated via
                                                   #   `pnpm prisma migrate dev --name init_timesheets`

src/
├── app/
│   └── (admin)/
│       ├── dashboard/
│       │   └── page.tsx                          # CHANGED: "Active drivers" and "Hours this
│       │                                        #   week" now sourced from real data via
│       │                                        #   getOperationalSummary() (async); "In
│       │                                        #   inventory" stays mocked (Containers is not
│       │                                        #   modeled by this revision)
│       └── (restricted)/
│           └── timesheets/
│               └── page.tsx                      # CHANGED: Server Component; reads
│                                                #   `searchParams` (driverId?, week?), queries
│                                                #   the repository directly, renders the board
├── components/
│   └── ui/
│       └── select.tsx                            # NEW: shadcn-generated Select primitive
└── lib/
    ├── db/
    │   └── prisma.ts                             # NEW: Prisma Client singleton
    │                                            #   (globalThis-cached, dev-mode safe)
    └── auth/
        └── get-or-create-current-user.ts          # NEW: upserts a `User` row for the signed-in
                                                   #   Clerk session, matched by clerkUserId
                                                   #   (research.md #2)

src/features/
├── dashboard/
│   └── data/
│       └── mock-dashboard-data.ts                # CHANGED: `getOperationalSummary()` becomes
│                                                #   async and delegates its `activeDrivers` /
│                                                #   `hoursThisWeek` fields to the timesheets
│                                                #   repository; `inInventory` and the container
│                                                #   preview functions are untouched (still mock)
└── timesheets/
    ├── types.ts                                  # CHANGED: view-model types now documented
    │                                            #   against Prisma model fields rather than a
    │                                            #   mock array (data-model.md); `Driver` and
    │                                            #   `DriverSubmissionRow` gain `truckNumber`
    │                                            #   (every driver has a truck assigned)
    ├── lib/
    │   └── calculations.ts                       # UNCHANGED in behavior: pure week-range,
    │                                            #   hours-from-time-range, status derivation,
    │                                            #   average-daily-hours — now called by the
    │                                            #   repository layer instead of a mock module.
    │                                            #   `mutations.ts` from the original plan is
    │                                            #   REMOVED: persistence is now Prisma's job
    ├── data/
    │   └── timesheet-repository.ts               # NEW (replaces mock-timesheet-data.ts):
    │                                            #   getTeamDirectory(), getWeekOptions() (pure,
    │                                            #   unchanged), getDriverSubmissions(weekStart,
    │                                            #   driverId?) — returns rows + each driver's
    │                                            #   daily entries for that week in one query
    ├── actions/
    │   └── timesheet-actions.ts                  # NEW: `"use server"` — saveDailyEntryAction,
    │                                            #   deleteDailyEntryAction,
    │                                            #   deleteTimesheetAction; each authorizes via
    │                                            #   resolveAdminOnlyAccess, validates via Zod,
    │                                            #   writes via the repository, then
    │                                            #   revalidatePath("/timesheets")
    └── components/
        ├── timesheets-header.tsx                 # UNCHANGED
        ├── summary-cards.tsx                     # UNCHANGED (server-renderable; receives
        │                                        #   already-computed TimesheetSummary props)
        ├── status-badge.tsx                      # UNCHANGED
        ├── filters-bar.tsx                       # CHANGED: "use client" — stages a pending
        │                                        #   driver/week selection; "Filter" now
        │                                        #   navigates (updates the URL's searchParams)
        │                                        #   instead of updating in-memory client state
        ├── driver-submissions-table.tsx           # UNCHANGED in markup; now server-renderable
        │                                        #   except the per-row action menu, which stays
        │                                        #   a small client island for its dropdown state
        ├── timesheet-entry-dialog.tsx             # CHANGED: "use client" — calls
        │                                        #   saveDailyEntryAction instead of updating
        │                                        #   local state
        └── driver-timesheet-detail-dialog.tsx      # CHANGED: "use client" — renders entries
                                                   #   already fetched by the page (no separate
                                                   #   round trip), plus the driver's assigned
                                                   #   truck (`truckNumber`) as header context;
                                                   #   calls deleteDailyEntryAction /
                                                   #   deleteTimesheetAction
                                                   #   (`timesheets-board.tsx` from the original
                                                   #   plan is REMOVED: the page itself composes
                                                   #   these pieces now that no top-level client
                                                   #   state needs to own the full dataset)

tests/
└── unit/
    └── timesheet-calculations.test.ts             # UNCHANGED scope: week range,
                                                   #   hours-from-time-range, status derivation,
                                                   #   average daily hours (timesheet-mutations
                                                   #   .test.ts from the original plan is REMOVED
                                                   #   along with mutations.ts — see research.md)
```

**Structure Decision**: Single Next.js App Router project. `prisma/` is added at the repo root
per Prisma's required convention (schema/migrations tooling live outside `src/`, same as
`next.config.ts` or `vitest.config.ts` already do — this does not violate the constitution's
`src/` project-structure principle, which governs application code). Within `src/`, the feature
keeps the same `types.ts` / `lib/` / `data/` / `components/` shape as the original plan, adding
one `actions/` folder for Server Actions and a small shared `src/lib/db/` and
`src/lib/auth/get-or-create-current-user.ts` for the two pieces of infrastructure (Prisma client,
Clerk-to-User linkage) that don't belong to the timesheets feature alone. The original plan's
`mutations.ts` and `timesheets-board.tsx` are removed rather than kept alongside the new
Prisma-backed path — the constitution's AI Agent Discipline principle calls for the smallest
coherent change, and carrying forward an unused in-memory mutation path would be dead code, not
a defensible abstraction.
