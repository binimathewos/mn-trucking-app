---

description: "Task list for Driver Management"
---

# Tasks: Driver Management

**Input**: Design documents from `/specs/005-driver-management/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/driver-management.md, quickstart.md

**Tests**: Included, scoped to plan.md's stated testing strategy (business rules, authorization,
validation — not presentation components), per constitution §14's risk-based approach.

**Organization**: Tasks are grouped by user story (spec.md priorities) to enable independent
implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1–US5)
- File paths are exact and relative to the repository root

---

## Phase 1: Setup

- [X] T001 Create the `src/features/drivers/` feature directory structure
      (`actions/`, `components/`, `data/`, `lib/`), mirroring
      `src/features/timesheets/`, per plan.md's Project Structure section.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schema and shared building blocks every user story depends on.

**⚠️ CRITICAL**: No user story task can start until this phase is complete.

- [X] T002 In `prisma/schema.prisma`: add a `DriverStatus` enum (`ACTIVE`, `INACTIVE`,
      `ON_LEAVE`); add `status DriverStatus @default(ACTIVE)` and `phone String?` to `Driver`;
      change `Driver.truckNumber` from `String` to `String?`. Do **not** add a new
      `driverClass`/similar field — `roleType` is reused as-is (research.md #9,
      data-model.md).
- [X] T003 Generate the Prisma migration for T002 (`pnpm prisma migrate dev --create-only
      --name driver_management`), then hand-edit the generated SQL to append the partial
      unique index from data-model.md's "Migration considerations":
      `CREATE UNIQUE INDEX "Driver_truckNumber_active_key" ON "Driver" ("truckNumber") WHERE
      "truckNumber" IS NOT NULL AND "status" <> 'INACTIVE';`, then apply it
      (`pnpm prisma migrate dev`).
- [X] T004 [P] Create `src/features/drivers/types.ts` with `DriverRow`, `DriverDirectoryFilters`,
      `DriverDirectoryResult`, and the `DriverStatus` literal union, per
      contracts/driver-management.md's `getDriverDirectory` shapes.
- [X] T005 [P] Create `src/features/drivers/actions/driver-actions.ts` with only a shared
      `assertAdminAccess()` helper (re-checks `resolveAdminOnlyAccess` independently of the
      route layout — same pattern as `src/features/timesheets/actions/timesheet-actions.ts`).
      Story phases below append their own exported actions to this same file.
- [X] T006 [P] Create `src/features/drivers/lib/truck-assignment.ts` exporting
      `assertTruckAvailable(truckNumber: string, excludeDriverId?: string): Promise<void>`,
      which throws a clear conflict error if another `Driver` row with `status !== "INACTIVE"`
      already holds that `truckNumber` (case-insensitive) — research.md #8, FR-021.
- [X] T007 [P] Unit test in `tests/features/drivers/truck-assignment.test.ts`:
      `assertTruckAvailable` (T006) rejects a truck already held by another non-`INACTIVE`
      driver (case-insensitive match), allows it when `excludeDriverId` matches the current
      holder, and allows reassignment of a truck freed by an `INACTIVE` driver (research.md #8,
      FR-021, SC-003).
- [X] T008 [P] Create `src/features/drivers/lib/status-transition.ts` exporting
      `applyDeactivation(driver: { id, clerkUserId })` and
      `applyReactivation(driver: { id, clerkUserId })`. Deactivation sets `Driver.status =
      INACTIVE`, sets `truckNumber = null`, and calls `clerkClient.users.banUser(clerkUserId)`
      (FR-023, FR-024). Reactivation sets `Driver.status = ACTIVE` and calls
      `clerkClient.users.unbanUser(clerkUserId)` (FR-025) — research.md #6.

**Checkpoint**: Schema migrated; shared auth/truck/status-transition building blocks exist and
are tested. User story work can begin.

---

## Phase 3: User Story 1 - Administrator Views the Driver Roster (Priority: P1) 🎯 MVP

**Goal**: Real summary cards + a filterable/searchable driver directory table replace the
current `/drivers` placeholder.

**Independent Test**: Sign in as administrator, open `/drivers`, confirm summary cards and
directory table render from real data; apply a status filter and a search term and confirm
results narrow correctly (spec.md US1).

- [X] T009 [US1] Implement `getDriverDirectory(filters?)` in
      `src/features/drivers/data/driver-repository.ts`: query all `DRIVER`-role `User`+`Driver`
      rows for roster-wide `stats` (total/active-today/on-leave, always unfiltered per FR-006),
      apply `filters.status`/`filters.search` (case-insensitive name match) to the returned
      `drivers` list, then merge in `lastSignInAt` via one
      `clerkClient.users.getUserList({ userId: [...clerkUserIds] })` call keyed by
      `clerkUserId`, mapping `null`/missing to `lastActivity: null` (research.md #4). Let
      DB/Clerk errors propagate (caught by `error.tsx` in T017).
- [X] T010 [P] [US1] Create `src/features/drivers/components/driver-status-badge.tsx` (Active /
      Inactive / On leave badge, matching `docs/ui/drivers.png`'s status pill style).
- [X] T011 [P] [US1] Create `src/features/drivers/components/summary-cards.tsx` rendering the
      three stat cards (Total drivers, Active today, On leave) per `docs/ui/drivers.png` —
      omitting the mockup's "Unassigned trucks" card and trend/percentage figures per spec.md
      Assumptions.
- [X] T012 [P] [US1] Create `src/features/drivers/components/driver-filters-bar.tsx` (Client
      Component): status filter control + search input, per `docs/ui/drivers.png`'s "All
      drivers" dropdown + "Filter" control (spec.md Assumptions treats these as one combined
      status control).
- [X] T013 [US1] Create `src/features/drivers/components/driver-directory-table.tsx`: renders
      driver rows (avatar/initials, name, driver class, phone, truck, `driver-status-badge`
      from T010, last activity), a distinct empty state (no drivers at all) and a distinct
      no-results state (filter/search match nothing) — FR-007, FR-010.
- [X] T014 [P] [US1] Create `src/features/drivers/components/drivers-header.tsx`: "Team /
      Directory" eyebrow, "Drivers" title, subtitle, and an "Add driver" button (inert until
      wired in T025) — FR-005.
- [X] T015 [US1] Rewrite `src/app/(admin)/(restricted)/drivers/page.tsx` as a Server Component:
      call `getDriverDirectory` (T009) with URL-search-param-derived filters, compose
      `drivers-header` (T014), `summary-cards` (T011), `driver-filters-bar` (T012), and
      `driver-directory-table` (T013).
- [X] T016 [P] [US1] Create `src/app/(admin)/(restricted)/drivers/loading.tsx` (directory
      loading skeleton — FR-011).
- [X] T017 [P] [US1] Create `src/app/(admin)/(restricted)/drivers/error.tsx` (directory error
      state, mirroring `src/app/(admin)/(restricted)/timesheets/error.tsx` — FR-011).
- [X] T018 [US1] Unit test in `tests/features/drivers/driver-repository.test.ts`: stats are
      computed over the unfiltered set while `drivers` respects `filters` (mock Prisma/Clerk
      calls).

**Checkpoint**: `/drivers` is fully functional read-only — independently testable per spec.md
US1's Independent Test.

---

## Phase 4: User Story 2 - Administrator Adds a New Driver (Priority: P1)

**Goal**: "Add driver" creates a Clerk account (direct, dev-mode) + linked `Driver` profile in
one guided flow, with no orphaned records on partial failure.

**Independent Test**: Open Add Driver, submit valid fields including a temporary password,
confirm the new driver appears in the directory and their account is immediately usable for
sign-in with the driver role (spec.md US2).

- [X] T019 [P] [US2] Create `src/features/drivers/lib/provision-account.ts` exporting
      `provisionDriverAccount({ email, password, name }): Promise<{ clerkUserId: string }>`,
      calling `clerkClient.users.createUser({ emailAddress: [email], password, firstName,
      lastName, publicMetadata: { role: "driver" } })` — this is the single swappable boundary
      for FR-033 (research.md #5). Never logs or returns the password.
- [X] T020 [US2] Unit test in `tests/features/drivers/provision-account.test.ts` (mocked Clerk
      client): duplicate-email and weak-password rejections from `createUser` propagate as
      distinct, catchable errors.
- [X] T021 [P] [US2] Add `addDriverInputSchema` (Zod) to `src/features/drivers/lib/validation.ts`:
      `fullName` (required), `email` (required, valid), `temporaryPassword` (required, min-length
      pre-check only — research.md #3), `phone` (optional, phone format), `driverClass`
      (optional), `truckNumber` (optional).
- [X] T022 [US2] Add `addDriverAction(input: unknown): Promise<{ driverId: string }>` to
      `src/features/drivers/actions/driver-actions.ts`: `assertAdminAccess()` (T005) →
      `addDriverInputSchema.parse` (T021) → `assertTruckAvailable` if `truckNumber` given (T006)
      → `provisionDriverAccount` (T019) → `prisma.$transaction` creating `User` + `Driver`
      → on transaction failure, `clerkClient.users.deleteUser(clerkUserId)` to compensate,
      logging the `clerkUserId` and surfacing a manual-cleanup-needed error if the delete itself
      fails (research.md #7, FR-017) → `revalidatePath("/drivers")`.
- [X] T023 [US2] Unit test in `tests/features/drivers/add-driver-rollback.test.ts`:
      `addDriverAction` (T022, mocked Prisma/Clerk) calls `clerkClient.users.deleteUser` when
      the post-Clerk `prisma.$transaction` fails, and surfaces a manual-cleanup-needed error
      (not a silent failure) when that compensating delete itself throws (research.md #7,
      FR-017, SC-004).
- [X] T024 [US2] Create `src/features/drivers/components/add-driver-dialog.tsx` (Client
      Component): form matching `docs/ui/add-driver.png` plus the required temporary-password
      field (research.md #1), calling `addDriverAction` (T022) and surfacing field-level and
      duplicate/conflict errors; success closes the dialog and shows a success toast (FR-016).
- [X] T025 [US2] Wire the "Add driver" button in `drivers-header.tsx` (T014) to open
      `add-driver-dialog.tsx` (T024); on success, rely on `revalidatePath` (T022) so the
      directory/stats refresh without a manual reload (FR-016).

**Checkpoint**: Adding a driver works end-to-end and is visible via US1's directory —
independently testable per spec.md US2's Independent Test.

---

## Phase 5: User Story 5 - Non-Administrator Access Is Blocked (Priority: P1)

**Goal**: Confirm and lock in, with regression tests, that every driver-management action and
the page itself reject non-administrators server-side, and that no input can grant the
administrator role.

**Independent Test**: Sign in as a driver-role user; attempt to open `/drivers` directly and to
invoke a driver-management action directly; confirm both are denied (spec.md US5).

> Note: page-level gating already exists (`src/app/(admin)/(restricted)/layout.tsx`'s
> `resolveAdminOnlyAccess`, unchanged by this feature) and `assertAdminAccess()` (T005) is
> already called first by every action added in T022/T029/T033. This phase adds the regression
> tests that pin that behavior down.

- [X] T026 [P] [US5] Unit test in `tests/features/drivers/authorization.test.ts`: each exported
      action in `src/features/drivers/actions/driver-actions.ts` (`addDriverAction`,
      `updateDriverAction`, `setDriverStatusAction`) throws when `getSessionAccess` resolves a
      non-administrator or signed-out session, regardless of any role value embedded in the
      input payload (FR-001, FR-002, SC-005).
- [X] T027 [P] [US5] Unit test in `tests/features/drivers/validation.test.ts`: confirm none of
      `addDriverInputSchema`/`updateDriverInputSchema` (`src/features/drivers/lib/validation.ts`)
      accept a role/administrator-elevation field of any kind (FR-003).

**Checkpoint**: Access-control behavior for this feature is exercised by automated tests, not
just implied by shared infrastructure.

---

## Phase 6: User Story 3 - Administrator Edits an Existing Driver (Priority: P2)

**Goal**: Edit an existing driver's name/phone/driver class/truck/status without creating a new
account.

**Independent Test**: Open Edit from a driver's row, change phone, driver class, and truck
assignment, save, confirm changes reflected and no new account created (spec.md US3).

- [X] T028 [P] [US3] Add `updateDriverInputSchema` (Zod) to
      `src/features/drivers/lib/validation.ts`: `driverId` (required), `fullName` (required),
      `phone`/`driverClass`/`truckNumber` (optional), `status` (required enum). Deliberately no
      `email` field (FR-019/FR-020).
- [X] T029 [US3] Add `updateDriverAction(input: unknown): Promise<void>` to
      `src/features/drivers/actions/driver-actions.ts`: `assertAdminAccess()` (T005) →
      `updateDriverInputSchema.parse` (T028) → `assertTruckAvailable` if `truckNumber` changed,
      excluding the driver being edited (T006) → if `status` is changing to/from `INACTIVE`,
      call `applyDeactivation`/`applyReactivation` (T008) → update `User.name` + `Driver` row in
      one `prisma.$transaction` → `revalidatePath("/drivers")` (FR-018–FR-022).
- [X] T030 [P] [US3] Create `src/features/drivers/components/edit-driver-dialog.tsx`: reuses
      `add-driver-dialog.tsx`'s (T024) layout where practical, pre-filled from the selected
      driver, email shown read-only, calling `updateDriverAction` (T029) — FR-018, FR-019.
- [X] T031 [US3] Create `src/features/drivers/components/driver-row-actions-menu.tsx`
      (Client Component, keyboard-accessible shadcn dropdown) with an "Edit" item that opens
      `edit-driver-dialog.tsx` (T030) for that row. (Deactivate/Reactivate items are added in
      Phase 7.)
- [X] T032 [US3] Integrate `driver-row-actions-menu.tsx` (T031) into each row of
      `driver-directory-table.tsx` (T013) — FR-007's row-level actions menu.

**Checkpoint**: Editing works end-to-end — independently testable per spec.md US3's Independent
Test.

---

## Phase 7: User Story 4 - Administrator Deactivates and Reactivates a Driver (Priority: P2)

**Goal**: One-click deactivate/reactivate from the row-actions menu, freeing an assigned truck
on deactivation, without touching historical timesheet records.

**Independent Test**: Deactivate an active driver from row actions, confirm status change and
intact historical timesheets, then reactivate and confirm status returns to active (spec.md
US4).

- [X] T033 [US4] Add `setDriverStatusAction(input: { driverId: string; status: "ACTIVE" |
      "INACTIVE" }): Promise<void>` to `src/features/drivers/actions/driver-actions.ts`:
      `assertAdminAccess()` (T005) → load the target `Driver` → call `applyDeactivation` or
      `applyReactivation` (T008) accordingly → `revalidatePath("/drivers")` (FR-023, FR-025).
- [X] T034 [US4] Add "Deactivate"/"Reactivate" items (shown based on current status) to
      `driver-row-actions-menu.tsx` (T031), wired to `setDriverStatusAction` (T033).
- [X] T035 [P] [US4] Unit test in `tests/features/drivers/status-transition.test.ts`:
      `applyDeactivation` clears `truckNumber` and calls `banUser`; `applyReactivation` calls
      `unbanUser` and leaves `truckNumber` untouched (mocked Prisma/Clerk) — FR-023–FR-025.

**Checkpoint**: All five user stories are independently functional.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [X] T036 [P] Responsive pass over `summary-cards.tsx`, `driver-filters-bar.tsx`,
      `driver-directory-table.tsx`, `add-driver-dialog.tsx`, and `edit-driver-dialog.tsx` at
      desktop/tablet/mobile widths (FR-027, SC-007).
- [X] T037 [P] Update `prisma/seed.ts` with representative `phone`/`status` sample values (at
      least one `INACTIVE` and one `ON_LEAVE` driver) so the new fields are exercised in local
      dev without relying on manually created data.
- [X] T038 Execute every scenario in `specs/005-driver-management/quickstart.md` end-to-end
      against a local dev environment; fix any gaps found.
- [X] T039 Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`; resolve any
      failures caused by this feature (constitution §15 quality gate).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS every user story.
- **US1 (Phase 3)**: Depends only on Foundational.
- **US2 (Phase 4)**: Depends on Foundational; its dialog is opened from US1's header
  (`drivers-header.tsx`, T014) and its success relies on US1's directory (T009/T015) to show the
  result — build after US1.
- **US5 (Phase 5)**: Depends on Foundational (T005) and on the actions US1/US2 already added
  (T022) existing to test against — build after US2.
- **US3 (Phase 6)**: Depends on Foundational (T006/T008) and on US1's table (T013) to attach the
  row-actions menu to — build after US1; independent of US2/US5.
- **US4 (Phase 7)**: Depends on Foundational (T008) and on US3's row-actions menu (T031) to add
  Deactivate/Reactivate items to — build after US3.
- **Polish (Phase 8)**: Depends on all desired user stories being complete.

### Within Each User Story

- Validation schemas and lib helpers before the action that uses them.
- Actions before the dialog/menu component that calls them.
- Story complete and independently testable before moving to the next.

### Parallel Opportunities

- Foundational: T004, T005, T006, T008 (four different files, no interdependency); T007 follows
  T006 (same-topic test).
- US1: T010, T011, T012, T014 (four different component files) once T009 is underway; T016/T017
  anytime after T015 exists.
- US2: T019 and T021 in parallel (different files); T020 after T019; T023 after T022.
- US5: T026 and T027 fully parallel (different files, both read-only tests).
- US3: T028 and T030 in parallel; T029 depends on T028.
- Polish: T036 and T037 in parallel.

---

## Parallel Example: Foundational Phase

```bash
# After T002/T003 (schema + migration) land, run these four together:
Task: "Create src/features/drivers/types.ts"
Task: "Create src/features/drivers/actions/driver-actions.ts shell with assertAdminAccess"
Task: "Create src/features/drivers/lib/truck-assignment.ts"
Task: "Create src/features/drivers/lib/status-transition.ts"
```

## Parallel Example: User Story 1

```bash
# Once T009 (getDriverDirectory) is underway, these four components can be built together:
Task: "Create driver-status-badge.tsx"
Task: "Create summary-cards.tsx"
Task: "Create driver-filters-bar.tsx"
Task: "Create drivers-header.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational (schema migration + shared helpers — blocks everything else).
3. Complete Phase 3: User Story 1.
4. **STOP and VALIDATE**: run spec.md US1's Independent Test against a real (even if
   directory-only) roster.
5. Demo the read-only roster view if useful as an early increment.

### Incremental Delivery

1. Setup + Foundational → foundation ready.
2. US1 (roster view) → validate independently.
3. US2 (add driver) → validate independently → this + US1 is the first fully useful increment
   (roster grows through the app, not just via seed data).
4. US5 (access-control regression tests) → validate independently — cheap to do right after US2
   while the action set is still small.
5. US3 (edit) → validate independently.
6. US4 (deactivate/reactivate) → validate independently — depends on US3's row-actions menu.
7. Polish.

### Suggested MVP Scope

User Story 1 alone (Phase 3) is the smallest independently-demonstrable increment, but User
Story 2 (Phase 4) is required before the feature has any real business value beyond viewing
seeded data — treat **US1 + US2** together as the practical MVP.
