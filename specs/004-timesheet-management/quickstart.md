# Quickstart: Validate Timesheet Management (Database-Backed)

Manual end-to-end validation for the acceptance scenarios in `spec.md`, now against a real
PostgreSQL database.

## Prerequisites

- Dependencies installed: `pnpm install`
- A running PostgreSQL instance (local, e.g. via `postgres.app`/Homebrew/Docker, or a hosted dev
  database) — this feature does not prescribe how you run Postgres, only that `DATABASE_URL`
  points at one
- A Clerk administrator test account (same sign-in flow used by other admin pages)

## Setup

```bash
# 1. Add the database connection string (not already present in .env)
echo 'DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/mn_trucking_dev"' >> .env

# 2. Generate the Prisma client and apply the initial migration
pnpm prisma migrate dev --name init_timesheets

# 3. Seed a realistic driver roster and a few weeks of timesheet entries
pnpm prisma db seed

# 4. Start the app
pnpm dev
```

Sign in at `/sign-in` with an administrator account, then navigate to `/timesheets` (or click
"Timesheets" in the sidebar). Signing in also lazily creates your own `User` row
(`getOrCreateCurrentUser` — contracts/user-linking.md), so your own account can log hours too.

## Scenario 1 — View timesheets (spec Acceptance Scenario 1)

1. Load `/timesheets`.
2. **Expect**: three summary cards (team hours, submitted count, average daily hours) and a
   driver submissions table are both populated from the seeded data, matching the layout of
   `docs/ui/timesheets.png`.

## Scenario 2 — Filter timesheets (Acceptance Scenario 2)

1. Select a specific driver in the driver filter, select a week in the week filter, click
   **Filter**. Note the URL now carries `?driverId=...&week=...`.
2. **Expect**: the table shows only that driver's row for that week; the summary cards recompute
   to reflect only that scope.
3. Pick a driver/week combination the seed script didn't populate (e.g. a week before the seeded
   history begins).
4. **Expect**: an empty-state message in the table, and summary cards showing zero values
   (Edge Cases).
5. Reload the page directly at the filtered URL (or share the link).
6. **Expect**: the same filtered view renders — filters are URL-driven, not client-only state
   (research.md #6).

## Scenario 3 — View driver timesheet detail (Acceptance Scenario 3)

1. From the table, open a driver's row detail (via the row action menu's "View details").
2. **Expect**: a detail view listing all 7 days of the selected week, with logged hours for days
   that have entries and an empty/blank state for days that don't.

## Scenario 4 — Manage timesheet (Acceptance Scenario 4)

1. From the driver detail view (or the page-level **Add Timesheet** action), add a daily entry:
   pick a date, start time, and end time.
2. **Expect**: the computed total hours preview updates live in the dialog before saving; after
   saving, the driver's row total hours and status update immediately with no manual page
   reload (Server Action → `revalidatePath`, research.md #7).
3. Edit that same date's entry to a different time range.
4. **Expect**: the entry is replaced, not duplicated (check the detail view still shows one row
   for that date — also enforced by the database's unique constraint, data-model.md), and
   totals/status update again.
5. Delete the entry.
6. **Expect**: totals/status update again (reverting toward Draft/Not Submitted as appropriate).
7. Delete the entire timesheet from the row action menu.
8. **Expect**: the driver's row reverts to 0 hours, Not Submitted, no last-submitted time.
9. **Persistence check** (new: this is now real): restart the dev server (`pnpm dev`) and reload
   `/timesheets`.
10. **Expect**: all of the above changes are still there — data now survives a server restart,
    unlike the original mock-data version of this plan.

## Scenario 5 — Submission status colors (Acceptance Scenario 5)

1. The seed script (research.md #8) already includes at least one driver in each status:
   Submitted (all 7 days logged), Draft (some but not all days logged), Not Submitted (no days
   logged for the current week).
2. **Expect**: each status renders with a visually distinct color (see `research.md` #11 for the
   exact mapping) and the correct text label.

## Authorization check (Constitution Principle 9)

1. While signed in as a Driver-role account, attempt to trigger a Server Action directly (e.g.
   by re-submitting a captured form request, or simply confirming the page itself redirects per
   003-role-based-navigation).
2. **Expect**: the action rejects the request (via `resolveAdminOnlyAccess`) even though the
   `(restricted)` layout would already have redirected a normal page load — the check does not
   rely on the UI alone.

## Responsiveness check (FR-017, SC-006)

Resize the browser (or use device emulation) to common tablet and mobile widths.

**Expect**: summary cards stack, the filter row remains usable (wraps or stacks rather than
overflowing), and the table remains readable (horizontal scroll rather than a broken layout).

## Automated checks

```bash
pnpm prisma generate    # ensure the Prisma client matches schema.prisma before typecheck/build
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

**Expect**: all succeed, including `tests/unit/timesheet-calculations.test.ts` covering status
derivation, total-hours calculation, and the one-entry-per-date rule's pure logic
(`computeHoursFromTimeRange`, `deriveStatus`, `deriveTotalHours`, `deriveLastSubmittedAt`,
`computeAverageDailyHours`) — these tests do not require a database connection.

## Dashboard check (new: cross-feature wiring)

1. Navigate to `/dashboard`.
2. **Expect**: "Active drivers" reflects the real count of seeded team members, and "Hours this
   week" reflects the real sum of this week's logged hours — both matching what `/timesheets`
   shows for the current week with no filter applied. "In inventory" remains the existing mock
   value (Containers is not modeled by this revision).
