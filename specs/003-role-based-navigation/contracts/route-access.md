# Contract: Dashboard and Administrator-Only Route Access

**Supersedes**: `specs/001-admin-dashboard/contracts/route-access.md`. That contract's single
`resolveRouteAccess` function and its `"driver-area"` destination no longer exist; this contract
is the current source of truth for route-access decisions. The original file is left in place
as historical record of the 001 feature's design, not updated in place.

## `resolveDashboardAccess(session: { isSignedIn: boolean }): DashboardAccessResult`

`DashboardAccessResult` is one of:

| Result | When | Effect |
|---|---|---|
| `{ outcome: "render" }` | `isSignedIn` is `true` | The shared authenticated shell (sidebar + top nav) and `/dashboard` render, regardless of role |
| `{ outcome: "redirect", destination: "sign-in" }` | `isSignedIn` is `false` | Visitor is redirected to sign-in; nothing under the shell ever renders |

- MUST be a pure function of its input — no network/database calls inside it.
- Role plays no part in this decision — every signed-in user, Administrator or Driver, renders.
- **Consumers**: `proxy.ts` (edge middleware) calls this for the existing route matcher
  (`/dashboard(.*)`, `/timesheets(.*)`, `/containers(.*)`, `/drivers(.*)`, `/reports(.*)`,
  `/settings(.*)`) to short-circuit unauthenticated requests before any React rendering happens.
  `src/app/(admin)/layout.tsx` calls it again server-side (defense in depth) and performs the
  actual `redirect()` to sign-in if middleware did not already handle it.

## `resolveAdminOnlyAccess(session: { isSignedIn: boolean; role?: "administrator" | "driver" }): AdminOnlyAccessResult`

`AdminOnlyAccessResult` is one of:

| Result | When | Effect |
|---|---|---|
| `{ outcome: "render" }` | `isSignedIn` is `true` and `role` is exactly `"administrator"` | Timesheets, Containers, Drivers, Reports, or Settings renders normally |
| `{ outcome: "redirect", destination: "sign-in" }` | `isSignedIn` is `false` | Visitor is redirected to sign-in; admin-only content never renders |
| `{ outcome: "redirect", destination: "dashboard" }` | `isSignedIn` is `true` and `role` is not exactly `"administrator"` | Signed-in Driver (or any unrecognized/missing role) is redirected to `/dashboard`; admin-only content never renders |

- MUST be a pure function of its input — no network/database calls inside it.
- MUST NOT default an unrecognized/missing `role` to `"administrator"`; anything other than
  exactly `"administrator"` while signed in resolves to the `dashboard` redirect (fail closed,
  per the constitution's least-privilege principle — same rule the superseded contract applied
  to its `"driver-area"` outcome).
- **Consumer**: `src/app/(admin)/(restricted)/layout.tsx` — the nested layout wrapping only the
  five Administrator-only pages — calls this and performs the actual `redirect()` for both the
  `sign-in` and `dashboard` cases. It is the sole enforcement point for "Administrator-only,"
  independent of whatever the sidebar happens to display (FR-006).

## Consumer summary

| Route(s) | Middleware check | Layout check(s) |
|---|---|---|
| `/dashboard` | `resolveDashboardAccess` (sign-in only) | `(admin)/layout.tsx` → `resolveDashboardAccess` |
| `/timesheets`, `/containers`, `/drivers`, `/reports`, `/settings` | `resolveDashboardAccess` (sign-in only) | `(admin)/layout.tsx` → `resolveDashboardAccess`, then `(admin)/(restricted)/layout.tsx` → `resolveAdminOnlyAccess` |
