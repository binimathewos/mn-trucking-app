# Implementation Plan: Route-Based Driver Pay

**Branch**: `007-route-driver-pay` | **Date**: 2026-09-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-route-driver-pay/spec.md`

## Summary

Add an hourly driver pay rate to `Route` (money-safe `Decimal`, seeded from a new
administrator-configurable default and independently overridable per route), require a driver to
tag each timesheet entry with one of their currently-assigned routes, and surface a
live-computed calculated pay (`hours × route's current rate`) on both the driver's own timesheet
and the administrator's timesheet view — including a rolled-up total per timesheet. The
non-obvious part of the technical approach: driver self-service timesheet entry doesn't exist in
the codebase today (004 explicitly scoped it out), so this feature also stands up the driver-facing
`/timesheets` view for the first time, following the same role-branching-at-one-URL pattern
already used by `/routes` and `/dashboard` (research.md #1).

## Technical Context

**Language/Version**: TypeScript 5 (strict mode), Next.js 16 (App Router), React 19

**Primary Dependencies**: Prisma ORM 7 (`@prisma/client`, `Decimal` type via bundled
`decimal.js`), Zod 4, Clerk (`@clerk/nextjs`) for auth, shadcn/ui + Tailwind CSS 4, Lucide icons —
all already in the project; no new dependency is introduced (constitution §11)

**Storage**: PostgreSQL via Prisma — extends the existing `Route` and `TimesheetEntry` models, adds
one new singleton model (`DriverPaySettings`)

**Testing**: Vitest (`pnpm test`) — unit tests for pay/decimal math and Zod validation, action-level
tests mocking `prisma`/`getSessionAccess` (existing pattern in `tests/features/routes/*.test.ts`)
for the new authorization branches

**Target Platform**: Web (server-rendered Next.js app, desktop-first responsive per constitution §5)

**Project Type**: Web application (single Next.js app, feature-oriented `src/features/*`)

**Performance Goals**: No new performance requirement beyond the app's existing standard —
one company's route/timesheet volume (hundreds, not millions, of rows), read-time pay calculation
adds one `Decimal` multiply per entry, negligible

**Constraints**: Money values MUST use a decimal/fixed-precision representation, never `Float`
(spec FR-005); all authorization/ownership checks MUST be re-verified server-side, never trusted
from client input (spec FR-004, FR-019, constitution §9)

**Scale/Scope**: Two existing features extended (Routes, Timesheets), one new small feature added
(`src/features/settings/`), one new driver-facing page route

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Assessment |
|---|---|
| 1. Technology Foundation | Pass — uses only the mandated stack; no new package |
| 2. Next.js Architecture | Pass — pay/rate display computed server-side in Server Components/repository functions; the two new form dialogs are the only Client Components, matching existing `"use client"` dialog patterns |
| 3. Feature-Oriented Architecture | Pass — changes stay inside `src/features/routes/`, `src/features/timesheets/`, and one new `src/features/settings/`; the one cross-feature call (`isRouteAssignedToDriver`) lives with the domain it belongs to (Routes) and is imported, not duplicated |
| 4. UI Design System | Pass — reuses existing shadcn/ui `Select`/`Input`/`Dialog`/`Card` components and the two authoritative screenshots (`add-timesheet.png`, `drive-add-timesheet.png`) for layout; deviations from those screenshots (Route field added, no Break field) are justified in research.md #2 |
| 5. Responsive Design | Pass — new fields/columns added to existing responsive dialogs/tables; no fixed dimensions introduced |
| 6. TypeScript Standards | Pass — no `any`; new Zod-inferred types for rate/pay inputs |
| 7. Data and Persistence | Pass — one new singleton table, no tenant/org abstractions; all new DB access server-side |
| 8. Validation and Data Integrity | Pass — all new inputs (`hourlyRate`, `defaultHourlyRate`, `routeId`) validated server-side with Zod, business invariant (route must be assigned to the entry's driver) enforced server-side |
| 9. AuthN/AuthZ/Security | Pass — every mutation re-checks role server-side (`assertAdminAccess` for rate changes; the new driver path in `saveDailyEntryAction` forces `driverId` from the session, never client input) |
| 10. Component and Code Quality | Pass — reuses `TimesheetEntryDialog`, `CreateRouteDialog`/`EditRouteDialog`, existing repository/action patterns; no unrelated refactor |
| 11. Dependency Discipline | Pass — no new npm package |
| 12. User Experience States | Pass — empty Route-select state when a driver has no assigned routes (spec US1 AC2), "not available" state for legacy entries without a route (FR-021) |
| 13. Accessibility | Pass — new form fields use the same labeled `Select`/`Input` components already used elsewhere in these forms |
| 14. Testing Strategy | Pass — risk-based: tests target the new authorization/ownership rule and the pay calculation, not incidental UI |
| 15. Quality Gates | Pass — lint/typecheck/test/build required before completion, per existing project scripts |
| 16. AI Agent Discipline | Pass — smallest coherent change; reuses `assertAdminAccess`, `isFinalStatus`/`loadMutableRoute`, `upsertDailyEntry`'s existing upsert-by-date semantics instead of inventing new mechanisms |

No violations — Complexity Tracking is not needed.

## Project Structure

### Documentation (this feature)

```text
specs/007-route-driver-pay/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output
├── data-model.md         # Phase 1 output
├── quickstart.md         # Phase 1 output
├── contracts/
│   └── route-driver-pay.md
└── tasks.md              # Phase 2 output (/speckit-tasks command — not created by /speckit-plan)
```

### Source Code (repository root)

```text
prisma/
├── schema.prisma                       # CHANGED: Route.hourlyRate, TimesheetEntry.routeId,
│                                        #          new DriverPaySettings model
└── migrations/
    └── <timestamp>_route_driver_pay/   # NEW: generated by `prisma migrate dev`

src/
├── app/(admin)/
│   ├── timesheets/                     # NEW location (moved out of (restricted)/)
│   │   ├── page.tsx                    # CHANGED: role-branches like routes/page.tsx
│   │   └── error.tsx                   # CARRIED OVER from (restricted)/timesheets/
│   ├── (restricted)/
│   │   ├── timesheets/                 # REMOVED (moved to (admin)/timesheets/)
│   │   └── settings/
│   │       └── page.tsx                # CHANGED: renders the new default-rate form
│   └── routes/
│       └── page.tsx                    # CHANGED: passes current default rate to CreateRouteDialog
│
├── components/app-shell/
│   └── nav-items.ts                    # CHANGED: Timesheets roles gains "driver"
│
├── features/
│   ├── routes/
│   │   ├── actions/route-actions.ts    # CHANGED: create/update accept hourlyRate
│   │   ├── data/route-repository.ts    # CHANGED: hourlyRate in RouteRow; NEW isRouteAssignedToDriver
│   │   ├── lib/validation.ts           # CHANGED: hourlyRate Zod field
│   │   ├── types.ts                    # CHANGED: hourlyRate on RouteRow/Create/UpdateRouteInput
│   │   └── components/
│   │       ├── create-route-dialog.tsx # CHANGED: Driver Hourly Rate field
│   │       ├── edit-route-dialog.tsx   # CHANGED: Driver Hourly Rate field
│   │       └── route-details-dialog.tsx# CHANGED: shows Driver Hourly Rate
│   │
│   ├── timesheets/
│   │   ├── actions/timesheet-actions.ts# CHANGED: saveDailyEntryAction allows DRIVER callers
│   │   ├── data/timesheet-repository.ts# CHANGED: route/rate/pay joined into DailyEntry + total pay
│   │   ├── lib/calculations.ts         # CHANGED: routeId in dailyEntryInputSchema; NEW pay helpers
│   │   ├── types.ts                    # CHANGED: DailyEntry/DriverSubmissionRow pay fields
│   │   └── components/
│   │       ├── timesheet-entry-dialog.tsx        # CHANGED: Route select field
│   │       ├── driver-timesheet-detail-dialog.tsx# CHANGED: shows route/rate/pay per day + total
│   │       ├── my-timesheet-summary.tsx          # NEW: driver's own summary cards
│   │       └── my-timesheet-table.tsx            # NEW: driver's own entries table
│   │
│   └── settings/                        # NEW feature
│       ├── data/driver-pay-settings-repository.ts
│       ├── actions/driver-pay-settings-actions.ts
│       ├── lib/validation.ts
│       ├── types.ts
│       └── components/default-driver-rate-card.tsx
│
tests/
├── features/routes/
│   └── validation.test.ts               # CHANGED: hourlyRate cases
├── features/timesheets/                  # NEW directory
│   ├── authorization.test.ts             # driver-vs-admin route-assignment enforcement
│   └── calculations.test.ts              # pay derivation, routeId requirement
├── features/settings/                    # NEW directory
│   └── authorization.test.ts             # administrator-only default-rate enforcement
└── unit/
    └── timesheet-calculations.test.ts    # CHANGED: pay math cases
```

**Structure Decision**: Single Next.js application, feature-oriented under `src/features/*`
(existing convention — constitution §3). No frontend/backend split; Server Actions and
Server-Component data-access functions are the only interface surface (matches
`006-routes-clients`, `004-timesheet-management`). The one structural change is moving
`timesheets/` out of the `(admin)/(restricted)/` route group so a driver-role session can reach it
(research.md #1) — `settings/` stays inside `(restricted)` since the default rate remains
administrator-only.
