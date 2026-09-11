# Contracts: Route-Based Driver Pay

Like the existing Routes and Timesheets features, this feature exposes no public HTTP API — its
interface surface is Next.js Server Actions (`"use server"`) plus read-only repository functions
called directly from Server Components. This document covers only what's **new or changed**;
unlisted existing behavior (e.g. `assignDriverAction`, `cancelRouteAction`,
`deleteDailyEntryAction`) is unaffected.

## Routes feature (`src/features/routes/`)

### `createRouteAction(input): Promise<{ routeId: string }>` — changed

Re-checks administrator role first (unchanged, `assertAdminAccess`), same as today.

**Input** (`CreateRouteInput`, adds `hourlyRate`):
```ts
{
  clientId: string;
  pickupAddress: string;
  deliveryAddress: string;
  pickupAt: string;          // ISO date
  deliveryAt?: string;       // ISO date
  driverId?: string;
  referenceNumber?: string;
  notes?: string;
  hourlyRate: string;        // NEW — required, e.g. "22.00", validated /^\d+(\.\d{1,2})?$/
}
```

**Behavior change**: `hourlyRate` is validated (present, non-negative, ≤2 decimals — FR-015),
converted to `Prisma.Decimal`, and stored on the created `Route`. The page that renders
`CreateRouteDialog` fetches the current `DriverPaySettings.defaultHourlyRate` server-side and
passes it as the dialog's initial value (FR-007/FR-014) — the server action itself does not
re-apply the default; it persists whatever value the (administrator-editable, FR-008) form
submitted.

### `updateRouteAction(input): Promise<void>` — changed

**Input** (`UpdateRouteInput`, adds `hourlyRate`): same shape as today plus
`hourlyRate: string` (same validation as above). Subject to the existing `loadMutableRoute` guard
— rejected if the route is already `COMPLETED`/`CANCELLED` (unchanged behavior, now also covers
rate edits, FR-009).

### `getRouteDirectory` / `getMyRoutes` / `getRouteById` — changed (output only)

`RouteRow` gains `hourlyRate: string` (formatted, e.g. `"22.00"`). No input or authorization
change; driver-scoped filtering in `getMyRoutes` is unchanged.

### `isRouteAssignedToDriver(routeId, driverProfileId): Promise<boolean>` — new

Not a Server Action — an internal data-access helper (`route-repository.ts`), imported by the
Timesheets feature. `prisma.route.findFirst({ where: { id: routeId, driverId: driverProfileId } })`
— returns `true` iff a match exists. `driverProfileId` is the actual `Driver.id` — distinct from
the Timesheets feature's own `driverId`, which is really a `User.id` (see tasks.md's naming-quirk
note). No authorization check of its own (the caller — `saveDailyEntryAction` — has already
established who is allowed to ask, per FR-004/FR-019).

## Settings feature (`src/features/settings/`) — new

### `getDriverPaySettings(): Promise<{ defaultHourlyRate: string }>` — new

Not a Server Action — a Server Component data-access function. Get-or-create semantics (upsert to
the fixed `id: "default"` row); never returns `null` (data-model.md `DriverPaySettings`).

### `updateDefaultHourlyRateAction(input): Promise<void>` — new

Re-checks administrator role first (`assertAdminAccess`, same pattern as every other mutation in
the app) — a DRIVER caller, including a direct request bypassing the UI, is rejected before any
write (FR-011, FR-012, SC-006).

**Input**:
```ts
{ defaultHourlyRate: string } // required, /^\d+(\.\d{1,2})?$/, e.g. "22.00"
```

**Behavior**: Upserts `DriverPaySettings.defaultHourlyRate`. Does **not** touch any existing
`Route.hourlyRate` (FR-010) — only routes created after this call use the new value as their
prepopulated starting point.

## Timesheets feature (`src/features/timesheets/`)

### `saveDailyEntryAction(input): Promise<void>` — changed (authorization + input)

**Old authorization**: administrator-only (`assertAdminAccess`).

**New authorization**: administrator **or** driver.
- If the caller's session role is `administrator`: unchanged — `input.driverId` may be any
  driver's id.
- If the caller's session role is `driver`: `input.driverId` MUST equal the caller's own
  `Driver.id`, resolved server-side from the session (`prisma.user.findUnique({ where: {
  clerkUserId: <session user id> }, include: { driver: true } })`, same lookup
  `(admin)/routes/page.tsx` already performs for the driver-facing "My routes" view) — never
  trusted from client input. A mismatch (or no `Driver` record at all) throws before any write.

In both cases, after authorization, `isRouteAssignedToDriver(input.routeId, input.driverId)` MUST
be `true` or the action throws `RouteActionError`-style ("This route isn't assigned to this
driver.") without writing anything (FR-004, FR-019, SC-001, SC-006).

**Input** (`DailyEntryInput`, adds `routeId`):
```ts
{
  driverId: string;
  weekStart: string;  // ISO date (Monday)
  date: string;        // ISO date, within the target week
  startTime: string;   // HH:mm 24h
  endTime: string;     // HH:mm 24h, strictly after startTime
  routeId: string;     // NEW — required, must be currently assigned to driverId
}
```

**Behavior change**: `upsertDailyEntry` now also writes `routeId` on both create and update
(update-by-date already existing semantics — re-adding an entry for a date that has one edits it
in place, including changing its route).

`deleteDailyEntryAction` and `deleteTimesheetAction` are **unchanged** — still
administrator-only (research.md #1).

### `getDriverSubmissions(weekStart, driverId?): Promise<DriverSubmissionRow[]>` — changed (output only)

No input or authorization change. Each `DailyEntry` in the result gains `routeId`, `routeLabel`,
`hourlyRate`, and `calculatedPay` (all `null` when the entry has no route, FR-021). Each
`DriverSubmissionRow` gains `totalCalculatedPay` — the sum of its entries' non-null
`calculatedPay` values, formatted (FR-016a).

`routeLabel` is derived, not stored: `"${pickupAddress} → ${deliveryAddress}"` (matches the
`drive-add-timesheet.png` reference's "Rochester → Minneapolis" style).

## Page-level authorization changes

`src/app/(admin)/timesheets/page.tsx` (moved from `(admin)/(restricted)/timesheets/`, research.md
#1): branches on session role like `(admin)/routes/page.tsx` does.

- **administrator**: existing admin view (unchanged data-fetch shape: `getTeamDirectory`,
  `getDriverSubmissions`, `getWeekOptions`), now rendering the added route/rate/pay columns and
  the timesheet-level total pay (FR-016, FR-016a).
- **driver**: new view. Resolves the caller's own `Driver.id` server-side (same lookup as
  `saveDailyEntryAction`'s driver path), then calls `getDriverSubmissions(weekStart, ownDriverId)`
  (single-row result) for their own week's entries/summary, and `getMyRoutes(ownDriverId)`
  (existing function, `route-repository.ts`) to populate the "Add timesheet" dialog's Route
  `Select` (FR-002). A driver with zero currently-assigned routes sees an empty Route select and
  cannot submit (spec US1 Acceptance Scenario 2) — the dialog's existing "disable Save until
  required fields are set" pattern (`!driverId` today) is extended to also require `routeId`.

`nav-items.ts`: the `Timesheets` entry's `roles` becomes `["administrator", "driver"]`.
