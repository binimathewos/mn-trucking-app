# Phase 1 Data Model: Role-Based Dashboard Navigation

No persisted entities are introduced or changed by this feature. The two conceptual entities
below already exist in some form (`SessionRole` is unchanged; `NavItem` is extended) and are
documented here because this feature changes how they're used for access decisions.

## SessionRole (existing, unchanged)

| Field | Type | Notes |
|---|---|---|
| value | `"administrator" \| "driver"` | Sourced from Clerk's `publicMetadata.role` via `normalizeRole()` in `get-session-access.ts` (unchanged by this feature) |

No new values, no schema change. Documented here only because both access-resolution functions
in this feature key off it.

## NavItem (extended)

| Field | Type | Notes |
|---|---|---|
| label | `string` | Unchanged |
| href | `string` | Unchanged |
| icon | `LucideIcon` | Unchanged |
| roles | `SessionRole[]` | **New.** The set of roles permitted to see this item in the sidebar. |

**Current values** (per FR-004/FR-005 and Research Decision 4):

| label | href | roles |
|---|---|---|
| Dashboard | `/dashboard` | `["administrator", "driver"]` |
| Timesheets | `/timesheets` | `["administrator"]` |
| Containers | `/containers` | `["administrator"]` |
| Drivers | `/drivers` | `["administrator"]` |
| Reports | `/reports` | `["administrator"]` |
| Settings | `/settings` | `["administrator"]` |

**Derived function**: `getNavItemsForRole(role: SessionRole | undefined): NavItem[]` — filters
the list above to items whose `roles` includes the caller's effective role, treating any role
other than exactly `"administrator"` as `"driver"` (fail-closed, Research Decision 5). Pure,
synchronous, no I/O — unit-testable without mocking Clerk. Because `NavItem.icon` is a component
(a function) and React Server Components cannot pass functions as props to Client Components,
this function is called inside the Client Component (`Sidebar`) itself, from the plain `role`
string it receives — never called server-side with the resolved array then passed down as a
prop (see `contracts/navigation.md`).

## Route Access Outcomes (revises `specs/001-admin-dashboard/contracts/route-access.md`)

This feature replaces the single `RouteAccessResult` (with its `"driver-area"` destination) with
two narrower, purpose-specific result types. See
[`contracts/route-access.md`](./contracts/route-access.md) for the full contract.

| Type | Possible outcomes |
|---|---|
| `DashboardAccessResult` | `{ outcome: "render" }` \| `{ outcome: "redirect", destination: "sign-in" }` |
| `AdminOnlyAccessResult` | `{ outcome: "render" }` \| `{ outcome: "redirect", destination: "sign-in" }` \| `{ outcome: "redirect", destination: "dashboard" }` |

No state transitions apply — both remain pure functions of a single request's session snapshot,
recomputed on every request (no caching/persistence of the decision itself).
