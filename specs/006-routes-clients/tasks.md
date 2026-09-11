---

description: "Task list for Routes & Client Management"
---

# Tasks: Routes & Client Management

**Input**: Design documents from `/specs/006-routes-clients/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/routes-clients.md, quickstart.md

**Tests**: Included, scoped to plan.md's stated testing strategy (business rules, authorization,
validation — not presentation components), per constitution §14's risk-based approach.

**Organization**: Tasks are grouped by user story (spec.md priorities) to enable independent
implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1–US6)
- File paths are exact and relative to the repository root

---

## Phase 1: Setup

- [X] T001 Create the `src/features/routes/` and `src/features/clients/` feature directory
      structures (`actions/`, `components/`, `data/`, `lib/`), mirroring
      `src/features/drivers/`, per plan.md's Project Structure section.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schema and shared building blocks every user story depends on.

**⚠️ CRITICAL**: No user story task can start until this phase is complete.

- [X] T002 In `prisma/schema.prisma`: add `ClientStatus` (`ACTIVE`, `INACTIVE`) and `RouteStatus`
      (`SCHEDULED`, `ASSIGNED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`) enums; add the `Client`
      model and the `Route` model (with `sequenceNumber Int @unique @default(autoincrement())`);
      add the reverse relation `routes Route[]` to the existing `Driver` model — per
      data-model.md.
- [X] T003 Generate and apply the Prisma migration for T002
      (`pnpm prisma migrate dev --name routes_clients`).
- [X] T004 [P] Create `src/features/routes/types.ts` with `RouteRow`, `RouteDirectoryFilters`,
      `RouteActionError`, and `parseRouteActionError` (same JSON-encoded-fieldErrors pattern as
      `src/features/drivers/types.ts`'s `DriverActionError`), per
      contracts/routes-clients.md.
- [X] T005 [P] Create `src/features/clients/types.ts` with `ClientRow`, `ClientActionError`, and
      `parseClientActionError`, following the same pattern as T004.
- [X] T006 [P] Create `src/features/routes/actions/route-actions.ts` with only a shared
      `assertAdminAccess()` helper (re-checks `resolveAdminOnlyAccess` independently — same
      pattern as `src/features/drivers/actions/driver-actions.ts`). Story phases below append
      their own exported actions to this same file.
- [X] T007 [P] Create `src/features/clients/actions/client-actions.ts` with the same
      `assertAdminAccess()` helper shape as T006.
- [X] T008 [P] Create `src/features/routes/lib/route-number.ts` exporting
      `formatRouteNumber(sequenceNumber: number): string` (e.g. `RT-000042`, zero-padded to 6
      digits) — research.md #2.
- [X] T009 [P] Create `src/features/routes/lib/route-status.ts` exporting
      `isFinalStatus(status): boolean` (`true` for `COMPLETED`/`CANCELLED`) and
      `autoStatusForDriverPresence(hasDriver: boolean): "ASSIGNED" | "SCHEDULED"` — research.md
      #3, FR-017a.
- [X] T010 [P] Create `src/features/routes/lib/driver-conflict.ts` exporting
      `findConflictingRoute(driverId: string, candidate: { pickupAt: Date; deliveryAt: Date |
      null }, excludeRouteId?: string): Promise<RouteRow | null>`: queries the driver's other
      non-final routes with `deliveryAt` set, and — only when `candidate.deliveryAt` is also
      set — returns the first one whose window overlaps
      (`existing.pickupAt < candidate.deliveryAt && candidate.pickupAt < existing.deliveryAt`);
      returns `null` immediately if `candidate.deliveryAt` is missing — research.md #4, FR-019.
- [X] T011 [P] Unit test in `tests/features/routes/route-number.test.ts`: `formatRouteNumber`
      produces the expected zero-padded, prefixed string for representative sequence numbers
      (T008).
- [X] T012 [P] Unit test in `tests/features/routes/route-status.test.ts`: `isFinalStatus` is
      `true` only for `COMPLETED`/`CANCELLED`; `autoStatusForDriverPresence` returns `ASSIGNED`
      when `true` and `SCHEDULED` when `false` (T009).
- [X] T013 [P] Unit test in `tests/features/routes/driver-conflict.test.ts`: `findConflictingRoute`
      (T010, mocked Prisma) flags an overlapping non-final route when both routes have
      `deliveryAt` set, allows non-overlapping windows, ignores `COMPLETED`/`CANCELLED` routes,
      and — per the Clarifications session — allows the assignment when either the candidate or
      the existing route has no `deliveryAt` (FR-019, spec.md Clarifications).
- [X] T014 [P] Add `getActiveDriversForSelect(): Promise<{ id: string; name: string }[]>` to the
      existing `src/features/drivers/data/driver-repository.ts` (`where: { status: "ACTIVE",
      user: { role: "DRIVER" } }`, ordered by name) — research.md #7.
- [X] T015 [P] Create `src/features/clients/data/client-repository.ts` with
      `getActiveClients(): Promise<{ id: string; companyName: string }[]>`
      (`where: { status: "ACTIVE" }`, ordered by `companyName`) — research.md #7.
- [X] T016 Add a "Routes" entry to `src/components/app-shell/nav-items.ts`, positioned between
      "Containers" and "Drivers", `href: "/routes"`, `roles: ["administrator"]`, using the
      `Waypoints` icon from `lucide-react` — FR-004.
- [X] T017 [P] Extend `tests/unit/nav-items.test.ts`: the administrator navigation list includes
      "Routes" immediately after "Containers" and before "Drivers"; the driver navigation list
      is unchanged (still `["Dashboard"]`) — FR-004.

**Checkpoint**: Schema migrated; shared route/client building blocks exist and are tested. User
story work can begin.

---

## Phase 3: User Story 1 - Administrator Creates and Views Routes (Priority: P1) 🎯 MVP

**Goal**: `/routes` shows a table of all routes for an administrator, with create/edit/view
capabilities; a route can be created with or without a driver.

**Independent Test**: Sign in as an administrator, open `/routes`, create a route for an active
client with pickup/delivery details and no driver, confirm it appears in the table with an
"unassigned" indicator (spec.md US1).

- [X] T018 [US1] Add `createRouteInputSchema` and `updateRouteInputSchema` (Zod) to
      `src/features/routes/lib/validation.ts`: `clientId` (required), `pickupAddress`/
      `deliveryAddress` (required), `pickupAt` (required, ISO datetime), `deliveryAt` (optional,
      ISO datetime), `referenceNumber`/`notes` (optional); `createRouteInputSchema` additionally
      accepts optional `driverId`; `updateRouteInputSchema` additionally requires `routeId` and
      excludes `driverId`/`status` (FR-011, FR-016).
- [X] T019 [US1] Implement `getRouteDirectory(): Promise<RouteRow[]>` (no filters yet — extended
      in US6) and `getRouteById(routeId: string, requester: { role: SessionRole; driverId?:
      string }): Promise<RouteRow | null>` in `src/features/routes/data/route-repository.ts`:
      query `Route` with `client`/`driver` included, map to `RouteRow` via `formatRouteNumber`
      (T008) and `driver?.truckNumber ?? null`; `getRouteById` returns `null` immediately when
      `requester.role !== "administrator"` (secure-by-default placeholder — real driver-owns
      check lands in US3, T040).
- [X] T020 [US1] Add `createRouteAction(input: unknown): Promise<{ routeId: string }>` to
      `route-actions.ts`: `assertAdminAccess()` (T006) → `createRouteInputSchema.safeParse`
      (T018) → re-check the referenced `Client` exists and is `ACTIVE` (FR-014) → if `driverId`
      given, re-check the `Driver` exists and is `ACTIVE`, then `findConflictingRoute` (T010)
      and throw a clear, conflict-naming error on a match (FR-018, FR-019) → create the `Route`
      with `status: autoStatusForDriverPresence(Boolean(driverId))` (T009) →
      `revalidatePath("/routes")` (FR-015, FR-017a).
- [X] T021 [US1] Add `updateRouteAction(input: unknown): Promise<void>` to `route-actions.ts`:
      `assertAdminAccess()` (T006) → load the route, throw if missing or `isFinalStatus` (T009,
      FR-023) → `updateRouteInputSchema.safeParse` (T018) → re-check the (possibly changed)
      `Client` is `ACTIVE` → update the core fields → `revalidatePath("/routes")` (FR-016).
- [X] T021a [P] [US1] Unit test in `tests/features/routes/update-route-action.test.ts` (mocked
      Prisma): `updateRouteAction` (T021) rejects edits when the target route is already
      `COMPLETED`/`CANCELLED`, and rejects when the referenced client is not `ACTIVE` (FR-014,
      FR-023).
- [X] T022 [P] [US1] Create `src/features/routes/components/route-status-badge.tsx` (one badge
      per `RouteStatus` value, following `driver-status-badge.tsx`'s pattern).
- [X] T023 [P] [US1] Create `src/features/routes/components/routes-header.tsx`: page
      header/eyebrow/title/subtitle, a "Create route" button (wired in T025), and a "Manage
      clients" link to `/clients` (inert until US5's page exists) — FR-005, FR-026.
- [X] T024 [US1] Create `src/features/routes/components/routes-table.tsx`: renders route rows
      (route number, client, pickup, delivery, driver name or "Unassigned", pickup date,
      `route-status-badge` from T022, row-actions cell) and a distinct empty state when no
      routes exist at all (FR-006, FR-009).
- [X] T025 [US1] Create `src/features/routes/components/create-route-dialog.tsx` (Client
      Component): client select (T015's `getActiveClients`, passed as a prop), pickup/delivery
      address fields, pickup/delivery date-time fields, optional driver select (T014's
      `getActiveDriversForSelect`, passed as a prop), reference number, notes — deliberately no
      truck field (FR-013) — calling `createRouteAction` (T020) and surfacing field/conflict
      errors; success closes the dialog and refreshes the table (FR-015).
- [X] T026 [US1] Create `src/features/routes/components/edit-route-dialog.tsx`: client, pickup/
      delivery details, dates, reference number, notes (no driver/status fields), pre-filled
      from the selected route, with its client select limited to `getActiveClients` (T015)
      exactly as in `create-route-dialog.tsx` (FR-034), calling `updateRouteAction` (T021);
      disabled with an explanatory message when the route `isFinalStatus` (FR-016, FR-023).
- [X] T027 [US1] Create `src/features/routes/components/route-row-actions-menu.tsx`
      (Client Component, keyboard-accessible shadcn dropdown) with "Edit" (opens T026) and "View
      details" (opens T028) items for now; assign/status/cancel items are added in later
      stories.
- [X] T028 [US1] Create `src/features/routes/components/route-details-dialog.tsx`: shows every
      recorded route field, including the derived truck (from the row's `truckNumber`, or a
      clear "No truck" indication when there is no driver or the driver has none) — FR-024,
      FR-025.
- [X] T029 [US1] Create `src/app/(admin)/routes/page.tsx` as a Server Component: read
      `getSessionAccess()`; if `role === "administrator"`, call `getRouteDirectory` (T019) and
      compose `routes-header` (T023), `routes-table` (T024) with row actions (T027/T028), and
      `create-route-dialog` (T025); otherwise render a temporary "no routes assigned yet"
      placeholder for the driver role (replaced with the real driver view in US3, T041).
- [X] T030 [P] [US1] Create `src/app/(admin)/routes/loading.tsx` (table loading skeleton —
      FR-010).
- [X] T031 [P] [US1] Create `src/app/(admin)/routes/error.tsx` (error state, mirroring
      `src/app/(admin)/(restricted)/timesheets/error.tsx` — FR-010).
- [X] T032 [P] [US1] Unit test in `tests/features/routes/route-repository.test.ts`:
      `getRouteDirectory` maps `Route` rows to `RouteRow` correctly, including the formatted
      route number and the derived truck value (mocked Prisma).

**Checkpoint**: `/routes` is fully functional for an administrator (create/view/edit/details) —
independently testable per spec.md US1's Independent Test.

---

## Phase 4: User Story 2 - Administrator Assigns and Reassigns a Driver (Priority: P1)

**Goal**: An administrator can assign an active driver to an unassigned route, reassign an
already-assigned route to a different active driver, or remove the driver — with conflict and
active-status checks and automatic status sync.

**Independent Test**: Create a route with no driver, assign an active driver (status/driver
column update), reassign to a different active driver, confirm no duplicate/orphaned assignment
(spec.md US2).

- [X] T033 [US2] Add `assignDriverInputSchema` (`{ routeId: string; driverId: string }`) to
      `src/features/routes/lib/validation.ts`.
- [X] T034 [US2] Add `assignDriverAction(input: unknown): Promise<void>` and
      `unassignDriverAction(input: { routeId: string }): Promise<void>` to `route-actions.ts`:
      both call `assertAdminAccess()` (T006), load the route and throw if missing or
      `isFinalStatus` (T009); `assignDriverAction` additionally validates input (T033),
      re-checks the `Driver` exists and is `ACTIVE` (FR-018), runs `findConflictingRoute` (T010)
      excluding the current route and throws a clear conflict error on a match (FR-019), then
      sets `driverId` and `status: "ASSIGNED"` (T009, FR-017a); `unassignDriverAction` sets
      `driverId: null` and `status: "SCHEDULED"` (FR-017c); both call
      `revalidatePath("/routes")`.
- [X] T035 [US2] Create `src/features/routes/components/assign-driver-dialog.tsx` (Client
      Component): active-driver select (T014), calling `assignDriverAction` (T034); shows an
      "Unassign driver" action when the route already has one, calling `unassignDriverAction`
      (T034).
- [X] T036 [US2] Add "Assign driver" / "Reassign driver" (and "Unassign driver" when applicable)
      items to `route-row-actions-menu.tsx` (T027), opening `assign-driver-dialog.tsx` (T035);
      hide/disable these items when the route `isFinalStatus`.
- [X] T037 [US2] Update `routes-table.tsx` (T024) so the driver column clearly reflects
      "Unassigned" vs. a driver's name, and the status badge (T022) reflects the auto-synced
      status after an assignment change without a manual page reload.
- [X] T038 [P] [US2] Unit test in `tests/features/routes/assign-driver-action.test.ts` (mocked
      Prisma): `assignDriverAction` rejects an inactive driver and a conflicting overlapping
      route, and sets `status: "ASSIGNED"` on success; `unassignDriverAction` sets `status:
      "SCHEDULED"`; both reject when the route is already final (FR-017a, FR-018, FR-019,
      FR-023).

**Checkpoint**: Assignment/reassignment works end-to-end on top of US1 — independently testable
per spec.md US2's Independent Test.

---

## Phase 5: User Story 3 - Driver Access Is Restricted to Their Own Routes (Priority: P1)

**Goal**: A signed-in driver reaches `/routes` and sees only routes assigned to them; no
route-management or client-management action is reachable by a driver, whether through the UI or
by direct invocation.

**Independent Test**: Sign in as a driver-role user, confirm `/routes` shows only routes
assigned to them, and confirm both a route-management and a client-management action are denied
when invoked directly (spec.md US3).

- [X] T039 [US3] Implement `getMyRoutes(driverId: string): Promise<RouteRow[]>` in
      `route-repository.ts` (T019's file): `where: { driverId }`, same `RouteRow` mapping,
      ordered by `pickupAt desc` (FR-003).
- [X] T040 [US3] Update `getRouteById` (T019) to implement the real driver-owns check: when
      `requester.role !== "administrator"`, return the route only if
      `route.driverId === requester.driverId`, otherwise `null` (FR-003, US3 Acceptance Scenario
      4) — replaces the "always null for non-admins" placeholder from T019.
- [X] T041 [US3] Update `src/app/(admin)/routes/page.tsx` (T029): replace the driver-role
      placeholder with a real read-only view — resolve the signed-in user's own `Driver.id`
      server-side (never from client input), call `getMyRoutes` (T039), and compose
      `my-routes-table.tsx` (T042). No create/edit/assign/status controls are rendered for this
      role (FR-003).
- [X] T042 [P] [US3] Create `src/features/routes/components/my-routes-table.tsx`: read-only
      table (route number, client, pickup, delivery, pickup date, status) with no row-actions
      menu, plus its own empty state ("No routes assigned yet").
- [X] T043 [US3] Wire `route-details-dialog.tsx` (T028) for the driver-facing view to call the
      upgraded `getRouteById` (T040) so a driver can open details only for their own route; a
      direct request for a route not assigned to them resolves to "not found" (FR-003).
- [X] T044 [P] [US3] Unit test in `tests/features/routes/authorization.test.ts`: every exported
      action in `route-actions.ts` (`createRouteAction`, `updateRouteAction`,
      `assignDriverAction`, `unassignDriverAction`) and every exported action in
      `client-actions.ts` throws when `getSessionAccess` resolves a non-administrator or
      signed-out session, regardless of any role value embedded in the input payload; `
      getMyRoutes`/`getRouteById` (T039/T040) never return a route not owned by the requesting
      driver (FR-001, FR-002, FR-003, SC-006).

**Checkpoint**: All three P1 user stories are independently functional; the feature's core
security boundary is exercised by automated tests.

---

## Phase 6: User Story 4 - Administrator Manages Route Status and Cancellation (Priority: P2)

**Goal**: An administrator can manually move a route between non-final statuses at any time,
mark it complete, or cancel it (preserving the record) — with every mutation blocked once a
route is final.

**Independent Test**: Advance a route through statuses freely, then cancel a different route and
confirm it remains visible with a cancelled status rather than disappearing (spec.md US4).

- [X] T045 [US4] Add `setRouteStatusInputSchema` (`{ routeId: string; status: "SCHEDULED" |
      "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" }`) to `src/features/routes/lib/validation.ts`.
- [X] T046 [US4] Add `setRouteStatusAction(input: unknown): Promise<void>` and
      `cancelRouteAction(input: { routeId: string }): Promise<void>` to `route-actions.ts`: both
      call `assertAdminAccess()` (T006), load the route and throw if missing or already
      `isFinalStatus` (T009, FR-023); `setRouteStatusAction` validates input (T045) and sets
      `status` to the requested value with no ordering restriction (Clarifications session,
      FR-021); `cancelRouteAction` sets `status: "CANCELLED"` without touching any other field
      (FR-022); both call `revalidatePath("/routes")`.
- [X] T047 [US4] Add a "Set status" control to `route-details-dialog.tsx` (T028) wired to
      `setRouteStatusAction` (T046), disabled when the route `isFinalStatus`.
- [X] T048 [US4] Add a "Cancel route" item (with a confirmation step) to
      `route-row-actions-menu.tsx` (T027/T036), wired to `cancelRouteAction` (T046); hidden or
      disabled when the route is already final.
- [X] T049 [P] [US4] Unit test in `tests/features/routes/route-status-action.test.ts` (mocked
      Prisma): `setRouteStatusAction` allows moving freely between `SCHEDULED`/`ASSIGNED`/
      `IN_PROGRESS` (including "backward") and rejects when the route is already
      `COMPLETED`/`CANCELLED`; `cancelRouteAction` sets `CANCELLED` without deleting the row and
      rejects when the route is already final (FR-021, FR-022, FR-023, SC-004).

**Checkpoint**: Status lifecycle and cancellation work end-to-end on top of US1/US2.

---

## Phase 7: User Story 5 - Administrator Manages Clients (Priority: P2)

**Goal**: A `/clients` page (linked from Routes, not in the sidebar) for viewing, adding,
editing, and activating/deactivating clients, plus a quick-add-client flow from inside route
creation that never loses in-progress route form data.

**Independent Test**: From `/routes`, open client management, add a client, edit it, deactivate
it (no longer selectable for new routes but existing routes referencing it are unaffected), then
use quick-add from route creation without losing entered route fields (spec.md US5).

- [X] T050 [US5] Add `addClientInputSchema` and `updateClientInputSchema` (Zod) to
      `src/features/clients/lib/validation.ts`: `companyName`/`contactName`/`address` (required,
      non-empty), `phone` (required, valid phone format — reuse the `PHONE_RE` pattern from
      `src/features/drivers/lib/validation.ts`), `email` (required, valid email);
      `updateClientInputSchema` additionally requires `clientId`. Neither schema accepts
      `status` (FR-029, FR-030, FR-031).
- [X] T051 [US5] Implement `getClientDirectory(filters?: { search?: string }):
      Promise<ClientRow[]>` in `src/features/clients/data/client-repository.ts` (T015's file):
      all clients, case-insensitive `search` match against `companyName`/`contactName`, ordered
      by `companyName` (FR-028).
- [X] T052 [US5] Add `addClientAction`, `updateClientAction`, and `setClientStatusAction` to
      `client-actions.ts`: each calls `assertAdminAccess()` (T007) then validates with T050 (add/
      update) or a small inline status schema; `addClientAction` creates with `status: "ACTIVE"`
      and returns `{ clientId, client: { id, companyName } }`; `updateClientAction` updates the
      five editable fields only; `setClientStatusAction` toggles `status` only — all three call
      `revalidatePath("/clients")`, and `addClientAction`/`setClientStatusAction` additionally
      call `revalidatePath("/routes")` (FR-029–FR-032).
- [X] T053 [P] [US5] Create `src/features/clients/components/client-status-badge.tsx` (Active /
      Inactive badge).
- [X] T054 [P] [US5] Create `src/features/clients/components/clients-header.tsx`: page header
      and an "Add client" button (wired in T058).
- [X] T055 [US5] Create `src/features/clients/components/clients-table.tsx`: company name,
      contact name, phone, email, `client-status-badge` (T053), row actions (Edit,
      Activate/Deactivate), a distinct empty state and a distinct no-results state for search
      (FR-028).
- [X] T056 [US5] Create `src/features/clients/components/add-client-dialog.tsx` (Client
      Component) accepting an optional `onCreated?: (client: { id: string; companyName: string
      }) => void` prop (research.md #5), calling `addClientAction` (T052) and invoking
      `onCreated` with the created client on success in addition to its normal close/refresh
      behavior.
- [X] T057 [US5] Create `src/features/clients/components/edit-client-dialog.tsx`, pre-filled
      from the selected client, calling `updateClientAction` (T052).
- [X] T058 [US5] Create `src/app/(admin)/(restricted)/clients/page.tsx` as a Server Component:
      call `getClientDirectory` (T051) and compose `clients-header` (T054, wired to T056),
      `clients-table` (T055) with row actions (T057, and Activate/Deactivate wired to
      `setClientStatusAction`).
- [X] T059 [P] [US5] Create `src/app/(admin)/(restricted)/clients/loading.tsx`.
- [X] T060 [P] [US5] Create `src/app/(admin)/(restricted)/clients/error.tsx`.
- [X] T061 [US5] Wire the "Manage clients" link in `routes-header.tsx` (T023) to navigate to
      `/clients` (T058) — FR-026.
- [X] T062 [US5] Integrate quick-add-client into `create-route-dialog.tsx` (T025): render
      `add-client-dialog.tsx` (T056) as a nested dialog behind a "+ New client" control next to
      the client select, without unmounting `create-route-dialog`'s own form state; its
      `onCreated` callback appends the new client to the in-memory active-clients list and
      selects it (research.md #5, FR-035, SC-005).
- [X] T063 [P] [US5] Unit test in `tests/features/clients/validation.test.ts`: required-field
      and phone/email format rules for `addClientInputSchema`/`updateClientInputSchema` (T050).

**Checkpoint**: Client management and the quick-add flow are fully functional.

---

## Phase 8: User Story 6 - Administrator Searches and Filters Routes (Priority: P3)

**Goal**: Narrow the routes table by status, driver (including "Unassigned"), client, pickup
date, or a text search across route number/client name/reference number.

**Independent Test**: With routes across different statuses/drivers/clients/dates, apply each
filter and a search term in turn and confirm the table narrows correctly each time (spec.md
US6).

- [X] T064 [US6] Extend `getRouteDirectory(filters?: RouteDirectoryFilters)` (T019) in
      `route-repository.ts` to apply `status`, `driverId` (a literal `"UNASSIGNED"` maps to
      `driverId: null`), `clientId`, `pickupDateFrom`/`pickupDateTo`, and `search` (matched
      against the formatted route number, `client.companyName`, and `referenceNumber`) —
      FR-007, FR-008.
- [X] T065 [US6] Create `src/features/routes/components/route-filters-bar.tsx` (Client
      Component): status/driver/client/date filter controls and a search input, driving URL
      search params (mirrors `src/features/drivers/components/driver-filters-bar.tsx`'s
      pattern).
- [X] T066 [US6] Update `src/app/(admin)/routes/page.tsx` (T029/T041) to parse and validate
      filter search params with Zod (mirroring `drivers/page.tsx`'s `driversSearchParamsSchema`)
      and pass them to `getRouteDirectory` (T064); compose `route-filters-bar.tsx` (T065) into
      the admin view only.
- [X] T067 [US6] Update `routes-table.tsx` (T024) to render a distinct no-results state (an
      applied filter/search matches nothing) separate from the no-routes-at-all empty state
      (FR-009).
- [X] T068 [P] [US6] Unit test in `tests/features/routes/route-repository.test.ts` (extends
      T032): each filter (`status`, `driverId` incl. `"UNASSIGNED"`, `clientId`,
      `pickupDateFrom`/`pickupDateTo`) and `search` narrow the returned rows correctly (mocked
      Prisma).

**Checkpoint**: All six user stories are independently functional.

---

## Phase 9: Polish & Cross-Cutting Concerns

- [X] T069 [P] Responsive pass over `routes-table.tsx`, `route-filters-bar.tsx`,
      `create-route-dialog.tsx`, `edit-route-dialog.tsx`, `assign-driver-dialog.tsx`,
      `route-details-dialog.tsx`, `my-routes-table.tsx`, `clients-table.tsx`,
      `add-client-dialog.tsx`, and `edit-client-dialog.tsx` at desktop/tablet/mobile widths
      (FR-036, SC-008).
- [X] T070 [P] Update `prisma/seed.ts` with representative sample `Client` and `Route` rows
      (at least one unassigned route, one assigned route, one of each `RouteStatus`, and one
      cancelled route) so the feature is exercisable in local dev without manual data entry.
- [X] T071 Execute every scenario in `specs/006-routes-clients/quickstart.md` end-to-end against
      a local dev environment; fix any gaps found.
- [X] T072 Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`; resolve any failures
      caused by this feature (constitution §15 quality gate).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS every user story.
- **US1 (Phase 3)**: Depends only on Foundational.
- **US2 (Phase 4)**: Depends on Foundational; its dialog/menu items attach to US1's table
  (T024) and row-actions menu (T027) — build after US1.
- **US3 (Phase 5)**: Depends on Foundational and on US1's page (T029) to add the driver-role
  branch to — build after US1; independent of US2's assignment logic itself, but naturally
  follows since both P1 stories touch the same page.
- **US4 (Phase 6)**: Depends on Foundational (T009) and on US1/US2's row-actions menu
  (T027/T036) — build after US2.
- **US5 (Phase 7)**: Depends on Foundational (T015) and on US1's `create-route-dialog.tsx`
  (T025) for the quick-add integration (T062) — build after US1; independent of US2/US3/US4.
- **US6 (Phase 8)**: Depends on US1's table/repository (T019/T024) — build last among the route
  stories since it only adds filtering on top of an already-complete list view.
- **Polish (Phase 9)**: Depends on all desired user stories being complete.

### Within Each User Story

- Validation schemas before the actions that use them.
- Actions before the dialog/menu components that call them.
- Story complete and independently testable before moving to the next.

### Parallel Opportunities

- Foundational: T004, T005, T006, T007, T008, T009, T010, T014, T015 are all different files
  with no interdependency; T011/T012/T013 follow their respective lib files (T008/T009/T010).
- US1: T022, T023 in parallel once T019 is underway; T030/T031 anytime after T029 exists; T032
  anytime after T019.
- US2: T038 anytime after T034.
- US3: T042 in parallel with T039/T040; T044 anytime after T034/T046's actions exist (or run
  against T020/T021/T034 alone first, extending as later actions land).
- US5: T053 and T054 in parallel; T059/T060 anytime after T058; T063 anytime after T050.
- US6: T068 anytime after T064.
- Polish: T069 and T070 in parallel.

---

## Parallel Example: Foundational Phase

```bash
# After T002/T003 (schema + migration) land, run these together:
Task: "Create src/features/routes/types.ts"
Task: "Create src/features/clients/types.ts"
Task: "Create src/features/routes/actions/route-actions.ts shell with assertAdminAccess"
Task: "Create src/features/clients/actions/client-actions.ts shell with assertAdminAccess"
Task: "Create src/features/routes/lib/route-number.ts"
Task: "Create src/features/routes/lib/route-status.ts"
Task: "Create src/features/routes/lib/driver-conflict.ts"
Task: "Add getActiveDriversForSelect to src/features/drivers/data/driver-repository.ts"
Task: "Create src/features/clients/data/client-repository.ts with getActiveClients"
```

## Parallel Example: User Story 1

```bash
# Once T019 (route-repository) is underway, these can be built together:
Task: "Create route-status-badge.tsx"
Task: "Create routes-header.tsx"
```

---

## Implementation Strategy

### MVP First (User Stories 1–3 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational (schema migration + shared helpers — blocks everything else).
3. Complete Phase 3: User Story 1 (create/view routes).
4. Complete Phase 4: User Story 2 (assign/reassign a driver).
5. Complete Phase 5: User Story 3 (driver access boundary).
6. **STOP and VALIDATE**: run spec.md US1–US3's Independent Tests. All three are P1 — the
   feature has no responsible way to ship with routes visible/creatable but the driver-access
   boundary untested.

### Incremental Delivery

1. Setup + Foundational → foundation ready.
2. US1 (create/view routes) → validate independently.
3. US2 (assign/reassign driver) → validate independently → this + US1 is the first
   operationally useful increment.
4. US3 (driver access boundary) → validate independently — the practical MVP is US1+US2+US3
   together, since shipping route data without the access boundary tested is not acceptable.
5. US4 (status lifecycle/cancellation) → validate independently.
6. US5 (client management + quick-add) → validate independently.
7. US6 (search/filter) → validate independently.
8. Polish.

### Suggested MVP Scope

User Story 1 alone (Phase 3) is the smallest independently-demonstrable increment, but **User
Stories 1, 2, and 3 together** are the practical MVP: all three are marked P1 in spec.md, and
US3 is the feature's hard security boundary (a driver must never see another driver's route)
rather than an optional enhancement.
