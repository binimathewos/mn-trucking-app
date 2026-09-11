# Quickstart: Validating Route-Based Driver Pay

Prerequisites: local Postgres running with `DATABASE_URL` set, Clerk dev instance keys in `.env`,
migrations applied, at least one administrator account and one `ACTIVE` driver account seeded
(reuse existing driver-management seed data), and at least one active `Client`.

```bash
pnpm install
pnpm prisma migrate dev
pnpm dev
```

## Scenario 1 — Default rate and route rate (User Story 2 / FR-005–FR-015)

1. Sign in as an administrator, open **Settings** (`/settings`).
   - **Expect**: a "Default driver hourly rate" field, initially `$0.00` if never configured.
2. Set the default rate to `22.00` and save.
   - **Expect**: success feedback; the value persists on reload.
3. Open **Routes** (`/routes`) → **Create route**.
   - **Expect**: the "Driver Hourly Rate" field is prepopulated with `22.00` (FR-014).
4. Change it to `25.50`, fill the remaining required fields, assign the seeded `ACTIVE` driver,
   and submit.
   - **Expect**: the route is created; opening **View details** shows `$25.50/hr` (FR-013).
5. Edit that route's rate to `27.00` and save.
   - **Expect**: the change is saved for this route only.
6. Go back to **Settings** and change the default rate to `30.00`.
   - **Expect**: the route from step 5 still shows `$27.00/hr` — unaffected (FR-010, SC-004).
7. Create a second route without touching the rate field.
   - **Expect**: it's created at `$30.00/hr` (the new default).
8. Submit the create-route form with the rate field cleared or set to `-5`.
   - **Expect**: validation blocks the save (FR-015).

## Scenario 2 — Driver logs hours against an assigned route (User Story 1 / FR-001–FR-004)

1. Sign in as the seeded driver (the one assigned to the `$27.00/hr` route from Scenario 1).
   - **Expect**: a **Timesheets** link now appears in the sidebar (it didn't exist for drivers
     before this feature).
2. Open **Timesheets** (`/timesheets`).
   - **Expect**: "My timesheets" — summary cards and a table of the driver's own entries (empty on
     first visit).
3. Click **Add Timesheet**.
   - **Expect**: the dialog's Route field lists only routes assigned to this driver (the
     `$27.00/hr` route and any others assigned to them) — no other driver's routes appear
     (FR-002).
4. Try to save without selecting a route.
   - **Expect**: blocked with a clear "Route is required" message (FR-001).
5. Select the route, set a date/start/end time, save.
   - **Expect**: dialog closes, the new entry appears in "My submitted timesheets" showing that
     route.
6. (Optional, requires DB/API access) Attempt to save an entry with a `routeId` for a route
   assigned to a *different* driver (bypassing the UI, e.g. by calling the action directly).
   - **Expect**: rejected server-side regardless of what was submitted (FR-004, SC-006).
7. Unassign this driver from the route (as an administrator, via **Routes**), then return to the
   driver's **Add Timesheet** dialog.
   - **Expect**: that route no longer appears in the Route select (FR-002); the previously saved
     entry from step 5 is untouched.

## Scenario 3 — Administrator reviews route-based pay (User Story 3 / FR-016–FR-020)

1. Sign in as the administrator, open **Timesheets** → the driver from Scenario 2's row for the
   relevant week.
   - **Expect**: the entry from Scenario 2 shows its route, hourly rate (`$27.00`), hours worked,
     and calculated pay (`hours × 27.00`), plus a total calculated pay for the whole timesheet
     (FR-016, FR-016a).
2. As the administrator, edit that route's rate to `$35.00` (via **Routes**), then return to the
   same timesheet detail.
   - **Expect**: the entry's displayed rate and calculated pay now reflect `$35.00`, immediately —
     no separate "recalculate" step (FR-017, FR-018, SC-005).
3. As the administrator, add or edit a timesheet entry for that driver and try selecting a route
   **not** assigned to that driver.
   - **Expect**: not offered in the Route select / rejected server-side if forced (FR-019).
4. Sign back in as the driver from Scenario 2, reopen **Timesheets**.
   - **Expect**: they can see the route, hourly rate, and calculated pay on their own entries
     (FR-020).
5. Find (or create, via seed data) a timesheet entry that predates this feature (no `routeId`).
   - **Expect**: it still shows its hours worked; rate/pay show as "—" (not available), not an
     error or a fabricated `$0.00` (FR-021).

## Automated checks

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Particularly relevant existing/new test locations (constitution §14 — risk-based, not
exhaustive): `tests/features/routes/validation.test.ts` (rate validation),
`tests/features/timesheets/` (new — route-assignment authorization for
`saveDailyEntryAction`, calculated-pay derivation), `tests/unit/timesheet-calculations.test.ts`
(pay math).
