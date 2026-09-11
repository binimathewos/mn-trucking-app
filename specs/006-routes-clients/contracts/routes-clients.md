# Contracts: Routes & Client Management

This feature exposes no public HTTP API — like `src/features/timesheets/actions/` and
`src/features/drivers/actions/`, its interface surface is a set of Next.js Server Actions (`"use
server"`) plus read-only repository functions called directly from Server Components. All route
actions live in `src/features/routes/actions/route-actions.ts`; all client actions live in
`src/features/clients/actions/client-actions.ts`.

Every **client-management** action, and every **route-mutation** action except the driver-scoped
read below, performs, first and unconditionally: re-check administrator role
(`resolveAdminOnlyAccess`) → throw if not administrator (FR-001, FR-002, SC-006). This is the same
`assertAdminAccess()` pattern already used by `driver-actions.ts` and `timesheet-actions.ts`.

## Routes: read access

### `getRouteDirectory(filters?): Promise<RouteRow[]>`

Not a Server Action — a data-access function (`src/features/routes/data/route-repository.ts`)
called from `src/app/(admin)/routes/page.tsx` **only when the caller is an administrator**
(enforced by the page itself checking role before calling this function; the function has no
independent authorization check because a Server Component's own page-level role branch is the
enforcement point here, same as `getOperationalSummary` on the dashboard).

**Input**:
```ts
interface RouteDirectoryFilters {
  status?: "SCHEDULED" | "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  driverId?: string | "UNASSIGNED";
  clientId?: string;
  pickupDateFrom?: string; // ISO date
  pickupDateTo?: string;   // ISO date
  search?: string;         // matched against route number, client company name, referenceNumber
}
```

**Output**:
```ts
interface RouteRow {
  id: string;
  routeNumber: string;          // formatted from sequenceNumber, e.g. "RT-000042"
  clientName: string;
  pickupAddress: string;
  deliveryAddress: string;
  pickupAt: string;              // ISO datetime
  deliveryAt: string | null;
  driverName: string | null;      // null = unassigned
  truckNumber: string | null;      // derived from driver.truckNumber; null if unassigned or driver has none
  referenceNumber: string | null;
  status: "SCHEDULED" | "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
}
```

**Behavior**: Reads all `Route` rows with `client` and `driver` included, applies `filters`,
orders by `pickupAt desc`. Throws on database failure (surfaced by `error.tsx`, FR-010).

### `getMyRoutes(driverUserId): Promise<RouteRow[]>`

Not a Server Action — called from `src/app/(admin)/routes/page.tsx` when the caller's role is
`driver`, scoped to the signed-in driver's own `Driver.id` derived server-side from their session
(never accepted as caller-supplied input — FR-003, US3 Acceptance Scenario 1).

**Behavior**: Same `RouteRow` shape as above, `where: { driverId: <the caller's own driver id> }`,
no filters/search (US6 is P3/admin-only; the driver-facing view is a simple read-only list per
spec scope).

### `getRouteById(routeId, requester): Promise<RouteRow | null>`

Not a Server Action — used by the route details view. `requester` carries `{ role,
driverId? }`; if `role !== "administrator"`, the function returns `null` (treated as "not found",
not a distinguishable "forbidden," per FR-003's "denied" wording and the edge case for
driver-role direct access to a route not theirs) unless `route.driverId === requester.driverId`
(FR-003, US3 Acceptance Scenario 4).

## Routes: mutations

All route-mutation actions below re-check administrator authorization first (see intro), then
validate input with the relevant Zod schema from `src/features/routes/lib/validation.ts`, then
re-check the target route's current status is not final (`isFinalStatus`, research.md #3) before
touching anything else, unless noted otherwise.

### `createRouteAction(input: unknown): Promise<{ routeId: string }>`

**Input**:
```ts
{
  clientId: string;          // required
  pickupAddress: string;      // required
  deliveryAddress: string;     // required
  pickupAt: string;             // required, ISO datetime
  deliveryAt?: string;           // optional, ISO datetime
  driverId?: string;               // optional
  referenceNumber?: string;         // optional
  notes?: string;                    // optional
}
```

**Behavior** (FR-011–FR-015, FR-017a):
1. Validate input; throw a field-error map on failure.
2. Re-check `Client` exists and is `ACTIVE` (FR-014); throw if not.
3. If `driverId` present: re-check `Driver` exists and is `ACTIVE` (FR-014, FR-018); run
   `findConflictingRoute` (research.md #4) and throw a clear, conflict-identifying error if it
   returns a match.
4. Create the `Route` with `status = autoStatusForDriverPresence(Boolean(driverId))` (`SCHEDULED`
   or `ASSIGNED`).
5. `revalidatePath("/routes")`; return `{ routeId }`.

### `updateRouteAction(input: unknown): Promise<void>`

Edits core fields only — **not** `driverId` or `status`, which are separate actions below
(FR-016).

**Input**:
```ts
{
  routeId: string;
  clientId: string;
  pickupAddress: string;
  deliveryAddress: string;
  pickupAt: string;
  deliveryAt?: string;
  referenceNumber?: string;
  notes?: string;
}
```

**Behavior**:
1. Load the route; throw if missing or `isFinalStatus` (FR-023).
2. Validate input; re-check the (possibly changed) `Client` is `ACTIVE` (FR-014).
3. Update the row; `revalidatePath("/routes")`.

### `assignDriverAction(input: { routeId: string; driverId: string }): Promise<void>`

**Behavior** (FR-017, FR-017a, FR-018, FR-019):
1. Load the route; throw if missing or `isFinalStatus`.
2. Re-check `Driver` exists and is `ACTIVE`; throw a clear message if not (FR-018).
3. Run `findConflictingRoute(driverId, route, excludeRouteId: routeId)`; throw a clear,
   conflict-identifying error if it returns a match (FR-019).
4. Set `driverId` and `status = "ASSIGNED"` (FR-017a) in one update.
5. `revalidatePath("/routes")`.

### `unassignDriverAction(input: { routeId: string }): Promise<void>`

**Behavior** (FR-017c, FR-017a):
1. Load the route; throw if missing or `isFinalStatus`.
2. Set `driverId = null` and `status = "SCHEDULED"` (FR-017a) in one update.
3. `revalidatePath("/routes")`.

### `setRouteStatusAction(input: { routeId: string; status: "SCHEDULED" | "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" }): Promise<void>`

**Behavior** (FR-020, FR-021, FR-023):
1. Load the route; throw if missing or already `isFinalStatus`.
2. Set `status` to the requested value — no ordering/adjacency check (Clarifications session:
   free manual override among non-final statuses; `COMPLETED` is also reachable here since it is
   a manual admin action, not an auto-synced one).
3. `revalidatePath("/routes")`.

### `cancelRouteAction(input: { routeId: string }): Promise<void>`

**Behavior** (FR-022, FR-023, SC-004):
1. Load the route; throw if missing or already `isFinalStatus` (cancelling an already-final route
   is rejected, not a no-op — FR-023, edge case row).
2. Set `status = "CANCELLED"`. Row and all its fields remain in the database, unchanged otherwise.
3. `revalidatePath("/routes")`.

## Clients: read access

### `getClientDirectory(filters?: { search?: string }): Promise<ClientRow[]>`

Not a Server Action — called from `src/app/(admin)/(restricted)/clients/page.tsx`, which already
sits behind the admin-only `(restricted)` layout (no independent role check needed here, same
reasoning as `getDriverDirectory`).

**Output**:
```ts
interface ClientRow {
  id: string;
  companyName: string;
  contactName: string;
  phone: string;
  email: string;
  address: string;
  status: "ACTIVE" | "INACTIVE";
}
```

### `getActiveClients(): Promise<{ id: string; companyName: string }[]>`

Not a Server Action — the picker-list function consumed by `src/features/routes/*` (research.md
#7). `where: { status: "ACTIVE" }`, ordered by `companyName asc`.

## Clients: mutations

All client-mutation actions re-check administrator authorization first (see intro), then validate
with `src/features/clients/lib/validation.ts` schemas.

### `addClientAction(input: unknown): Promise<{ clientId: string; client: { id: string; companyName: string } }>`

**Input**:
```ts
{ companyName: string; contactName: string; phone: string; email: string; address: string }
```

**Behavior** (FR-029, FR-030): validate (all fields required, phone/email format-checked) → create
with `status: "ACTIVE"` → `revalidatePath("/clients")` and, since this action is also called from
the routes feature's quick-add flow (research.md #5), `revalidatePath("/routes")` → return the new
client's `id`/`companyName` so the calling dialog can select it immediately without a re-fetch.

### `updateClientAction(input: unknown): Promise<void>`

**Input**: `{ clientId: string; companyName: string; contactName: string; phone: string; email:
string; address: string }` (status excluded — same split as `updateDriverAction` vs.
`setDriverStatusAction`).

**Behavior** (FR-031): validate → update → `revalidatePath("/clients")`.

### `setClientStatusAction(input: { clientId: string; status: "ACTIVE" | "INACTIVE" }): Promise<void>`

**Behavior** (FR-032, FR-033): update `status` only (no hard delete exists anywhere in this
feature) → `revalidatePath("/clients")` and `revalidatePath("/routes")` (an admin currently
viewing the route-creation client picker should see the change reflected).

## Error shape (all actions)

Thrown errors carry a `message` safe to show directly to the administrator and, for validation or
business-rule failures (duplicate/conflict/inactive-reference), a field-keyed map so the relevant
dialog can highlight the offending input — the same `{Route,Client}ActionError` +
`parse{Route,Client}ActionError` pair already established by `DriverActionError` /
`parseDriverActionError` in `src/features/drivers/types.ts`.
