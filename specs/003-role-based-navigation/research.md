# Phase 0 Research: Role-Based Dashboard Navigation

No open `NEEDS CLARIFICATION` markers remain in the Technical Context — this feature reuses the
existing stack (Next.js App Router, Clerk, Tailwind/shadcn) with no new dependencies. Research
below covers the design decisions the plan makes, and the alternatives rejected.

## Decision 1: How to stop routing Drivers away from `/dashboard`

**Decision**: Split the current single `resolveRouteAccess` function into two narrower pure
functions:
- `resolveDashboardAccess({ isSignedIn })` → `render` or `redirect: sign-in`. Used everywhere the
  only requirement is "must be signed in" — the edge middleware (`proxy.ts`) and the shared
  `(admin)/layout.tsx` shell that now wraps `/dashboard` for every role.
- `resolveAdminOnlyAccess({ isSignedIn, role })` → `render`, `redirect: sign-in`, or
  `redirect: dashboard`. Used only by the new `(restricted)` layout wrapping the five
  Administrator-only pages.

**Rationale**: The spec's core change is that "signed in" and "is an Administrator" become two
independent gates instead of one combined check. Keeping them as two small pure functions (same
shape/testability as the original) maps directly onto the two places in the route tree that need
different gates, and keeps each function's job obvious from its name and return type.

**Alternatives considered**:
- *Keep one function with a `requiredRole?: SessionRole` parameter.* Rejected: the two call
  sites have genuinely different possible outcomes (the shell never redirects to `dashboard`;
  the restricted layout never renders for a Driver), so a shared function would need
  outcome branches that don't apply to one of its two callers, weakening the type-level
  guarantee that a caller can only get outcomes relevant to what it's guarding.
- *Add a role claim check inside `proxy.ts` (edge middleware) for the five admin-only routes,
  keeping the driver-area-style branching at the edge.* Rejected: doing this correctly requires
  configuring Clerk session claims so the role is available at the edge without a database round
  trip; the codebase doesn't do this today (today's middleware only ever checked `isSignedIn`,
  never `role`), and introducing it now would be new infrastructure this feature doesn't need —
  the existing "middleware checks sign-in, layout checks role" defense-in-depth split already
  satisfies FR-006 (content never renders to a Driver) without an edge round trip change.

## Decision 2: Where to enforce the Administrator-only pages

**Decision**: Nest a nested `(restricted)` route group inside `(admin)`, with its own
`layout.tsx` that calls `resolveAdminOnlyAccess` and redirects non-Administrators to
`/dashboard`. The five admin-only pages move into this group; their page files are otherwise
unchanged.

**Rationale**: Next.js route groups don't affect the URL, so `/timesheets` etc. keep their exact
paths — no link, bookmark, or the sidebar's `href`s need to change. Nesting mirrors exactly what
the spec asks for: everyone gets the outer (signed-in) shell, only these five get the additional
inner (Administrator) gate. This is the same "layer a stricter check under a looser one" pattern
already used between `proxy.ts` and `(admin)/layout.tsx` today.

**Alternatives considered**:
- *Per-page guard clauses (repeat the role check at the top of each of the five page
  components).* Rejected: duplicates the same check five times where a single shared layout
  does it once; the constitution's Component and Code Quality principle favors the
  non-duplicated version.
- *A `<AdminOnly>` wrapper component checked at render time.* Rejected: a client- or
  render-time-only check does not satisfy FR-006 ("even via direct URL navigation... content is
  never rendered") as robustly as a layout-level `redirect()`, which stops rendering before any
  child output is produced.

## Decision 3: What Drivers see on `/dashboard`

**Decision**: `dashboard/page.tsx` branches on role: Administrators get the existing operational
summary (unchanged); Drivers get a minimal placeholder body, reusing the copy/style of the
now-removed `/driver` placeholder page ("Driver area" / "The driver experience is coming soon").

**Rationale**: The existing dashboard body (active-driver counts, container inventory) is
Administrator-scoped operational data. Rendering it unchanged for Drivers would both contradict
FR-009 ("minimal/placeholder" for Drivers) and risk exposing operational summary data to a role
that doesn't need it, ahead of least-privilege. Reusing the existing placeholder's copy avoids
inventing new content for something explicitly out of scope (the real driver dashboard experience
mocked in `docs/ui/drive-dashboard.png` is a future feature).

**Alternatives considered**:
- *Show Drivers the same dashboard content as Administrators.* Rejected: contradicts FR-009 and
  the spec's Assumptions section, and works against the constitution's least-privilege guidance
  even though nothing here is a secret per se — it's still Administrator-scoped operational
  reporting a Driver has no stated need to see.

## Decision 4: The Driver navigation set for this feature

**Decision**: `getNavItemsForRole("driver")` returns only the Dashboard item. No Driver-facing
Timesheets (or other) nav entry is added in this feature.

**Rationale**: Already established in the spec's Assumptions section — a Driver-facing
Timesheets nav item would have nowhere safe to point today (the only existing `/timesheets` page
is the Administrator, all-drivers view), and building a driver-scoped Timesheets view is
explicitly out of scope for this feature.

**Alternatives considered**:
- *Point a Driver "Timesheets" nav item at the existing `/timesheets` admin page.* Rejected: that
  page is now behind the `(restricted)` Administrator-only guard by design (Decision 2); pointing
  a Driver-visible link at a route that immediately redirects them away would be a confusing,
  broken-feeling UX, not a real navigation option.

## Decision 5: Fail-closed behavior for missing/unrecognized roles

**Decision**: Both `getNavItemsForRole` and `resolveAdminOnlyAccess` treat any role other than
exactly `"administrator"` (including `undefined` or an unrecognized string) as `"driver"` for the
purposes of navigation and page access.

**Rationale**: Directly carries forward the fail-closed behavior already established in the
001-admin-dashboard contract (`resolveRouteAccess` never defaulted an unrecognized role to
Administrator) into both new functions, consistent with the constitution's least-privilege
principle and this feature's FR-010.

**Alternatives considered**: None seriously considered — reversing this would be a regression
against an existing, already-tested security property.
