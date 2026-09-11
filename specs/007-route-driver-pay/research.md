# Phase 0 Research: Route-Based Driver Pay

All items below resolve unknowns raised by the spec and by inspecting the existing Timesheets
and Routes features; none remain marked NEEDS CLARIFICATION.

## 1. Driver self-service timesheet entry does not exist yet — `/timesheets` must move out of `(restricted)`

**Discovery**: The 004 Timesheet Management spec explicitly scoped out "driver self-service
timesheet entry." Concretely today: `src/app/(admin)/(restricted)/timesheets/page.tsx` sits behind
`RestrictedLayout`, which unconditionally redirects any non-administrator to `/dashboard`
(`resolveAdminOnlyAccess`). All three Server Actions in `timesheet-actions.ts`
(`saveDailyEntryAction`, `deleteDailyEntryAction`, `deleteTimesheetAction`) call
`assertAdminAccess()` unconditionally. The `Timesheets` nav item (`nav-items.ts`) has `roles:
["administrator"]` only. A DRIVER user hitting `/dashboard` today sees a static "Driver area —
coming soon" placeholder. This feature's User Story 1 (a driver creates their own timesheet
entry) is therefore not an extension of an existing driver flow — it requires building the driver
entry point from scratch.

**Decision**: Move the page from `src/app/(admin)/(restricted)/timesheets/page.tsx` to
`src/app/(admin)/timesheets/page.tsx` (a sibling of `(admin)/dashboard/` and `(admin)/routes/`,
outside the admin-only `(restricted)` group), and branch on role at the top of the page exactly
like `(admin)/routes/page.tsx` and `(admin)/dashboard/page.tsx` already do: administrators get the
existing (now pay-augmented) admin view; drivers get a new "My timesheets" view. Add `"driver"` to
the `Timesheets` nav item's `roles` in `nav-items.ts` so drivers get a sidebar link.
`saveDailyEntryAction` is opened up to allow a DRIVER caller, but only ever writing their own
`driverId` (resolved server-side from the session, never trusted from client input) — the same
defense-in-depth pattern `route-actions.ts` and `driver-actions.ts` already use.
`deleteDailyEntryAction`/`deleteTimesheetAction` stay administrator-only: the spec's User Story 1
only requires drivers to *create* entries, and re-submitting the same date already edits it in
place (`upsertDailyEntry` upserts by `[timesheetId, date]`), so no separate driver-facing edit/
delete UI is needed to satisfy the spec.

**Rationale**: `/routes` and `/dashboard` already establish the precedent for one URL that renders
different content per role while staying reachable by both — reusing it avoids inventing a second
routing mechanism for the same problem (constitution §16, smallest coherent change). Keeping
delete out of the driver's hands is the minimal change that satisfies every acceptance scenario in
the spec without expanding scope beyond what was asked.

**Alternatives considered**:
- *Keep `/timesheets` under `(restricted)`, add a separate `/my-timesheets` driver route* —
  rejected: duplicates the week/entry-list rendering logic across two URLs for no benefit the spec
  asks for; the dashboard/routes precedent already solves same-URL role branching.
- *Give drivers a stripped-down delete capability too* — rejected: not required by any acceptance
  scenario (US1 covers creation only); adding it would be unrequested scope.

## 2. Reference screenshots (`add-timesheet.png`, `drive-add-timesheet.png`) predate this feature

**Discovery**: `docs/ui/add-timesheet.png` (admin "Add timesheet" dialog) and
`docs/ui/drive-add-timesheet.png` (driver "My timesheets" page + "Add timesheet" dialog) are the
constitution's authoritative visual reference (§4), but neither dialog shows a Route field, and
the driver table shows a "BREAK" column that has no corresponding field anywhere in the current
`TimesheetEntry` model or the 004 spec — these screenshots were evidently drawn for a
later/aspirational iteration of the feature set and were only partially implemented in 004 (no
route concept existed yet; break time was never built).

**Decision**: Reproduce the two screenshots' layout, spacing, and visual language for the pieces
that do exist today (summary cards, submissions table, "Add timesheet" dialog structure), and
extend the "Add timesheet" dialog with a new required **Route** field (styled like the existing
Driver `Select` in the admin dialog) since the spec requires it. Do **not** add a "Break" column
or field — it has no backing data model, isn't mentioned anywhere in the spec, and adding it would
be unrequested scope. The driver table's "ROUTE" column (visible, if truncated, behind the dialog
in the screenshot) is treated as confirmation that a per-entry Route column belongs in both the
driver's own table and the admin drill-down — consistent with FR-016/FR-020.

**Rationale**: Constitution §4 requires reproducing existing reference screenshots faithfully but
does not require building UI for fields the current feature set (and this spec) never asked for.

## 3. Money-safe rate storage: Prisma `Decimal`, not `Float`

**Decision**: `Route.hourlyRate` and the new `DriverPaySettings.defaultHourlyRate` are
`Decimal @db.Decimal(10, 2)` Postgres columns (via Prisma's native `Decimal` type, backed by
`decimal.js` in the generated client). Form inputs collect the rate as plain text validated by
Zod against `/^\d+(\.\d{1,2})?$/` (matching the existing form-input style used throughout the app,
e.g. `pickupAddress`/`referenceNumber`), then converted server-side with
`new Prisma.Decimal(value)` before writing. Calculated pay for display
(`hours worked × route hourly rate`, FR-017) is computed the same way:
`new Prisma.Decimal(hours).mul(route.hourlyRate)`, then formatted with `.toFixed(2)`. Because
`Prisma.Decimal` values are not directly serializable across the Server→Client Component
boundary, every place a `Route` or timesheet entry crosses that boundary sends `hourlyRate`/pay as
a formatted string (`"24.50"`), the same pattern already used for `Date` fields
(`pickupAt.toISOString()`) in `route-repository.ts`.

**Rationale**: `Decimal(10,2)` is the standard Postgres/Prisma representation for currency —
avoids the binary floating-point rounding error `Float` would introduce (FR-005), matches "at most
2 decimal places" for a dollar-and-cents hourly rate, and needs no new dependency (`decimal.js`
already ships transitively with `@prisma/client`).

**Alternatives considered**:
- *Store the rate as an integer number of cents (`Int`)* — rejected: every read site would need to
  divide by 100 and every write site multiply by 100, adding a conversion concern to every touch
  point for no benefit over Prisma's native `Decimal` type, which already exists for exactly this
  case.
- *Store as `Float`* — explicitly rejected by the spec itself (FR-005).

## 4. Calculated pay is always derived, never stored (per Clarifications 2026-09-11)

**Decision**: No rate or pay column is added to `TimesheetEntry`. Calculated pay is computed at
read time in the repository layer (`getDriverSubmissions`), joining each entry's `route.hourlyRate`
(current value) with the entry's stored `hours`. `TimesheetEntry.routeId` is the only new column
on that model.

**Rationale**: Directly implements the resolved clarification that a route's rate always applies
live, including to previously saved entries — storing a rate on the entry would contradict that
and create two sources of truth.

## 5. `TimesheetEntry.routeId` is nullable at the database level, required at the application boundary

**Decision**: `routeId String?` (optional) with `route Route? @relation(...)` on `TimesheetEntry`,
`onDelete: SetNull`. Every *new* write path (driver-initiated via `saveDailyEntryAction`, or
admin-initiated via the same action) requires `routeId` through
`dailyEntryInputSchema` (Zod, `routeId: z.string().min(1, "Select a route.")`) — the database
column itself stays optional only so pre-existing entries recorded before this feature (which have
no route) remain valid rows (FR-021, spec Assumptions).

**Rationale**: A `NOT NULL` column would require a backfill migration inventing a fake route for
every historical entry, which the spec explicitly does not ask for and would fabricate data that
never existed (FR-021 requires showing these as "not available", not backfilled). Enforcing
"required" at the Zod/application boundary (constitution §8) is the correct layer for a business
rule that only applies going forward.

## 6. Route-assignment ownership check is shared between the driver and admin write paths

**Decision**: One function, `isRouteAssignedToDriver(routeId, driverId)` in
`src/features/routes/data/route-repository.ts` (`prisma.route.findFirst({ where: { id: routeId,
driverId } })` — not-null result means assigned), is called from `saveDailyEntryAction`
regardless of whether the caller is a DRIVER (writing their own entry) or an ADMINISTRATOR
(writing on behalf of a driver). The action rejects the save if the check fails, independent of
what the client submitted (FR-004, FR-019).

**Rationale**: The route/driver-assignment relationship is Route-domain logic; keeping the one
check in the Routes feature and calling it from the Timesheets feature avoids duplicating
"what counts as assigned" in two places, and satisfies the clarification that ADMIN and DRIVER
are held to the identical restriction.

## 7. Default Driver Pay Rate: new singleton settings model, surfaced on the existing `/settings` stub

**Decision**: A new `DriverPaySettings` model with a single fixed-id row (`id` hardcoded to
`"default"`), holding `defaultHourlyRate Decimal @db.Decimal(10, 2)`. A small new
`src/features/settings/` feature (repository + Zod-validated Server Action + a form component)
reads/writes it, rendered from `src/app/(admin)/(restricted)/settings/page.tsx`, which today is a
static "Settings are coming soon" stub. `getDriverPaySettings()` does a get-or-create with a
`$0.00` fallback so route creation is never blocked by a missing configuration (spec Edge Cases).

**Rationale**: No existing config/settings table exists in the schema to repurpose. `/settings` is
already an administrator-only nav item and route (`(restricted)`, matching FR-006/FR-012's
"administrator-only" requirement) with no content yet — the natural, lowest-footprint home for a
single admin-configurable value, instead of inventing a new nav item or route.

**Alternatives considered**:
- *Store the default rate on the `Route` model itself (e.g., a flag row)* — rejected: conflates
  a system-wide setting with a business entity; would need a special-cased "template route" that
  isn't a real route.
- *Environment variable* — rejected: the spec requires an ADMINISTRATOR to view and update it at
  runtime (FR-006), which an env var cannot support without a redeploy.
