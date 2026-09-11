---

description: "Task list for Route-Based Driver Pay"
---

# Tasks: Route-Based Driver Pay

**Input**: Design documents from `/specs/007-route-driver-pay/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/route-driver-pay.md, quickstart.md

**Tests**: Included (risk-based — plan.md Testing section calls out authorization, pay math, and validation as requiring tests; no test infra is being introduced, existing Vitest patterns are reused).

**Organization**: Tasks are grouped by user story (US1, US2 both P1; US3 P2) so each can be implemented and independently tested per spec.md's Acceptance Scenarios.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

## Path Conventions

Single Next.js app, feature-oriented under `src/features/*` (existing convention). No `backend/`/`frontend/` split.

## A note on an existing naming quirk (read before starting US1/US3 tasks)

`src/features/timesheets/` calls its identifier `driverId` throughout (`DailyEntryInput.driverId`, `DriverSubmissionRow.driverId`, `Driver.id`), but it is actually `User.id` — `Timesheet.userId` references `User`, and `getTeamDirectory()` maps **every** `User` row (administrators included) into that `Driver` shape. This is unrelated to `Route.driverId`, which is a real `Driver.id` (the `Driver` model's own id, one-to-one with a DRIVER-role `User`). Tasks below that need "is this route assigned to this driver" MUST join through `driver: { userId }`, not compare `Route.driverId` to the timesheets `driverId` directly — they are different id spaces. See T010 and T017.

---

## Phase 1: Setup

- [X] T001 Confirm a clean baseline: run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` before making any changes, so later failures are attributable to this feature

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The single schema migration both P1 stories build on. Per plan.md's Project Structure, this is one migration, not one per story.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T002 In `prisma/schema.prisma`: add `hourlyRate Decimal @default(0) @db.Decimal(10, 2)` to `Route`; add a new `DriverPaySettings` model (`id String @id @default("default")`, `defaultHourlyRate Decimal @default(0) @db.Decimal(10, 2)`, `updatedAt DateTime @updatedAt`); add `routeId String?` and `route Route? @relation(fields: [routeId], references: [id], onDelete: SetNull)` to `TimesheetEntry`; add the back-relation `timesheetEntries TimesheetEntry[]` to `Route` — exact shapes in data-model.md
- [X] T003 Run `pnpm prisma migrate dev --name route_driver_pay` to generate the migration under `prisma/migrations/` and regenerate the Prisma client (depends on T002)

**Checkpoint**: Schema ready — US1 and US2 can now proceed independently in parallel; US3 depends on both being complete (spec.md: "this depends on User Stories 1 and 2 already existing").

---

## Phase 3: User Story 1 - Driver Logs Hours Against an Assigned Route (Priority: P1) 🎯 MVP

**Goal**: A driver can create a timesheet entry tagged with one of their currently-assigned routes; the server independently verifies the route really belongs to that driver, whether the caller is the driver or an administrator acting on their behalf.

**Independent Test**: Sign in as a driver with ≥1 assigned route, open `/timesheets`, add an entry, confirm the Route field lists only that driver's routes, save, and confirm the entry shows that route. Then confirm a tampered/forced route not assigned to the driver is rejected server-side.

### Implementation for User Story 1

- [X] T004 [US1] Add `routeId: z.string().min(1, "Select a route.")` to `dailyEntryInputSchema` in `src/features/timesheets/lib/calculations.ts` (FR-001, FR-003)
- [X] T005 [US1] Add `routeId: string | null` and `routeLabel: string | null` to `DailyEntry`, and `driverProfileId: string | null` to `Driver` (the underlying `Driver.id` when the user is a driver, else `null` — needed to look up that driver's assigned routes) in `src/features/timesheets/types.ts`
- [X] T006 [US1] In `src/features/routes/data/route-repository.ts`, add `export async function isRouteAssignedToDriver(routeId: string, driverProfileId: string): Promise<boolean>` — `prisma.route.findFirst({ where: { id: routeId, driverId: driverProfileId } })` returns non-null (FR-004, FR-019; research.md #6)
- [X] T007 [US1] In the same file, add `export async function getAssignedRoutesByDriverProfileIds(driverProfileIds: string[]): Promise<Record<string, { id: string; label: string }[]>>` — one `prisma.route.findMany({ where: { driverId: { in: driverProfileIds }, status: { not: "CANCELLED" } } })` query, grouped by `driverId`, `label` = `` `${pickupAddress} → ${deliveryAddress}` `` (spec Assumptions: exclude only CANCELLED routes)
- [X] T008 [US1] In `src/features/timesheets/data/timesheet-repository.ts`: extend `getTeamDirectory()`'s query/mapping to include `driverProfileId: user.driver?.id ?? null` on each returned `Driver`; extend `upsertDailyEntry`'s `DailyEntryWriteInput` and both `prisma.timesheetEntry.upsert` branches to write `routeId: input.routeId`; extend `getDriverSubmissions`'s entries query to `include: { route: true }` and map each entry's `routeId` and `routeLabel` (`` `${entry.route.pickupAddress} → ${entry.route.deliveryAddress}` `` or `null` when `entry.route` is `null`, per FR-021)
- [X] T009 [US1] In `src/app/(admin)/(restricted)/timesheets/page.tsx` (this edit carries forward when T011 relocates the file — implement T016 first so `TimesheetEntryDialog` already accepts the prop below), call the new `getAssignedRoutesByDriverProfileIds` (T007) with all drivers' `driverProfileId`s from `getTeamDirectory()`, and build a `routesByDriverId: Record<string, { id: string; label: string }[]>` map keyed by each `Driver.id` (i.e. `User.id`) via its `driverProfileId`; pass it down through `TimesheetsHeader` → `TimesheetEntryDialog`, and `DriverSubmissionsTable` → `DriverTimesheetDetailDialog` → `TimesheetEntryDialog`
- [X] T010 [US1] In `src/features/timesheets/actions/timesheet-actions.ts`, replace `saveDailyEntryAction`'s unconditional `assertAdminAccess()` with logic that: (a) allows `role === "administrator"` (using `parsed.driverId` as submitted) OR `role === "driver"` (resolving the caller's own `User`/`Driver` via `prisma.user.findUnique({ where: { clerkUserId: user.id }, include: { driver: true } })`, forcing `parsed.driverId` to that user's own id, throwing if no `Driver` record exists), rejecting any other case; (b) after that, resolves the effective driver's `Driver.id` (`prisma.user.findUnique({ where: { id: parsed.driverId }, include: { driver: true } })` → `.driver?.id`) and calls `isRouteAssignedToDriver(parsed.routeId, thatDriverProfileId)` from T006, throwing before any write if it's `false` or no `Driver` record is found (FR-004, FR-019, SC-001, SC-006) — leave `deleteDailyEntryAction`/`deleteTimesheetAction` administrator-only (research.md #1)
- [X] T011 [US1] Move `src/app/(admin)/(restricted)/timesheets/page.tsx` and its `error.tsx` to `src/app/(admin)/timesheets/` (sibling of `(admin)/dashboard/` and `(admin)/routes/`, outside `(restricted)`); at the top of `page.tsx`, branch on `getSessionAccess()`'s role exactly like `(admin)/routes/page.tsx` does — non-administrator resolves their own `Driver.id` the same way and renders a new driver view instead of redirecting
- [X] T012 [US1] In `src/components/app-shell/nav-items.ts`, change the `Timesheets` nav item's `roles` to `["administrator", "driver"]`
- [X] T013 [P] [US1] Create `src/features/timesheets/components/my-timesheet-summary.tsx` — driver's own summary cards (reuse `summary-cards.tsx`'s Card/icon layout), scoped to the signed-in driver's current week
- [X] T014 [P] [US1] Create `src/features/timesheets/components/my-timesheet-table.tsx` — driver's own entries table (model on `my-routes-table.tsx`'s layout/empty-state pattern), showing date, time range, hours, and route
- [X] T015 [US1] Wire the driver branch of `(admin)/timesheets/page.tsx` (T011) to render `MyTimesheetSummary`/`MyTimesheetTable` plus a `TimesheetEntryDialog` (via a header, mirroring `TimesheetsHeader`; requires T016's `routesByDriverId` prop to exist first) fed `routesByDriverId: { [ownUserId]: <result of getMyRoutes(ownDriverId) mapped to {id, label}> }` and `lockDriver`
- [X] T016 [US1] In `src/features/timesheets/components/timesheet-entry-dialog.tsx`: add a `routesByDriverId: Record<string, { id: string; label: string }[]>` prop (implement this before T009 and T015, which both assume it already exists, despite this task's higher number); add a required Route `Select` (options = `routesByDriverId[driverId] ?? []`); clear the selected route whenever `driverId` changes; disable Save when no route is selected (extends the existing `!driverId` disablement, FR-001) and show an empty/disabled state when the selected driver has zero assigned routes (spec US1 AC2); include `routeId` in the `saveDailyEntryAction` call
- [X] T017 [US1] Add `tests/features/timesheets/authorization.test.ts` (new, mocking `getSessionAccess`/`prisma` per the pattern in `tests/features/routes/authorization.test.ts`) covering: driver saving their own entry against their own assigned route (allowed); driver saving against a route assigned to a different driver (rejected, FR-004); administrator saving on behalf of a driver against a route not assigned to that driver (rejected, FR-019); driver attempting to submit for a different `driverId` than their own session (rejected); a driver-submitted payload carrying an extraneous rate/hourlyRate-like field has no effect on any `Route`/`DriverPaySettings` row (FR-022 — locks in the invariant that no rate can be altered through this action)
- [X] T018 [US1] Extend `tests/unit/timesheet-calculations.test.ts`'s `dailyEntryInputSchema` describe block with a case asserting a missing `routeId` fails validation (FR-001)
- [X] T019 [US1] Update `tests/unit/nav-items.test.ts`'s driver-role expectation: a driver now sees `["Dashboard", "Timesheets"]`, not just `["Dashboard"]`

**Checkpoint**: User Story 1 is independently functional — a driver can log hours against an assigned route, enforced server-side.

---

## Phase 4: User Story 2 - Administrator Sets and Manages Route Pay Rates (Priority: P1)

**Goal**: Every route carries an hourly driver pay rate, prefilled from an administrator-configurable default and independently editable per route.

**Independent Test**: As admin, set the default rate, create a route (confirm prepopulation), override it, save, edit it again, then change the default and confirm the earlier route's rate is untouched.

### Implementation for User Story 2

- [X] T020 [P] [US2] Create `src/features/settings/types.ts` — `DriverPaySettingsRow { defaultHourlyRate: string }`
- [X] T021 [P] [US2] Create `src/features/settings/lib/validation.ts` — `updateDefaultHourlyRateInputSchema` with `defaultHourlyRate: z.string().regex(/^\d+(\.\d{1,2})?$/, "Enter a valid, non-negative rate with up to 2 decimal places.")` (FR-006, FR-015-equivalent for the default)
- [X] T022 [US2] Create `src/features/settings/data/driver-pay-settings-repository.ts` — `getDriverPaySettings(): Promise<DriverPaySettingsRow>` doing `prisma.driverPaySettings.upsert({ where: { id: "default" }, update: {}, create: { id: "default" } })`, formatting `defaultHourlyRate.toFixed(2)` (data-model.md get-or-create semantics)
- [X] T023 [US2] Create `src/features/settings/actions/driver-pay-settings-actions.ts` — `updateDefaultHourlyRateAction(input: unknown): Promise<void>`, reusing the `assertAdminAccess` pattern (own copy, matching `route-actions.ts`/`driver-actions.ts`), validating with T021's schema, `prisma.driverPaySettings.upsert(...)` writing the new `defaultHourlyRate` as `new Prisma.Decimal(value)`, then `revalidatePath("/settings")` (FR-011, FR-012, SC-006 — never touches existing `Route.hourlyRate` rows, FR-010)
- [X] T024 [P] [US2] Create `src/features/settings/components/default-driver-rate-card.tsx` — a `Card` with a labeled rate `Input` and Save `Button`, following `create-route-dialog.tsx`'s form-state/error-handling pattern (loading/error/success states per constitution §12)
- [X] T025 [US2] Replace the stub in `src/app/(admin)/(restricted)/settings/page.tsx` with a call to `getDriverPaySettings()` and render `DefaultDriverRateCard` (administrator-only, unchanged route group)
- [X] T026 [US2] Add `hourlyRate` to `createRouteInputSchema` and `updateRouteInputSchema` in `src/features/routes/lib/validation.ts`: required string matching `/^\d+(\.\d{1,2})?$/` (FR-015)
- [X] T027 [US2] Add `hourlyRate: string` to `RouteRow`, `CreateRouteInput`, and `UpdateRouteInput` in `src/features/routes/types.ts`
- [X] T028 [US2] In `src/features/routes/data/route-repository.ts`'s `toRouteRow`, add `hourlyRate: route.hourlyRate.toFixed(2)`
- [X] T029 [US2] In `src/features/routes/actions/route-actions.ts`: `createRouteAction` and `updateRouteAction` convert the validated `hourlyRate` string to `new Prisma.Decimal(value)` and persist it on `prisma.route.create`/`prisma.route.update` (FR-007 seeding happens client-side via T031's prepopulated prop — the action just persists whatever value was submitted, per contracts.md)
- [X] T030 [US2] In `src/app/(admin)/routes/page.tsx`, call `getDriverPaySettings()` and pass its `defaultHourlyRate` into `CreateRouteDialog` as a new `defaultHourlyRate` prop
- [X] T031 [US2] In `src/features/routes/components/create-route-dialog.tsx`, add a `defaultHourlyRate: string` prop, a "Driver Hourly Rate" `Input` initialized from it (reset on each open, editable, included in `createRouteAction`'s payload; FR-013, FR-014)
- [X] T032 [US2] In `src/features/routes/components/edit-route-dialog.tsx`, add a "Driver Hourly Rate" `Input` seeded from `route.hourlyRate`, disabled when `locked`, included in `updateRouteAction`'s payload (FR-009, FR-013)
- [X] T033 [US2] In `src/features/routes/components/route-details-dialog.tsx`, add a `DetailRow` showing `route.hourlyRate` as `$X.XX/hr`
- [X] T034 [P] [US2] Extend `tests/features/routes/validation.test.ts` with `hourlyRate` cases for both schemas: accepts `"22.00"`/`"0"`, rejects missing/negative/non-numeric/`">2 decimal places"` values (FR-015)
- [X] T035 [US2] Add `tests/features/settings/authorization.test.ts` (mocking `getSessionAccess`/`prisma`, same pattern as `tests/features/routes/authorization.test.ts`) asserting `updateDefaultHourlyRateAction` rejects non-administrator sessions (FR-011, FR-012, SC-006)

**Checkpoint**: User Story 2 is independently functional — routes always carry a rate, defaults never retroactively change existing routes.

---

## Phase 5: User Story 3 - Administrator Reviews Route-Based Pay on Timesheets (Priority: P2)

**Goal**: Every timesheet entry with a route shows its route, hours, hourly rate, and calculated pay (always computed from the route's *current* rate), with a timesheet-level total; drivers see the same for their own entries; legacy route-less entries show "not available" instead of erroring.

**Independent Test**: View a timesheet entry with a route → see route/rate/hours/pay and a correct total; change the route's rate → the same entry's displayed pay updates immediately; view a pre-feature entry with no route → hours show, rate/pay show as not available.

**Depends on**: User Story 1 (routeId on entries) and User Story 2 (hourlyRate on routes) both complete.

### Implementation for User Story 3

- [X] T036 [US3] In `src/features/timesheets/lib/calculations.ts`, add `computeCalculatedPay(hours: number, hourlyRate: string | null): string | null` (using `Prisma.Decimal`: `new Prisma.Decimal(hours).mul(hourlyRate).toFixed(2)`, returns `null` when `hourlyRate` is `null` — FR-017, FR-021) and `computeTotalCalculatedPay(entries: { calculatedPay: string | null }[]): string` (sums non-null values, formatted — FR-016a)
- [X] T037 [US3] Add `hourlyRate: string | null` and `calculatedPay: string | null` to `DailyEntry`, and `totalCalculatedPay: string` to `DriverSubmissionRow`, in `src/features/timesheets/types.ts`
- [X] T038 [US3] In `src/features/timesheets/data/timesheet-repository.ts`'s `getDriverSubmissions` (already `include: { route: true }` from T008): for each entry, set `hourlyRate: entry.route ? entry.route.hourlyRate.toFixed(2) : null` and `calculatedPay: computeCalculatedPay(entry.hours, hourlyRate)`; compute each row's `totalCalculatedPay` via `computeTotalCalculatedPay` (FR-016, FR-017, FR-018 — always derived from the route's *current* rate at read time, never stored)
- [X] T039 [US3] In `src/features/timesheets/components/driver-timesheet-detail-dialog.tsx`, show each day's route, hourly rate, and calculated pay next to hours (rendering "—" when `null`, FR-021), and add a total calculated pay line alongside the existing total-hours display (FR-016a)
- [X] T040 [US3] Update `src/features/timesheets/components/my-timesheet-table.tsx`/`my-timesheet-summary.tsx` (from US1) to also display hourly rate and calculated pay per entry, and a total, for the driver's own view (FR-020)
- [X] T041 [P] [US3] Add `tests/features/timesheets/calculations.test.ts` (new) covering `computeCalculatedPay` (hours × rate, `null` route → `null`, zero rate → `"0.00"`) and `computeTotalCalculatedPay` (sums non-null entries, zero for none)
- [X] T042 [US3] Extend `tests/unit/timesheet-calculations.test.ts` with the same pay-math cases if not already covered by T041 (keep whichever location the team's existing convention favors — both files exist per plan.md's Testing section)

**Checkpoint**: All three user stories are independently functional and integrated.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T043 Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` and resolve any failures introduced by this feature (constitution §15 Quality Gates)
- [ ] T044 Walk through all three quickstart.md scenarios manually against a local dev environment
- [ ] T045 Spot-check the new Route field in the "Add timesheet" dialogs against `docs/ui/add-timesheet.png` and `docs/ui/drive-add-timesheet.png` for visual consistency (constitution §4) — confirm no "Break" field was added (research.md #2)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS both US1 and US2
- **US1 (Phase 3)** and **US2 (Phase 4)**: Both depend only on Foundational; independent of each other, can proceed in parallel
- **US3 (Phase 5)**: Depends on US1 (routeId, driver-facing page/components) and US2 (hourlyRate) both being complete
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### Within Each User Story

- US1: T004-T008 (schema-adjacent data/validation work) before T009-T016 (actions/UI that consume them); within that group, implement T016 (adds `routesByDriverId` to `TimesheetEntryDialog`) before T009 and T015, which both assume that prop already exists, despite T016's higher number; T017-T019 (tests) after the code they test exists
- US2: T020-T023 (settings feature) can proceed in parallel with T026-T029 (routes rate persistence); both must land before T030-T033 (UI wiring); T034-T035 (tests) last
- US3: T036-T038 (calculation + repository) before T039-T040 (UI); T041-T042 (tests) last

### Parallel Opportunities

- T013 and T014 (new driver-facing components) — different files
- T020, T021, T024 (settings types/validation/component) — different files, no shared state
- T034 (routes validation tests) can run alongside any US2 UI task
- US1 and US2 can be staffed and executed fully in parallel once Phase 2 is done

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup
2. Phase 2: Foundational (schema + migration)
3. Phase 3: User Story 1
4. **STOP and VALIDATE**: drivers can log route-tagged hours, server-enforced
5. Ship — pay rates/calculated pay can follow as US2/US3 land

### Incremental Delivery

1. Setup + Foundational → schema ready
2. US1 → drivers can select and save a route on their entries (MVP)
3. US2 → every route carries a rate, admin-configurable default and per-route override
4. US3 → calculated pay becomes visible everywhere, tying US1 and US2 together

### Parallel Team Strategy

After Foundational: one developer takes US1 (timesheets + driver page), another takes US2 (routes + settings) — no shared files between them until US3, which depends on both.
