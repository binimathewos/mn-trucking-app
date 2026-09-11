# Quickstart: Validating Routes & Client Management

Prerequisites: local Postgres running with `DATABASE_URL` set, Clerk dev instance keys in `.env`,
migrations applied (`pnpm prisma migrate dev`), at least one administrator account, at least one
`ACTIVE` and one `INACTIVE` driver seeded (reuse the existing driver-management seed data).

```bash
pnpm install
pnpm prisma migrate dev
pnpm dev
```

Sign in as an administrator, then navigate to **Routes** in the sidebar (`/routes`) — it should
appear between **Containers** and **Drivers**.

## Scenario 1 — Create and view routes (User Story 1 / FR-004–FR-016)

1. Open `/routes` with no routes yet seeded.
   - **Expect**: a clear empty state, not a blank table (FR-009).
2. Click **Create route**, leave the driver field unset, fill client + pickup/delivery
   addresses + pickup date/time, submit.
   - **Expect**: dialog closes, success feedback shown, a new row appears with a system-generated
     route number (e.g. `RT-000001`), status shows an "unassigned"/`SCHEDULED` indicator, no
     manual reload needed (FR-015).
3. Attempt to create a route missing a required field (e.g. no pickup address).
   - **Expect**: inline validation errors; no row is created.
4. Open **View details** on the created route.
   - **Expect**: full details shown, including a clear "no truck" indication (no driver assigned
     yet) (FR-024, FR-025).
5. Edit the route's delivery address and notes, save.
   - **Expect**: table and details view reflect the change immediately.

## Scenario 2 — Assign and reassign a driver (User Story 2 / FR-017–FR-019)

1. On the unassigned route from Scenario 1, assign an `ACTIVE` driver who has a `truckNumber` set.
   - **Expect**: row now shows the driver's name, status auto-changes to `ASSIGNED`, and the
     details view now shows that driver's truck number under "truck" (FR-017a, FR-025).
2. Attempt to assign an `INACTIVE` driver to a different route.
   - **Expect**: rejected with a clear message; route's driver unchanged (FR-018).
3. Create a second route for the same driver with a pickup/delivery window that overlaps the
   first route's window (both routes must have a delivery date/time set).
   - **Expect**: the assignment is rejected, and the error names the conflicting route (FR-019).
4. Repeat step 3 but leave delivery date/time blank on either route.
   - **Expect**: the assignment succeeds — the overlap check is skipped when either route lacks a
     delivery date/time (Clarifications session).
5. Reassign the first route to a different `ACTIVE` driver.
   - **Expect**: only the new driver shows on the route; no duplicate/simultaneous assignment
     exists.
6. Remove the driver from a route without picking a replacement (unassign).
   - **Expect**: status auto-reverts to `SCHEDULED` (FR-017a/c).

## Scenario 3 — Driver access is restricted to their own routes (User Story 3 / FR-001–FR-003)

1. Sign in as a driver-role user with at least one route assigned to them and confirm at least
   one other route exists that is assigned to a different driver or unassigned.
2. Navigate to `/routes`.
   - **Expect**: only the routes assigned to this driver are visible; no create/edit/assign
     controls are present.
3. Attempt to open a route not assigned to this driver by its direct URL/id.
   - **Expect**: access denied (FR-003, edge case row).
4. Attempt to invoke a route-mutation Server Action directly (e.g., via browser dev tools) and a
   client-management action directly.
   - **Expect**: both rejected server-side regardless of any role information the request claims
     (FR-002).
5. Navigate to `/clients` directly.
   - **Expect**: access denied.

## Scenario 4 — Route status lifecycle and cancellation (User Story 4 / FR-020–FR-023)

1. On an assigned route, manually set status to `IN_PROGRESS`, then manually set it back to
   `SCHEDULED`.
   - **Expect**: both changes succeed — no forward-only ordering is enforced (Clarifications
     session).
2. Set status to `COMPLETED`.
   - **Expect**: succeeds; the route is now final.
3. Attempt to change the completed route's status, driver, or core details.
   - **Expect**: every attempt is rejected because the route is in a final state (FR-023).
4. On a different, non-final route, cancel it.
   - **Expect**: status becomes `CANCELLED`; the row remains visible in the table and details view
     (FR-022, SC-004) — it is not removed or hidden.
5. Attempt to cancel the same route again.
   - **Expect**: rejected — already final (FR-023).

## Scenario 5 — Client management and quick-add (User Story 5 / FR-026–FR-035)

1. From `/routes`, click **Manage clients** and confirm it navigates to `/clients`.
2. Add a new client with all required fields.
   - **Expect**: created as `ACTIVE`, immediately visible in the client list and selectable from a
     route form.
3. Edit that client's phone and address.
   - **Expect**: updated values shown; any existing routes referencing this client are unaffected.
4. Deactivate the client.
   - **Expect**: it disappears from the route-creation client picker but any existing route that
     already references it still displays its information normally (FR-033).
5. Reactivate it.
   - **Expect**: selectable again in route forms.
6. Start creating a new route, fill in pickup/delivery/date/notes, then use the quick-add-client
   control to create a brand-new client without closing the route dialog.
   - **Expect**: after the new client is created, the route dialog is still open with every
     previously entered field intact, and the new client is now selected (FR-035, SC-005).

## Scenario 6 — Search and filter routes (User Story 6 / FR-007–FR-009)

1. With multiple routes across different statuses, drivers, and clients, apply a status filter.
   - **Expect**: only matching routes shown.
2. Apply a driver filter, including the "Unassigned" option.
   - **Expect**: only routes matching that driver (or truly unassigned routes) shown.
3. Apply a client filter, then a pickup-date filter.
   - **Expect**: results narrow correctly at each step.
4. Search by route number, then by client name, then by reference number.
   - **Expect**: only matching routes shown for each search.
5. Combine a filter and a search term that match nothing.
   - **Expect**: a distinct no-results state, not an empty, unexplained table (FR-009).

## Automated checks

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

All four must pass before the feature is considered complete (constitution §15).
