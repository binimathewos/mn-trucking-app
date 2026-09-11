# Implementation Plan: Routes & Client Management

**Branch**: `006-routes-clients` | **Date**: 2026-09-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-routes-clients/spec.md`

## Summary

Administrators get a new `/routes` page for creating and managing delivery/transport jobs
(route number, client, pickup/delivery details, optional driver assignment, reference number,
notes, status) and a `/clients` page (linked from Routes, not in the sidebar) for maintaining the
reusable client list used by route forms, including a quick-add-client flow that never loses
in-progress route form data. Two new Prisma models (`Client`, `Route`) are added; `Route` never
stores truck data — truck information is always read live from the assigned driver's existing
`truckNumber` field. Route status auto-syncs with driver presence (`ASSIGNED`/`SCHEDULED`) on
every assign/unassign, while the administrator can always manually override to any non-final
status; `COMPLETED`/`CANCELLED` are locked terminal states. A signed-in driver can reach `/routes`
directly and sees only routes assigned to them (no sidebar link, mirroring how `/dashboard`
already branches by role); `/clients` remains fully admin-only. All authorization is re-checked
server-side in every Server Action, independent of UI visibility.

## Technical Context

**Language/Version**: TypeScript 5 (strict mode), Next.js 16.3.4 App Router, React 19.2.8

**Primary Dependencies**: Prisma 7 + `@prisma/adapter-pg` (PostgreSQL), Zod 4 (server-side
validation), `@clerk/nextjs` (`getSessionAccess`/`resolveAdminOnlyAccess` for authz — no new Clerk
account operations needed by this feature), shadcn/ui + Tailwind CSS 4 + Lucide icons (UI; no
`docs/ui/` reference screenshots exist for this feature — see research.md #1's sibling note in
spec.md Assumptions, so existing Containers/Drivers page patterns are the visual reference)

**Storage**: PostgreSQL via Prisma — two new tables (`Client`, `Route`), two new enums
(`ClientStatus`, `RouteStatus`), one new relation on the existing `Driver` model (`routes
Route[]`); no existing column changes

**Testing**: Vitest — unit tests for the business rules that carry real regression risk: route
status auto-sync/final-state locking, driver-conflict detection (including the
missing-delivery-time skip rule), route-number formatting, and authorization/visibility scoping
(this repo's risk-based testing principle — see constitution §14)

**Target Platform**: Web (Next.js server + browser), desktop-first, responsive to tablet/mobile

**Project Type**: Single Next.js web application (no separate frontend/backend split)

**Performance Goals**: No feature-specific targets beyond normal SaaS admin-page responsiveness;
one trucking company's route volume (hundreds, not millions, of rows) needs no pagination or
virtualization beyond what the existing table components already provide

**Constraints**: All authorization server-side and independent of UI hiding (constitution §9); no
truck field/column anywhere on `Route` (FR-013, FR-040); route number system-generated and unique
(FR-012); cancellation never hard-deletes (FR-022); quick-add-client must not lose in-progress
route form state (FR-035)

**Scale/Scope**: One trucking company's route and client volume; 1 new route group entry point
(`/routes`, dual-role) + 1 new admin-only page (`/clients`); ~9 Server Actions across two
features; 2 new Prisma models

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design — see "Post-Design
Re-check" below.*

| Principle | Assessment |
|---|---|
| 1. Technology Foundation | Uses only the mandated stack; no new dependency needed. PASS |
| 2. Next.js Architecture | `/routes` and `/clients` pages are Server Components fetching data directly; only dialogs, filters, and row-action menus are Client Components; all mutations are Server Actions. PASS |
| 3. Feature-Oriented Architecture | New code lives under `src/features/routes/` and `src/features/clients/` (actions/components/data/lib/types), mirroring `src/features/drivers/` and `src/features/timesheets/`. PASS |
| 4. UI Design System | No `docs/ui/` screenshots exist for Routes/Clients (spec Assumptions); implementation reproduces the existing Containers/Drivers/Timesheets page structure (page header, card, table, dialogs, badges) rather than inventing a new visual language. PASS |
| 5. Responsive Design | Reuses the existing shell/table/dialog components, which are already responsive (FR-036). PASS |
| 6. TypeScript Standards | Strict mode; no `any`; Zod schemas define the validation/domain boundary types for both new features. PASS |
| 7. Data and Persistence | `Route` never duplicates `Client`/`Driver`/truck data — always read through the relation (FR-040, research.md #6); `sequenceNumber` avoids storing a derivable formatted string (research.md #2). No tenant abstractions introduced. PASS |
| 8. Validation and Data Integrity | All mutation inputs validated with Zod server-side; active-client/active-driver/no-conflict/final-state business rules enforced in Server Actions, not just the client-side form. PASS |
| 9. Authentication, Authorization, and Security | Every route-mutation and every client-management action re-checks `resolveAdminOnlyAccess` independently (`assertAdminAccess`, same pattern as `driver-actions.ts`); driver-scoped route reads are always scoped server-side to the caller's own `Driver.id`, never a client-supplied id (FR-003). PASS |
| 10. Component and Code Quality | Reuses `AddClientDialog` unmodified for both the standalone `/clients` page and the routes quick-add flow (research.md #5); reuses the existing `DriverActionError`/`parseDriverActionError` pattern for the two new error classes. PASS |
| 11. Dependency Discipline | No new package added. PASS |
| 12. User Experience States | Loading/empty/no-results/error/success states specified for both `/routes` and `/clients` (FR-009, FR-010). PASS |
| 13. Accessibility | Dialog forms use labeled shadcn form fields; row-actions menus are keyboard-accessible shadcn dropdowns, consistent with `driver-row-actions-menu.tsx`. PASS |
| 14. Testing Strategy | Unit tests target business rules (status auto-sync, conflict detection, route-number formatting, authorization scoping), not presentation components. PASS |
| 15. Quality Gates | Plan assumes `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` all pass before completion (enforced at implementation time, not this command). N/A to plan phase |
| 16. AI Agent Discipline | Reuses `getSessionAccess`, `resolveAdminOnlyAccess`, the drivers/timesheets actions-repository-lib-types split, and the existing `Driver.truckNumber` field rather than introducing a parallel Truck entity or duplicate infrastructure. PASS |

No violations requiring justification — Complexity Tracking is empty.

## Project Structure

### Documentation (this feature)

```text
specs/006-routes-clients/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── routes-clients.md
└── tasks.md              # Phase 2 output (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
prisma/
├── schema.prisma                       # + ClientStatus, RouteStatus enums; + Client, Route models; + Driver.routes relation
└── migrations/
    └── <timestamp>_routes_clients/      # CREATE TABLE Client, Route + indexes

src/
├── app/(admin)/
│   ├── routes/
│   │   ├── page.tsx        # Server Component: role-branches (admin management UI vs. driver's own-routes read view)
│   │   ├── loading.tsx      # NEW: routes loading state
│   │   └── error.tsx         # NEW: routes error state
│   └── (restricted)/
│       └── clients/
│           ├── page.tsx      # Server Component: fetches + renders client directory (admin-only, enforced by existing layout)
│           ├── loading.tsx    # NEW
│           └── error.tsx       # NEW
│
├── components/app-shell/
│   └── nav-items.ts          # + "Routes" entry between "Containers" and "Drivers", roles: ["administrator"]
│
├── features/routes/
│   ├── actions/
│   │   └── route-actions.ts      # createRouteAction, updateRouteAction, assignDriverAction,
│   │                              # unassignDriverAction, setRouteStatusAction, cancelRouteAction
│   ├── components/
│   │   ├── routes-header.tsx           # eyebrow/title/subtitle + "Create route" + "Manage clients" link
│   │   ├── routes-table.tsx             # admin table (all columns from spec's suggested table)
│   │   ├── my-routes-table.tsx           # driver-facing read-only table (subset of columns, no actions)
│   │   ├── route-filters-bar.tsx          # status/driver/client/date filters + search
│   │   ├── route-status-badge.tsx
│   │   ├── route-row-actions-menu.tsx      # Edit / Assign-Reassign driver / Set status / Cancel / View details
│   │   ├── create-route-dialog.tsx          # includes nested quick-add-client (research.md #5)
│   │   ├── edit-route-dialog.tsx
│   │   ├── assign-driver-dialog.tsx
│   │   └── route-details-dialog.tsx
│   ├── data/
│   │   └── route-repository.ts    # getRouteDirectory, getMyRoutes, getRouteById
│   ├── lib/
│   │   ├── route-number.ts         # formatRouteNumber(sequenceNumber)
│   │   ├── route-status.ts          # isFinalStatus, autoStatusForDriverPresence
│   │   ├── driver-conflict.ts        # findConflictingRoute
│   │   └── validation.ts              # Zod schemas (create/update/assign/status input)
│   └── types.ts                        # RouteRow, RouteDirectoryFilters, RouteActionError, parseRouteActionError
│
├── features/clients/
│   ├── actions/
│   │   └── client-actions.ts     # addClientAction, updateClientAction, setClientStatusAction
│   ├── components/
│   │   ├── clients-header.tsx
│   │   ├── clients-table.tsx
│   │   ├── client-status-badge.tsx
│   │   ├── add-client-dialog.tsx   # reused as-is by routes' quick-add flow (research.md #5)
│   │   └── edit-client-dialog.tsx
│   ├── data/
│   │   └── client-repository.ts    # getClientDirectory, getActiveClients
│   ├── lib/
│   │   └── validation.ts             # Zod schemas (add/edit/status input)
│   └── types.ts                        # ClientRow, ClientActionError, parseClientActionError
│
└── features/drivers/
    └── data/driver-repository.ts    # + getActiveDriversForSelect (new export, existing file)

tests/
└── features/
    ├── routes/
    │   ├── route-status.test.ts        # auto-sync + final-state lock rules
    │   ├── driver-conflict.test.ts       # overlap detection incl. missing-delivery-time skip
    │   ├── route-number.test.ts           # formatting
    │   └── authorization.test.ts           # admin-only mutations, driver-scoped read visibility
    └── clients/
        └── validation.test.ts              # required-field + phone/email format rules
```

**Structure Decision**: Single Next.js application, two new feature-oriented modules
(`src/features/routes/`, `src/features/clients/`) following the existing
actions/components/data/lib/types split. `/routes` deliberately sits outside the admin-only
`(restricted)` route group — alongside `(admin)/dashboard/` — because a driver must be able to
reach it and see their own assigned routes (US3); the page itself branches on role, exactly like
`(admin)/dashboard/page.tsx` already does. `/clients` sits inside `(restricted)`, alongside
`drivers`/`containers`/`timesheets`, since it has no driver-facing requirement at all (research.md
#1).

## Post-Design Re-check

Phase 1 design (data-model.md, contracts/, quickstart.md) did not introduce anything the table
above didn't already account for: two new models and two new enums as planned, no new dependency,
no new route group beyond the two pages already listed, and the quick-add-client flow stayed a
component-nesting UI pattern rather than growing into a cross-page state-persistence mechanism.
Constitution Check still PASSES with no violations.

## Complexity Tracking

*No violations — table intentionally empty.*
