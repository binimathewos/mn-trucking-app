---

description: "Task list template for feature implementation"
---

# Tasks: Timesheet Management

**Input**: Design documents from `/specs/004-timesheet-management/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md (all present)

**Tests**: Included for `src/features/timesheets/lib/calculations.ts` only — plan.md's Technical
Context explicitly calls these out as required, risk-based unit tests (status/total-hours
derivation is where a regression would silently produce wrong numbers). No other test tasks are
generated, since spec.md does not request a TDD approach and the repository/Server Action layer
is intentionally left to manual `quickstart.md` verification (plan.md, Testing).

**Organization**: spec.md defines exactly one user story (US1, P1). Tasks are grouped into Setup,
Foundational (the persistence foundation this revision adds — reusable by future features, not
specific to Timesheet Management itself), a single User Story 1 phase (the feature itself), and
Polish.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1) — omitted for Setup/Foundational/Polish
- Every task includes its exact file path

## Path Conventions

Single Next.js project (App Router). `prisma/` lives at the repo root; application code lives
under `src/`, per plan.md's Project Structure.

---

## Phase 1: Setup

**Purpose**: Bring in the tooling this revision needs before any schema or feature code exists.

- [X] T001 Add `prisma` and `@prisma/client` to `dependencies` and `tsx` to `devDependencies` in `package.json`; add a `"prisma": { "seed": "tsx prisma/seed.ts" }` block so `pnpm prisma db seed` works (plan.md, research.md #8)
- [X] T002 [P] Add a local `DATABASE_URL` connection string to `.env` (not committed) pointing at a running PostgreSQL instance, per `quickstart.md` Setup
- [X] T003 [P] Generate the shadcn `select` primitive by running `pnpm dlx shadcn add select`, producing `src/components/ui/select.tsx` (research.md #6, for the driver/week filter dropdowns)

**Checkpoint**: Tooling and dependencies are in place; no schema or feature code exists yet.

---

## Phase 2: Foundational (Persistence Foundation)

**Purpose**: Stand up the database, ORM, and Clerk-linkage infrastructure this feature adds —
this is what makes it the project's first database-backed feature. **MUST** complete before any
User Story 1 task below.

**⚠️ CRITICAL**: No feature code in Phase 3 can run without this phase's schema and generated
Prisma client.

- [X] T004 Author `prisma/schema.prisma`: `generator client`, `datasource db` (postgresql), the `UserRole` enum, and the `User`, `Driver`, `Timesheet`, `TimesheetEntry` models with their fields, relations, and `@@unique` constraints, exactly as specified in `data-model.md` (depends on T001)
- [X] T005 Run `pnpm prisma migrate dev --name init_timesheets` to generate and apply the initial migration under `prisma/migrations/` (depends on T004)
- [X] T006 [P] Create the cached Prisma Client singleton in `src/lib/db/prisma.ts` (globalThis-cached dev-mode pattern, research.md #10) (depends on T005)
- [X] T007 [P] Implement `getOrCreateCurrentUser()` in `src/lib/auth/get-or-create-current-user.ts` — upserts a `User` row by `clerkUserId` using the existing `getSessionAccess()`, per `contracts/user-linking.md` (depends on T005, T006)
- [X] T008 Create `prisma/seed.ts`: one Administrator `User`, a handful of Driver-role `User` + `Driver` rows with realistic names, `roleType` classifications, and distinct `truckNumber`s, and 2–3 weeks of `Timesheet` + `TimesheetEntry` rows covering all three statuses (Submitted, Draft, Not Submitted for the current week), per research.md #8 (depends on T005)
- [X] T009 Run `pnpm prisma db seed` to populate the local development database (depends on T008)

**Checkpoint**: Database schema, migration, Prisma client, Clerk-to-User linkage, and seed data
all exist and are populated — the persistence foundation is ready for the feature itself.

---

## Phase 3: User Story 1 - Administrator Views and Manages Driver Timesheets (Priority: P1) 🎯 MVP

**Goal**: Replace the `/timesheets` placeholder with a fully interactive, database-backed
administrator page: summary cards, a filterable driver submissions table, a driver timesheet
detail view, and full create/edit/delete of daily entries — matching `docs/ui/timesheets.png`
and `docs/ui/add-timesheet.png` — plus wiring the existing Dashboard's "Active drivers" and
"Hours this week" metrics to the same real data.

**Independent Test**: Sign in as an administrator, open the Timesheets page, and confirm summary
metrics and a driver submissions table render from seeded data; filter by driver and by week;
open a driver's timesheet to see its daily entries; create, edit, and delete a daily entry and
confirm totals/status update immediately; confirm the change survives a server restart.

### Tests for User Story 1

> **NOTE: Write T010 first and confirm it fails before implementing T012.**

- [X] T010 [P] [US1] Unit tests for week-date generation, hours-from-time-range, status derivation, total-hours, last-submitted-at, average-daily-hours, and the `getTimesheetSummary` aggregation (totalTeamHours, submittedCount, totalDriverCount, averageDailyHours) in `tests/unit/timesheet-calculations.test.ts`, per `contracts/timesheet-data.md` and the status table in `data-model.md`

### Implementation for User Story 1

- [X] T011 [P] [US1] Define view-model types (`Driver`, `DailyEntry`, `DriverSubmissionRow`, `TimesheetSummary`, `WeekOption`, `TimesheetStatus`) in `src/features/timesheets/types.ts`, per `data-model.md`
- [X] T012 [US1] Implement the pure functions `getWeekDates`, `computeHoursFromTimeRange`, `deriveStatus`, `deriveTotalHours`, `deriveLastSubmittedAt`, `computeAverageDailyHours`, `getTimesheetSummary(rows: DriverSubmissionRow[]): TimesheetSummary`, and the `dailyEntryInputSchema` Zod schema in `src/features/timesheets/lib/calculations.ts` to make T010 pass (depends on T010, T011)
- [X] T013 [US1] Implement `getTeamDirectory()`, `getWeekOptions()`, and `getDriverSubmissions(weekStart, driverId?)` in `src/features/timesheets/data/timesheet-repository.ts`, per `contracts/timesheet-data.md` (depends on T012, T006)
- [X] T014 [US1] Implement `upsertDailyEntry()`, `deleteDailyEntry()`, and `deleteTimesheet()` in `src/features/timesheets/data/timesheet-repository.ts`, per `contracts/timesheet-data.md` (depends on T013)
- [X] T015 [US1] Implement `saveDailyEntryAction`, `deleteDailyEntryAction`, and `deleteTimesheetAction` as `"use server"` functions in `src/features/timesheets/actions/timesheet-actions.ts` — each authorizes via `resolveAdminOnlyAccess`/`getSessionAccess`, validates via `dailyEntryInputSchema`, calls the matching repository function, then calls `revalidatePath("/timesheets")` (depends on T014)
- [X] T016 [P] [US1] Build `src/features/timesheets/components/timesheets-header.tsx` (breadcrumb, title, subtitle, and the page-level "Add Timesheet" button that opens `timesheet-entry-dialog` in create mode) per `docs/ui/timesheets.png`
- [X] T017 [P] [US1] Build `src/features/timesheets/components/summary-cards.tsx` (team hours, submitted count, average daily hours) receiving a `TimesheetSummary` prop, stacking to a single column below the `sm` breakpoint, per `docs/ui/timesheets.png` (depends on T011, T012)
- [X] T018 [P] [US1] Build `src/features/timesheets/components/status-badge.tsx` mapping `TimesheetStatus` to a colored `Badge` (Submitted → emerald, Draft → amber, Not Submitted → slate), per research.md #11 (depends on T011)
- [X] T019 [US1] Build `src/features/timesheets/components/filters-bar.tsx` ("use client"): driver `Select` + week `Select` staging a pending selection, with a "Filter" button that navigates to update the `driverId`/`week` URL search params, wrapping to multiple rows rather than overflowing on narrow viewports, per research.md #6 (depends on T011, T003)
- [X] T020 [US1] Build `src/features/timesheets/components/driver-submissions-table.tsx`: table of `DriverSubmissionRow`s plus a per-row action-menu client island (View details / Add-Edit entry / Delete timesheet); renders an empty-state message when `rows.length === 0` instead of an empty table (spec Edge Cases); scrolls horizontally rather than breaking layout below `md`, per `docs/ui/timesheets.png` (depends on T018)
- [X] T021 [US1] Build `src/features/timesheets/components/timesheet-entry-dialog.tsx` ("use client"): Add/Edit a single daily entry (date, driver, start time, end time, live-computed total hours), calling `saveDailyEntryAction`, per `docs/ui/add-timesheet.png` (depends on T015)
- [X] T022 [US1] Build `src/features/timesheets/components/driver-timesheet-detail-dialog.tsx` ("use client"): the selected driver's 7-day breakdown for the active week plus their assigned truck as header context, with per-day edit/delete and a delete-whole-timesheet action, calling `deleteDailyEntryAction`/`deleteTimesheetAction` (depends on T015)
- [X] T023 [US1] Rewrite `src/app/(admin)/(restricted)/timesheets/page.tsx` as a Server Component: read `searchParams` (`driverId?`, `week?`), call `getTeamDirectory()`/`getWeekOptions()`/`getDriverSubmissions()`, call `getTimesheetSummary()` on the resulting rows to produce the `summary-cards` prop, and compose `timesheets-header`, `summary-cards`, `filters-bar`, `driver-submissions-table`, and the two dialogs (depends on T012, T013, T016, T017, T018, T019, T020, T021, T022)
- [X] T024 [US1] Make `getOperationalSummary()` in `src/features/dashboard/data/mock-dashboard-data.ts` async, sourcing `activeDrivers.value` from `getTeamDirectory()`'s count and `hoursThisWeek.value` from the current week's `getDriverSubmissions()` total; leave `inInventory` and the container-preview functions untouched (mocked), and leave `trendPercent`/`trendDirection` for the two now-real metrics as a neutral placeholder, per research.md #9 (depends on T013)
- [X] T025 [US1] Update `src/app/(admin)/dashboard/page.tsx` to `await` the now-async `getOperationalSummary()` (depends on T024)

**Checkpoint**: User Story 1 — the entire feature — is fully functional and independently
testable; the Dashboard's driver/hours metrics reflect the same real data.

---

## Phase 4: Polish & Cross-Cutting Concerns

**Purpose**: Final verification before this feature is considered done.

- [X] T026 [P] Run `pnpm prisma generate`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`; fix any failures (constitution Quality Gates)
- [X] T027 Walk through every scenario in `quickstart.md` end-to-end against the seeded database, including the persistence-across-restart check and the Server Action authorization check

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup (T001 for T004+). **BLOCKS** all of Phase 3.
- **User Story 1 (Phase 3)**: Depends on Foundational (Phase 2) completion. This is the only user
  story, so nothing runs in parallel with it at the story level.
- **Polish (Phase 4)**: Depends on Phase 3 completion.

### Within Foundational (Phase 2)

T004 → T005 → {T006, T007 in parallel} → T008 → T009 (T007 also depends on T006's client existing).

### Within User Story 1 (Phase 3)

T010 (write first) → T011 → T012 (makes T010 pass) → T013 → T014 → T015 →
{T016, T018 in parallel (need only T011); T017 (needs T011, T012)} → T019 (needs T011, T003) → T020 (needs T018) →
{T021, T022 in parallel, both need T015} → T023 (needs T012, T013, and all of T016–T022) →
T024 (needs T013) → T025 (needs T024).

### Parallel Opportunities

- Setup: T002 and T003 can run in parallel (T001 is a prerequisite for T004+, not for T002/T003).
- Foundational: T006 and T007 can run in parallel once T005 is done.
- User Story 1: T016 and T018 (independent presentational components) can run in parallel once T011 is done; T017 joins them once T012 is also done; T021 and T022 can run in parallel once T015 is done.
- T026 (automated checks) can run in parallel with starting T027 (manual walkthrough), though both must pass before the feature is considered done.

---

## Parallel Example: Foundational

```bash
# Once T005 (migration) is done:
Task: "Create the cached Prisma Client singleton in src/lib/db/prisma.ts"
Task: "Implement getOrCreateCurrentUser() in src/lib/auth/get-or-create-current-user.ts"
```

## Parallel Example: User Story 1

```bash
# Once T011 (types.ts) is done:
Task: "Build src/features/timesheets/components/timesheets-header.tsx"
Task: "Build src/features/timesheets/components/status-badge.tsx"

# Once T012 (calculations.ts, including getTimesheetSummary) is also done:
Task: "Build src/features/timesheets/components/summary-cards.tsx"

# Once T015 (Server Actions) is done:
Task: "Build src/features/timesheets/components/timesheet-entry-dialog.tsx"
Task: "Build src/features/timesheets/components/driver-timesheet-detail-dialog.tsx"
```

---

## Implementation Strategy

### MVP = This Entire Feature

Because spec.md defines exactly one (P1) user story, there is no smaller MVP slice than
"Setup → Foundational → User Story 1." There is no Phase 5+ to defer to a later increment.

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational — **STOP and verify**: schema migrated, seed data populated, `pnpm prisma studio` (or equivalent) shows the seeded rows
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: run `quickstart.md` in full
5. Complete Phase 4: Polish
6. Deploy/demo

### Incremental Delivery Within Phase 3

Even though it's one user story, the task order lets you check progress incrementally:

1. T010–T015 (business logic + data layer) → verify with unit tests and a Prisma Studio / direct
   query check that reads/writes behave correctly, before any UI exists
2. T016–T023 (UI) → verify visually against `docs/ui/timesheets.png` / `add-timesheet.png`
3. T024–T025 (Dashboard wiring) → verify `/dashboard` reflects the same numbers as `/timesheets`

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to US1 for traceability (Setup/Foundational/Polish carry no label)
- T010 must fail before T012 is implemented (tests-first for the calculation logic only)
- Commit after each task or logical group
- Stop at either checkpoint (end of Phase 2, end of Phase 3) to validate before continuing
- Avoid: skipping the migration (T005) before writing repository code that assumes it exists; building UI (T016+) before the Server Actions (T015) they call

---

## Phase 5: Convergence

**Purpose**: Close gaps found by `/speckit-converge` between the codebase and this feature's
spec/plan/tasks. Constitution-violation findings are listed first and are CRITICAL.

- [X] T028 CRITICAL: Validate `driverId`/`week` `searchParams` in `src/app/(admin)/(restricted)/timesheets/page.tsx` with a Zod schema before use, instead of ad-hoc `typeof` narrowing per Constitution VIII (missing)
- [X] T029 CRITICAL: Add a real error state for a failed database query on the Timesheets page — e.g. an `error.tsx` for `src/app/(admin)/(restricted)/timesheets/` — per Constitution XII and plan.md's Constitution Check row for Principle 12, which explicitly commits to this (missing)
- [X] T030 CRITICAL: Add try/catch with user-facing error feedback and pending-state guards around the `deleteTimesheetAction`/`deleteDailyEntryAction` calls in `src/features/timesheets/components/driver-submissions-table.tsx` and `src/features/timesheets/components/driver-timesheet-detail-dialog.tsx`, which currently fail silently on error per Constitution XII (partial)
- [X] T031 Add a neutral placeholder trend/comparison row to each card in `src/features/timesheets/components/summary-cards.tsx` to restore the 3-row card structure shown in `docs/ui/timesheets.png` per FR-018 (partial)
- [X] T032 Format `lastSubmittedAt` in `src/features/timesheets/components/driver-submissions-table.tsx` with relative "Today"/"Yesterday" labels to match `docs/ui/timesheets.png` per FR-018 (partial)
