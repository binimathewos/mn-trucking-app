# Contract: Role-Filtered Navigation

## `getNavItemsForRole(role: SessionRole | undefined): NavItem[]`

Filters the application's static `navItems` list (`src/components/app-shell/nav-items.ts`) down
to the items the caller's role is permitted to see.

- MUST be a pure function of its input — no network/database calls, no dependency on the
  current route.
- MUST treat any `role` other than exactly `"administrator"` (including `undefined` or an
  unrecognized string) as `"driver"` — fail closed, consistent with `resolveAdminOnlyAccess`
  (`contracts/route-access.md`).
- MUST always include the Dashboard item for both roles (FR-005: Drivers must never see an empty
  navigation).
- MUST NOT include Timesheets, Containers, Drivers, or Reports, or Settings for the `"driver"`
  effective role (FR-005).
- MUST return the full, unmodified item set for `"administrator"` (FR-004) — this feature MUST
  NOT change the Administrator's navigation in any way.

## Consumer

`Sidebar` (`src/components/app-shell/sidebar.tsx`, a Client Component) calls
`getNavItemsForRole(user.role)` itself, given only the plain `role` string it already receives
from `src/app/(admin)/layout.tsx`. The filtered array is not computed in the Server Component
layout and passed down as a prop, because `NavItem.icon` is a Lucide icon component (a function),
and React Server Components cannot serialize functions across the server → client boundary —
doing so throws `Error: Functions cannot be passed directly to Client Components`. Passing only
the serializable `role` string and letting the already-client-side `Sidebar` call the (pure,
synchronous) filtering function itself avoids that boundary entirely, while still keeping the
role → item-list decision out of the component's JSX per the constitution's Feature-Oriented
Architecture principle — the decision lives in `getNavItemsForRole`, not inlined in `Sidebar`'s
render logic.

## Non-goals

This contract governs only which items *appear in the sidebar*. It grants no access by itself —
a Driver whose browser somehow still requests `/timesheets` directly is blocked by
`resolveAdminOnlyAccess` (see `contracts/route-access.md`), not by this function. Navigation
filtering and route access are deliberately two independent checks (FR-006 depends on this
separation).
