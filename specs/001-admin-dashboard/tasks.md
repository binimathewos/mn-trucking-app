---

description: "Task list for Administrator Dashboard implementation"
---

# Tasks: Administrator Dashboard

**Input**: Design documents from `/specs/001-admin-dashboard/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included — plan.md commits to Vitest unit tests for the feature's pure business
logic (storage-duration derivation, greeting selection, role-based route access), per the
constitution's requirement to test calculations and authorization rules.

**Organization**: This feature has a single user story (US1, P1). Setup and Foundational tasks
establish shared infrastructure; all feature work is grouped under US1.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1) — omitted for Setup, Foundational,
  and Polish tasks
- Include exact file paths in descriptions

## Path Conventions

Single Next.js App Router project under `src/`, per plan.md's Structure Decision:
`src/app/(admin)/...`, `src/components/app-shell/...`, `src/features/dashboard/...`,
`src/lib/auth/...`, `tests/unit/...`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install and configure the tooling this feature needs that the project scaffold
does not yet have.

- [X] T001 Install runtime dependencies: `pnpm add @clerk/nextjs zod lucide-react`; install dev
  dependency: `pnpm add -D vitest`
- [X] T002 Initialize shadcn/ui (`components.json`) and add primitives — `card`, `table`,
  `input`, `button`, `badge`, `avatar`, `dropdown-menu`, `separator`, `skeleton` — into
  `src/components/ui/`
- [X] T003 Add `typecheck` (`tsc --noEmit`) and `test` (`vitest run`) scripts to `package.json`
  alongside the existing `lint`/`build` scripts
- [X] T004 [P] Create `vitest.config.ts` at the repository root, configured to discover tests
  under `tests/unit/`
- [X] T005 Wrap the root layout with `<ClerkProvider>` in `src/app/layout.tsx`, and document the
  required Clerk environment variables (e.g., in `.env.local.example`)

**Checkpoint**: Project can install, lint, typecheck, test, and build with the new tooling in
place (no feature code yet).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared types and the authorization decision this feature's single user story
depends on before any dashboard UI can be reached.

**⚠️ CRITICAL**: No User Story 1 work can begin until this phase is complete.

- [X] T006 [P] Define dashboard TypeScript types (`OperationalSummary`,
  `ContainerInventoryRecord`, `DashboardInventoryPreview`) in `src/features/dashboard/types.ts`
  per data-model.md
- [X] T007 [P] Implement the `resolveRouteAccess` pure function in
  `src/lib/auth/route-access.ts` per contracts/route-access.md (render for administrator;
  redirect to sign-in when signed out; redirect to driver-area for any other role, including
  unrecognized/missing roles — fail closed)
- [X] T008 Unit test `resolveRouteAccess` in `tests/unit/route-access.test.ts`, covering:
  signed-out → sign-in redirect, administrator → render, driver → driver-area redirect, and an
  unrecognized/missing role → driver-area redirect (fail-closed case) (depends on: T007)
- [X] T009 Implement Clerk middleware in `src/middleware.ts` protecting the `(admin)` route
  group, using `resolveRouteAccess` to redirect unauthenticated requests to sign-in before
  rendering (depends on: T007)

**Checkpoint**: Foundation ready — shared types and the auth-gate decision exist; User Story 1
UI implementation can now begin.

---

## Phase 3: User Story 1 - View Operational Dashboard (Priority: P1) 🎯 MVP

**Goal**: An Administrator who signs in lands on a fully rendered operational dashboard (shell,
header, summary cards, container inventory preview) built from mock data, while Drivers and
unauthenticated visitors are redirected away.

**Independent Test**: Sign in as an Administrator, land on `/dashboard`, and confirm the shell,
header, summary cards, and container inventory preview all render with data — verified via
quickstart.md scenarios 1–8 — without any other feature (Timesheets, Containers, Drivers,
Reports, Settings) being functionally implemented.

### Implementation for User Story 1

- [X] T010 [P] [US1] Create sidebar nav item config (label, route, Lucide icon for Dashboard,
  Timesheets, Containers, Drivers, Reports, Settings) in `src/components/app-shell/nav-items.ts`
- [X] T011 [US1] Build the Sidebar component (company logo/branding, nav items with active-page
  highlighting, user profile block) in
  `src/components/app-shell/sidebar.tsx` (depends on: T010)
- [X] T012 [P] [US1] Build the TopNav component (user avatar/initials) in
  `src/components/app-shell/top-nav.tsx`
- [X] T013 [US1] Implement the Administrator shell layout in `src/app/(admin)/layout.tsx`:
  compose Sidebar + TopNav, read the Clerk session server-side, call `resolveRouteAccess`, and
  redirect Drivers to the driver-area (defense in depth alongside T009's middleware) (depends
  on: T007, T011, T012)
- [X] T014 [P] [US1] Implement the storage-duration derivation function in
  `src/features/dashboard/lib/storage-duration.ts` per data-model.md (whole calendar days
  between received date and checked-out date or today; `receivedDate` is required, so no
  missing-value fallback is needed)
- [X] T015 [US1] Unit test storage-duration in `tests/unit/storage-duration.test.ts`: received
  date only (measured through today) and received + checked-out date (depends on: T014)
- [X] T016 [P] [US1] Implement the time-of-day greeting function in
  `src/features/dashboard/lib/greeting.ts` (morning/afternoon/evening selection)
- [X] T017 [US1] Unit test greeting in `tests/unit/greeting.test.ts`, covering each boundary
  between morning, afternoon, and evening (depends on: T016)
- [X] T018 [P] [US1] Define the mock dashboard data module — `getOperationalSummary()` and
  `getContainerInventoryPreview(searchText?)` — in
  `src/features/dashboard/data/mock-dashboard-data.ts` per contracts/dashboard-data.md,
  including a small fixed-size preview, a zero-value variant, and an empty-inventory variant
  for edge-case coverage (depends on: T006)
- [X] T019 [P] [US1] Build the DashboardHeader component (current date, time-of-day greeting
  with the Administrator's first name, overview message) in
  `src/features/dashboard/components/dashboard-header.tsx` (depends on: T016)
- [X] T020 [P] [US1] Build the SummaryCards component (Active Drivers, Hours This Week, In
  Inventory — each with icon, primary value, label, and trend indicator, including the zero-value
  state) in `src/features/dashboard/components/summary-cards.tsx` (depends on: T006)
- [X] T021 [US1] Build the ContainerInventoryCard component — table with container number,
  customer, location, received date, storage duration, and status columns; status badge for "In
  Warehouse"/"Checked Out"; search input; Check In action entry point (no persistence); row
  action menu; "View inventory" link; empty-inventory and no-search-results states; truncation or
  wrapping (per column, so a long customer name or container number does not break the row
  layout) — in `src/features/dashboard/components/container-inventory-card.tsx` (depends on:
  T006, T014, T018)
- [X] T022 [US1] Assemble the dashboard page, wiring DashboardHeader, SummaryCards, and
  ContainerInventoryCard to the mock data module, in `src/app/(admin)/dashboard/page.tsx`
  (depends on: T018, T019, T020, T021)
- [X] T023 [P] [US1] Create the Timesheets placeholder page in
  `src/app/(admin)/timesheets/page.tsx`
- [X] T024 [P] [US1] Create the Containers placeholder page in
  `src/app/(admin)/containers/page.tsx`
- [X] T025 [P] [US1] Create the Drivers placeholder page in `src/app/(admin)/drivers/page.tsx`
- [X] T026 [P] [US1] Create the Reports placeholder page in `src/app/(admin)/reports/page.tsx`
- [X] T027 [P] [US1] Create the Settings placeholder page in `src/app/(admin)/settings/page.tsx`
- [X] T028 [US1] Implement responsive shell behavior for tablet and mobile widths (navigation
  remains reachable via a collapsed/toggled pattern; no overlapping content or horizontal page
  scroll) in `src/components/app-shell/sidebar.tsx` and `src/app/(admin)/layout.tsx` (depends
  on: T011, T013)
- [X] T029 [US1] Apply keyboard accessibility — visible focus-visible states and appropriate
  ARIA labels — across sidebar links, the search field, Check In, row action menus, and View
  inventory, in `src/components/app-shell/sidebar.tsx`, `src/components/app-shell/top-nav.tsx`,
  and `src/features/dashboard/components/container-inventory-card.tsx` (depends on: T011, T012,
  T021)

**Checkpoint**: User Story 1 is fully functional and independently testable — quickstart.md
scenarios 1–8 all pass.

---

## Phase 4: Polish & Cross-Cutting Concerns

**Purpose**: Final verification against the constitution's quality gates and the quickstart
guide.

- [X] T030 [P] Execute quickstart.md validation scenarios 1–8 end-to-end (administrator view,
  status/search, Check In/View inventory entry points, placeholder navigation, route access
  control, responsive behavior, keyboard accessibility, zero/empty states)
- [X] T031 [P] Run `pnpm lint` and resolve any errors
- [X] T032 [P] Run `pnpm typecheck` and resolve any errors
- [X] T033 [P] Run `pnpm test` and confirm all unit tests pass
- [X] T034 Run `pnpm build` and confirm the production build succeeds (depends on: T030–T033)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS User Story 1
- **User Story 1 (Phase 3)**: Depends on Foundational phase completion
- **Polish (Phase 4)**: Depends on User Story 1 completion

### Within User Story 1

- Shell pieces (T010–T013) before the layout guard is complete; header/logic (T014–T020) can
  proceed in parallel with shell work
- ContainerInventoryCard (T021) depends on the storage-duration function (T014) and the mock
  data module (T018)
- Dashboard page assembly (T022) depends on all three feature components (T019, T020, T021) and
  the mock data module (T018)
- Placeholder pages (T023–T027) depend only on the shell layout (T013) existing, and are
  independent of each other and of the dashboard page itself
- Responsive (T028) and accessibility (T029) passes depend on the shell and inventory card
  existing, and are best done once T011–T013 and T021 are in place

### Parallel Opportunities

- Foundational: T006 and T007 can run in parallel (different files, no shared dependency)
- User Story 1: T010, T012, T014, T016, T018, T019, T020 can each start in parallel once their
  single listed dependency (if any) is satisfied
- User Story 1: T023, T024, T025, T026, T027 (the five placeholder pages) can all run in
  parallel once T013 (shell layout) is done
- Polish: T030, T031, T032, T033 can run in parallel; T034 (build) runs last

---

## Parallel Example: Foundational Phase

```bash
Task: "Define dashboard TypeScript types in src/features/dashboard/types.ts per data-model.md"
Task: "Implement the resolveRouteAccess pure function in src/lib/auth/route-access.ts per contracts/route-access.md"
```

## Parallel Example: User Story 1 (after Foundational completes)

```bash
Task: "Create sidebar nav item config in src/components/app-shell/nav-items.ts"
Task: "Build the TopNav component in src/components/app-shell/top-nav.tsx"
Task: "Implement the storage-duration derivation function in src/features/dashboard/lib/storage-duration.ts"
Task: "Implement the time-of-day greeting function in src/features/dashboard/lib/greeting.ts"
Task: "Define the mock dashboard data module in src/features/dashboard/data/mock-dashboard-data.ts"
Task: "Build the SummaryCards component in src/features/dashboard/components/summary-cards.tsx"
```

## Parallel Example: Placeholder Pages (after T013)

```bash
Task: "Create the Timesheets placeholder page in src/app/(admin)/timesheets/page.tsx"
Task: "Create the Containers placeholder page in src/app/(admin)/containers/page.tsx"
Task: "Create the Drivers placeholder page in src/app/(admin)/drivers/page.tsx"
Task: "Create the Reports placeholder page in src/app/(admin)/reports/page.tsx"
Task: "Create the Settings placeholder page in src/app/(admin)/settings/page.tsx"
```

---

## Implementation Strategy

### MVP First (and Only) Scope

Since this feature has a single user story, the MVP is the whole feature:

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (blocks all feature work)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Run quickstart.md scenarios 1–8 independently
5. Complete Phase 4: Polish (quality gates), then deploy/demo

### Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [US1] label maps every feature task to the single user story for traceability
- Commit after each task or logical group
- Stop at the Phase 3 checkpoint to validate the story independently before polish
- Avoid: vague tasks, same-file conflicts, and any work on Timesheets/Containers/Drivers/
  Reports/Settings beyond their placeholder pages (explicitly out of scope per spec.md)
