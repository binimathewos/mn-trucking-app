# Phase 0 Research: Routes & Client Management

All items below resolve unknowns raised in the spec's Technical Context; none remain marked
NEEDS CLARIFICATION.

## 1. Where `/routes` lives in the route-group structure (admin-only nav vs. driver read access)

**Decision**: `src/app/(admin)/routes/page.tsx` — a sibling of `(admin)/dashboard/`, **not** inside
the admin-only `(admin)/(restricted)/` group. The page itself branches on role at the top, exactly
like `(admin)/dashboard/page.tsx` already does (`if (role !== "administrator") { ...driver
view... }`). `/clients`, which has no driver-facing requirement at all, lives inside
`(admin)/(restricted)/clients/page.tsx` alongside `drivers`, `containers`, `timesheets`.

**Rationale**: `(restricted)/layout.tsx` unconditionally redirects any non-administrator to
`/dashboard` (`resolveAdminOnlyAccess`). The spec requires a driver-role user to be able to view
routes assigned to them (US3, FR-003) — so `/routes` cannot sit behind that layout, or drivers
would never reach it. `/dashboard` already establishes the precedent for a single route that
renders different content per role while still being reachable by both, so `/routes` follows the
same pattern rather than inventing a second mechanism. `FR-004` ("Routes" nav item visible only to
administrators) is satisfied independently at the nav-item level (`nav-items.ts` `roles:
["administrator"]`) — a driver simply has no sidebar link to `/routes`, the same way there is
currently no sidebar link to a driver-specific page, but the route itself still authorizes and
serves them correctly if they land on it directly.

**Alternatives considered**:
- *Put `/routes` under `(restricted)` and give drivers a separate `/my-routes` page* — rejected:
  invents a second URL/nav concept the spec never asks for and duplicates the list-rendering and
  filtering logic across two routes for no benefit; the dashboard precedent already solves
  same-URL/role-branching cleanly.
- *Make `(restricted)` layout aware of per-route exceptions* — rejected: would complicate a
  layout every other admin-only page depends on, for the sake of one feature; keeping `/routes`
  outside that group is simpler and matches constitution §16 (smallest coherent change, reuse
  existing patterns).

## 2. Route number generation and uniqueness (FR-012)

**Decision**: Add an `Int @unique @default(autoincrement())` column `sequenceNumber` to `Route`.
The human-readable route number (e.g. `RT-000042`) is derived, not stored, by a pure function
`formatRouteNumber(sequenceNumber)` in `src/features/routes/lib/route-number.ts`, applied wherever
a `Route` row is mapped to its display type.

**Rationale**: PostgreSQL sequences (what Prisma's `autoincrement()` compiles to) hand out
strictly increasing, gap-tolerant, collision-free values under concurrent inserts with no
extra query or retry loop needed — the simplest way to satisfy "unique" and "never collides"
(FR-012) without a hand-rolled counter table or a `findMax` + retry race. Deriving the display
string instead of storing it avoids persisting data that can be recomputed from a single integer
(constitution §7), and keeps the format (`RT-` prefix, zero-padding) a one-place, easily-changed
concern instead of baked into every stored row.

**Alternatives considered**:
- *Store the formatted string directly with a unique constraint, computed at insert time* —
  rejected: functionally equivalent but duplicates the sequence number and the format decision
  across every row; a future format change would need a backfill migration instead of a one-line
  function change.
- *cuid-based route "number" (reuse `id`)* — rejected: not the short, sequential, human-scannable
  identifier the spec's table column and search (FR-008) imply; cuids are for internal joins, not
  something an administrator reads over the phone to a client.

## 3. Route status auto-sync vs. manual override (Clarifications session, FR-017a/b/c, FR-020–FR-023)

**Decision**: A single pure helper, `src/features/routes/lib/route-status.ts`:
- `isFinalStatus(status)` — `true` for `COMPLETED`/`CANCELLED`.
- `autoStatusForDriverPresence(hasDriver: boolean)` — returns `"ASSIGNED"` or `"SCHEDULED"`.

`assignDriverAction`/`unassignDriverAction` always call `autoStatusForDriverPresence` and write
the result as the route's new status (guarded by `isFinalStatus` — both actions reject outright if
the route is already final, per FR-023). `setRouteStatusAction` (manual override, FR-021) accepts
any of `SCHEDULED | ASSIGNED | IN_PROGRESS` unconditionally (no forward-only ordering — the
Clarifications session explicitly rejected that), plus `COMPLETED`, and is likewise blocked when
the route is already final. Because both paths write the same `status` column with no separate
"desired" vs. "effective" state, the next assign/unassign after a manual override still
overwrites it with the auto-synced value — exactly the behavior the clarification specified.

**Rationale**: Directly implements the clarified answer with the smallest possible state model —
one enum column, two small pure functions, no separate transition-table/state-machine abstraction
(constitution §16 — avoid speculative infrastructure for a 3-state non-final range that has no
enforced ordering).

**Alternatives considered**:
- *Forward-only transition table* — rejected by the clarification answer itself (administrator
  can freely move between non-final statuses).
- *Track "auto" vs. "manual" status provenance so a manual override "sticks" until explicitly
  cleared* — rejected: the clarification is explicit that the next assign/unassign re-syncs
  regardless of any manual change in between; adding provenance tracking would contradict the
  chosen answer and add a field nothing else needs.

## 4. Driver conflict detection with an optional delivery time (Clarifications session, FR-019)

**Decision**: `src/features/routes/lib/driver-conflict.ts` exports
`findConflictingRoute(driverId, candidate, excludeRouteId?)`. It queries the driver's other
non-final (`status NOT IN (COMPLETED, CANCELLED)`) routes that have `deliveryAt IS NOT NULL`, and,
**only if the candidate route also has `deliveryAt` set**, tests standard interval overlap
(`existing.pickupAt < candidate.deliveryAt AND candidate.pickupAt < existing.deliveryAt`). If
either the candidate or a given existing route lacks `deliveryAt`, that pair is skipped
entirely — per the clarification's chosen "skip the check" answer, not flagged as a conflict by
any fallback heuristic.

**Rationale**: Implements the clarified answer literally and keeps the rule a single readable
comparison instead of a heuristic (e.g., "treat as a whole day") that the clarification explicitly
did not choose. Filtering `deliveryAt IS NOT NULL` in the query itself (rather than in
application code) keeps the candidate set small before running the overlap comparison.

**Alternatives considered**:
- *Whole-pickup-day fallback when delivery time is missing* — this was the recommended option
  but was not the one chosen; not implemented.
- *Exact-instant fallback* — same reasoning; not chosen.

## 5. Client quick-add without losing in-progress route form state (FR-035)

**Decision**: `AddClientDialog` (from `src/features/clients/components/`) is rendered *nested
inside* `CreateRouteDialog`'s own JSX tree (a second `<Dialog>` opened from a "+ New client"
button next to the client `<Select>`), not via navigation to `/clients`. `CreateRouteDialog` holds
all route-form field state in its own component state (the same `useState` pattern as
`AddDriverDialog`); opening the nested dialog does not unmount or reset that state. On the nested
dialog's successful submit, it calls an `onCreated(client)` callback that (a) appends the new
client to the in-memory `activeClients` list already held by the page/dialog and (b) sets the
route form's selected client to the new one — all without a page navigation or `router.refresh()`
in between.

**Rationale**: This is the only approach that trivially guarantees zero form-state loss (FR-035,
SC-005) — state that is never unmounted cannot be lost. It also reuses the exact same
`AddClientDialog` component the standalone `/clients` page uses (constitution §10 — no
duplicate "add client" form), just instantiated with a different trigger and an extra
`onCreated` callback prop.

**Alternatives considered**:
- *Navigate to `/clients`, create the client, navigate back* — rejected: round-tripping route form
  data through `sessionStorage`/query params to survive a real navigation is significantly more
  code and more failure modes (serialization, back-button edge cases) than simply not unmounting
  the parent dialog.
- *A single combined form for client + route on one screen* — rejected: conflates two distinct
  entities/validation boundaries and would need its own bespoke UI instead of reusing the
  existing add-client form.

## 6. Truck information derivation for a route (FR-024, FR-025, FR-040)

**Decision**: Wherever a route (or route row) is read for display, `include: { driver: true }` on
the Prisma query (already needed for the driver's name) and read `route.driver?.truckNumber ??
null` at the point of rendering. No new field, join table, or cached copy is introduced on
`Route`.

**Rationale**: `Driver.truckNumber` already exists (`prisma/schema.prisma`, added by
005-driver-management) as the single source of truth for a driver's truck; reading it through the
existing relation at render time is the literal implementation of "derive from the assigned
driver's truck assignment" (spec Truck Assignment section, FR-025, FR-040) and cannot drift out of
sync the way a copied value could.

**Alternatives considered**: None seriously considered — the spec explicitly forbids storing or
duplicating truck data on `Route` (FR-013, FR-040), which rules out any copy-on-write approach.

## 7. Cross-feature reuse boundary between `routes` and `clients`/`drivers`

**Decision**: `src/features/routes/data/route-repository.ts` reads `Client` and `Driver` rows
directly via Prisma (`include`/`select` on the existing relations) for route-scoped needs (e.g.,
the list embedded in a route row). For the two standalone "pick one" lists needed by route forms
— active clients and active drivers — `routes` imports two small, already-reusable functions:
`getActiveClients()` (new, added to `src/features/clients/data/client-repository.ts`) and
`getActiveDriversForSelect()` (new, added to the existing
`src/features/drivers/data/driver-repository.ts`). Both return a minimal `{ id, label }`-shaped
list, not the full directory row type.

**Rationale**: Constitution §3 allows shared code "when genuinely reused across multiple
domains" — an active-clients/active-drivers picker list is exactly that: two features need the
same query. Adding one small exported function to each existing feature's repository is smaller
and clearer than introducing a new shared `src/lib/` data-access layer for two one-line queries.

**Alternatives considered**:
- *Routes feature queries `prisma.driver`/`prisma.client` inline wherever it needs a picker
  list* — rejected: duplicates the "active" filter definition (`status: "ACTIVE"`) in two places;
  a future change to what "active" means would need updating in more than one file.
- *New `src/lib/directory/` shared module* — rejected as premature abstraction for two functions
  that already have an obvious home in their own feature's existing repository file.
