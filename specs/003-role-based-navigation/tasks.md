---

description: "Task list for Role-Based Dashboard Navigation implementation"
---

# Tasks: Role-Based Dashboard Navigation

**Input**: Design documents from `/specs/003-role-based-navigation/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included — plan.md commits to Vitest unit tests for the feature's authorization-adjacent
pure functions (route access resolution, role-based navigation filtering), per the constitution's
requirement to test authorization rules.

**Organization**: This feature has three user stories (US1 P1, US2 P1, US3 P2). Setup and
Foundational tasks establish the shared access-resolution functions all three stories depend on;
each story then adds its own user-visible slice on top.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3) — omitted for Foundational
  and Polish tasks
- Include exact file paths in descriptions

## Path Conventions

Single Next.js App Router project under `src/`, per plan.md's Structure Decision:
`src/app/(admin)/...`, `src/app/(admin)/(restricted)/...`, `src/components/app-shell/...`,
`src/lib/auth/...`, `tests/unit/...`.

---

## Phase 1: Setup

No new setup tasks are required — this feature introduces no new dependencies, tooling, or
project scaffolding. All work is the route/file reorganization and logic changes captured in
Foundational and the user story phases below.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Replace the single role-aware `resolveRouteAccess` with the two narrower access
functions every user story depends on, and reshape the shared session accessor to expose raw
session data instead of a pre-resolved outcome.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T001 [P] Rewrite `src/lib/auth/route-access.ts`: remove `resolveRouteAccess` /
  `RouteAccessResult` (and the `"driver-area"` outcome) and implement `resolveDashboardAccess`
  (`DashboardAccessResult`: render for any signed-in user, redirect to sign-in otherwise) and
  `resolveAdminOnlyAccess` (`AdminOnlyAccessResult`: render only for `role === "administrator"`,
  redirect to sign-in when signed out, redirect to `dashboard` for any other role including
  unrecognized/missing — fail closed) per `contracts/route-access.md`
- [X] T002 Rewrite `tests/unit/route-access.test.ts` to cover both functions: for
  `resolveDashboardAccess` — signed-out → sign-in redirect, signed-in (either role) → render; for
  `resolveAdminOnlyAccess` — signed-out → sign-in redirect, administrator → render, driver →
  dashboard redirect, and an unrecognized/missing role → dashboard redirect (fail-closed case)
  (depends on: T001)
- [X] T003 Update `src/lib/auth/get-session-access.ts` to return raw session data
  (`{ isSignedIn, role, user, redirectToSignIn }`) instead of a pre-resolved access outcome,
  removing its dependency on the old combined function so each layout can call whichever access
  function it needs (depends on: T001)
- [X] T004 [P] Update `src/proxy.ts` to call `resolveDashboardAccess({ isSignedIn })` in place of
  the removed `resolveRouteAccess`, keeping the existing route matcher (`/dashboard(.*)`,
  `/timesheets(.*)`, `/containers(.*)`, `/drivers(.*)`, `/reports(.*)`, `/settings(.*)`) unchanged
  (depends on: T001)

**Checkpoint**: Shared access-resolution functions exist, are unit-tested, and are wired into the
edge middleware. User story implementation can now begin.

---

## Phase 3: User Story 1 - Everyone Lands on the Same Dashboard (Priority: P1) 🎯 MVP

**Goal**: A Driver who signs in successfully lands on `/dashboard` — the same destination as an
Administrator — instead of a separate driver-only placeholder, and the dashboard renders sensibly
(minimal placeholder content) for that role.

**Independent Test**: Sign in as a Driver-role test account and confirm the browser lands on
`/dashboard` (not `/driver` or any other driver-only URL) with the page rendering without error;
sign in as an Administrator and confirm `/dashboard` is unchanged from current behavior —
verified via quickstart.md scenarios 1–3 and 5.

### Implementation for User Story 1

- [X] T005 [US1] Update `src/app/page.tsx` to redirect any signed-in user (Administrator or
  Driver) to `/dashboard`, and an unauthenticated visitor to sign-in, using the new
  `getSessionAccess()` shape — remove the role branch and the `redirect("/driver")` call
  (depends on: T003)
- [X] T006 [US1] Update `src/app/(admin)/layout.tsx` to guard with
  `resolveDashboardAccess({ isSignedIn })` (signed-in only, no role check) instead of the old
  combined outcome, removing the `redirect("/driver")` branch, while still reading the session's
  `role`/`user` from `getSessionAccess()` to pass through to `Sidebar` (depends on: T001, T003)
- [X] T007 [US1] Update `src/app/(admin)/dashboard/page.tsx` to branch on role: Administrator
  renders the existing operational dashboard content completely unchanged; Driver renders a
  minimal placeholder body, reusing the copy/style of the removed driver-area placeholder
  ("Driver area" / "The driver experience is coming soon.") (depends on: T006)
- [X] T008 [P] [US1] Delete `src/app/driver/page.tsx` — superseded by `/dashboard` rendering for
  every role

**Checkpoint**: Drivers and Administrators both land on and can render `/dashboard`. (The sidebar
still shows the full navigation to Drivers at this checkpoint — that regression is closed by User
Story 2, next.)

---

## Phase 4: User Story 2 - Navigation Reflects the Signed-In User's Role (Priority: P1)

**Goal**: The sidebar shows only role-appropriate navigation items — Administrators keep the full
set; Drivers see only Dashboard.

**Independent Test**: On `/dashboard`, confirm an Administrator-role account sees Dashboard,
Timesheets, Containers, Drivers, Reports, and Settings, while a Driver-role account sees only
Dashboard — verified via quickstart.md scenario 4.

### Implementation for User Story 2

- [X] T009 [P] [US2] Add a `roles: SessionRole[]` field to each entry in
  `src/components/app-shell/nav-items.ts` and implement `getNavItemsForRole(role)` per
  `contracts/navigation.md` and `data-model.md` — Dashboard for both roles; Timesheets,
  Containers, Drivers, Reports, and Settings for `"administrator"` only; any other role (including
  unrecognized/missing) treated as `"driver"` (fail closed)
- [X] T010 Unit test `getNavItemsForRole` in `tests/unit/nav-items.test.ts`: administrator → full
  six-item list; driver → Dashboard only; unrecognized/missing role → Dashboard only (fail-closed
  case) (depends on: T009)
- [X] T011 [US2] Update `src/components/app-shell/sidebar.tsx` (a Client Component) to call
  `getNavItemsForRole(user.role)` itself from the plain `role` string it already receives,
  instead of importing the static `navItems` list directly. **Revised during implementation**:
  the originally planned design — the Server Component layout calling `getNavItemsForRole` and
  passing the resolved array down as a `navItems` prop — throws at runtime, because `NavItem.icon`
  is a component (a function) and React Server Components cannot pass functions as props to
  Client Components. Calling the (pure, synchronous) filter function inside `Sidebar` itself,
  keyed off the plain `role` string, avoids that boundary entirely; see the corrected consumer
  note in `contracts/navigation.md` (depends on: T009)
- [X] T012 [US2] `src/app/(admin)/layout.tsx` requires no `getNavItemsForRole` import or call —
  it already passes `user.role` through to `<Sidebar user={{ ..., role: effectiveRole }} />` via
  T006, which is all `Sidebar` needs per T011's revised design (depends on: T009, T011, T006)

**Checkpoint**: User Stories 1 and 2 both work together — Administrators see everything unchanged;
Drivers land on `/dashboard` with a navigation containing only Dashboard.

---

## Phase 5: User Story 3 - Admin-Only Pages Stay Protected Even by Direct Link (Priority: P2)

**Goal**: A Driver who directly requests an Administrator-only page URL (Timesheets, Containers,
Drivers, Reports, Settings) is redirected to `/dashboard` without ever seeing that page's
protected content; Administrators are unaffected.

**Independent Test**: While signed in as a Driver, directly navigate to each of the five
Administrator-only URLs and confirm every one redirects to `/dashboard`; while signed in as an
Administrator, confirm every one still renders normally — verified via quickstart.md scenarios
6–8.

### Implementation for User Story 3

- [X] T013 [US3] Create `src/app/(admin)/(restricted)/layout.tsx`: read the session via
  `getSessionAccess()`, call `resolveAdminOnlyAccess({ isSignedIn, role })`, and redirect to
  `/sign-in` or `/dashboard` per its outcome, rendering `children` only when the outcome is
  `render` (depends on: T001, T003)
- [X] T014 [P] [US3] Move `src/app/(admin)/timesheets/page.tsx` to
  `src/app/(admin)/(restricted)/timesheets/page.tsx` (page content unchanged) (depends on: T013)
- [X] T015 [P] [US3] Move `src/app/(admin)/containers/page.tsx` to
  `src/app/(admin)/(restricted)/containers/page.tsx` (page content unchanged) (depends on: T013)
- [X] T016 [P] [US3] Move `src/app/(admin)/drivers/page.tsx` to
  `src/app/(admin)/(restricted)/drivers/page.tsx` (page content unchanged) (depends on: T013)
- [X] T017 [P] [US3] Move `src/app/(admin)/reports/page.tsx` to
  `src/app/(admin)/(restricted)/reports/page.tsx` (page content unchanged) (depends on: T013)
- [X] T018 [P] [US3] Move `src/app/(admin)/settings/page.tsx` to
  `src/app/(admin)/(restricted)/settings/page.tsx` (page content unchanged) (depends on: T013)

**Checkpoint**: All three user stories are independently functional — quickstart.md scenarios
1–8 all pass.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final verification against the constitution's quality gates and the quickstart
guide.

- [ ] T019 [P] Execute quickstart.md validation scenarios 1–8 end-to-end (driver lands on
  dashboard, administrator unchanged, already-signed-in driver redirected from sign-in, driver
  nav restricted, driver dashboard content minimal, admin-only pages blocked for drivers by
  direct URL, admin-only pages still work for administrators, signed-out access still blocked)
- [X] T020 [P] Run `pnpm lint` and resolve any errors
- [X] T021 [P] Run `pnpm typecheck` and resolve any errors
- [X] T022 [P] Run `pnpm test` and confirm all unit tests pass
- [X] T023 Run `pnpm build` and confirm the production build succeeds (depends on: T019–T022)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No tasks
- **Foundational (Phase 2)**: No dependencies — start immediately; BLOCKS all three user stories
- **User Story 1 (Phase 3)**: Depends on Foundational (T001, T003) completion
- **User Story 2 (Phase 4)**: Depends on Foundational completion and on T006 (US1's version of
  `(admin)/layout.tsx`), since T012 edits the same file again
- **User Story 3 (Phase 5)**: Depends on Foundational (T001, T003) completion only — independent
  of US1 and US2's file changes, so it can proceed in parallel with Phase 3/4 if staffed
  separately
- **Polish (Phase 6)**: Depends on all three user stories being complete

### Within Each User Story

- US1: T005 and T008 are independent of each other and of T006/T007; T007 depends on T006 (same
  file, sequential edit)
- US2: T009 (nav-items data + function) must land before T010 (its test), T011 (Sidebar prop),
  and T012 (layout wiring); T012 also depends on T006 from US1 since it edits the layout again
- US3: T013 (the new restricted layout) must exist before any of the five page moves (T014–T018),
  which are otherwise independent of each other

### Parallel Opportunities

- Foundational: T001 and T004 can start in parallel (T004 only needs T001's new export name to
  exist); T002 and T003 each depend on T001 but not on each other
- User Story 1: T008 (delete `/driver`) can run in parallel with T005–T007
- User Story 2: T009 can run in parallel with anything in US1 that doesn't touch
  `nav-items.ts` or `sidebar.tsx`
- User Story 3: T014–T018 (the five page moves) can all run in parallel once T013 exists, and
  Phase 5 as a whole can run in parallel with Phase 3/4 since it touches a disjoint set of files
  (only `(restricted)/*`, never `(admin)/layout.tsx` or `dashboard/page.tsx`)
- Polish: T019–T022 can run in parallel; T023 (build) runs last

---

## Parallel Example: Foundational Phase

```bash
Task: "Rewrite src/lib/auth/route-access.ts per contracts/route-access.md"
Task: "Update src/proxy.ts to call resolveDashboardAccess"
```

## Parallel Example: User Story 3 (after T013)

```bash
Task: "Move src/app/(admin)/timesheets/page.tsx to src/app/(admin)/(restricted)/timesheets/page.tsx"
Task: "Move src/app/(admin)/containers/page.tsx to src/app/(admin)/(restricted)/containers/page.tsx"
Task: "Move src/app/(admin)/drivers/page.tsx to src/app/(admin)/(restricted)/drivers/page.tsx"
Task: "Move src/app/(admin)/reports/page.tsx to src/app/(admin)/(restricted)/reports/page.tsx"
Task: "Move src/app/(admin)/settings/page.tsx to src/app/(admin)/(restricted)/settings/page.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 2: Foundational (blocks all user stories)
2. Complete Phase 3: User Story 1
3. **STOP and VALIDATE**: Drivers land on `/dashboard` and it renders (quickstart scenarios 1–3,
   5) — note the sidebar is still unfiltered at this point; that's User Story 2's job
4. Deploy/demo if ready

### Incremental Delivery

1. Complete Foundational → shared access functions ready
2. Add User Story 1 → Drivers land on `/dashboard` (MVP!)
3. Add User Story 2 → Drivers' navigation is restricted → test independently
4. Add User Story 3 → Admin-only pages blocked for Drivers even by direct URL → test
   independently
5. Complete Phase 6: Polish (quality gates), then deploy/demo

### Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [US1]/[US2]/[US3] labels map every story task to its user story for traceability
- Commit after each task or logical group
- Stop at each phase checkpoint to validate that story independently before moving on
- Avoid: reintroducing a Driver-facing Timesheets nav item (explicitly out of scope per
  spec.md's Assumptions — see research.md Decision 4), and any change to the five admin-only
  pages' content beyond their file location
