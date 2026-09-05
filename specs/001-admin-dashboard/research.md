# Phase 0 Research: Administrator Dashboard

All items below were open technical questions raised by the Technical Context, not user-facing
scope questions (those were resolved in `/speckit-clarify`). Each is resolved with a decision,
rationale, and alternatives considered.

## 1. Determining Administrator vs. Driver role without a database

**Decision**: Read the role from the Clerk session (`publicMetadata.role`, set to
`"administrator"` or `"driver"` on each Clerk user), read server-side via Clerk's `auth()`
helper. No local `User`/role table is introduced for this feature.

**Rationale**: The constitution treats Clerk as the identity provider and requires
authorization to be enforced server-side without a database dependency for this feature (no
Driver/Customer persistence exists yet). Clerk's metadata is the simplest source of truth that
still allows a real, server-verified check rather than a client-supplied flag.

**Alternatives considered**:
- *Introduce a minimal `User`/`Role` Prisma table now*: rejected — pulls in persistence work
  the spec explicitly defers, and duplicates data Clerk already owns (constitution: avoid
  duplicating data that can be derived/sourced elsewhere without justification).
  A future feature that needs relational user data can add this without redesigning the
  dashboard, since the dashboard only depends on an abstract "current user + role" shape.
- *Trust a client-side flag or route param for role*: rejected — explicitly forbidden by the
  constitution ("never trust roles supplied by the browser").

## 2. Where to enforce the Administrator-only route guard

**Decision**: Enforce in two layers — Clerk `clerkMiddleware` at the edge (redirects
unauthenticated visitors to sign-in before any route in the `(admin)` group renders), and a
server-side check in `src/app/(admin)/layout.tsx` that reads the session role and redirects
authenticated Drivers away. Both checks resolve the same `role → destination` decision via one
shared pure function (`src/lib/auth/route-access.ts`) so the two layers can't disagree.

**Rationale**: Middleware alone can gate "signed in or not" cheaply, but role-aware redirects
need the full session claims, which are simplest to evaluate in the layout server component.
Sharing one pure function keeps the logic testable (see Testing decision) and satisfies the
constitution's "authorization enforced server-side" requirement at both the network-edge and
render layers (defense in depth) without duplicating the decision logic.

**Alternatives considered**:
- *Middleware-only, encoding role logic there*: rejected — middleware runs in the Edge runtime
  with a smaller API surface, and keeping the actual role-decision in one plain function used by
  both layers is simpler to test and reason about than splitting logic across runtimes.
- *Layout-only (no middleware)*: rejected — leaves an unauthenticated flash-of-protected-content
  window before redirect; middleware is the standard Next.js/Clerk pattern to avoid this.

## 3. Testing framework

**Decision**: Add Vitest as a dev dependency for unit tests of pure functions only:
storage-duration derivation, time-of-day greeting selection, and the role → redirect-target
function. No component-rendering tests and no browser/e2e runner are added for this feature.

**Rationale**: The constitution requires automated tests specifically for business logic,
calculations, and authorization rules — exactly the three pure functions this feature
introduces — while explicitly not requiring coverage of simple presentation components. Vitest
is the lightest-weight option that fits a Next.js/TypeScript/pnpm project and needs no DOM
environment for these particular tests (all three functions take plain values and return plain
values).

**Alternatives considered**:
- *No automated tests, manual QA only*: rejected — the constitution names authorization rules
  and calculations (storage duration is a calculation) as required-test categories.
- *Playwright end-to-end tests for the redirect behavior*: deferred, not rejected outright —
  valuable later once more routes exist, but disproportionate setup cost for verifying a single
  pure function at this stage; the unit test on `route-access.ts` covers the decision logic that
  both middleware and layout consume.
- *Jest*: rejected in favor of Vitest for faster startup and native TypeScript/ESM support
  matching the existing Next.js 16 / ESM-oriented toolchain, avoiding extra transform config.

## 4. Mock data shape and location

**Decision**: Define TypeScript types (`OperationalSummary`, `ContainerInventoryRecord`, etc.)
in `src/features/dashboard/types.ts` and a single mock data module
(`src/features/dashboard/data/mock-dashboard-data.ts`) exporting typed constants matching those
shapes. Components read only through these types, never through ad hoc inline literals.

**Rationale**: Directly satisfies FR-019 ("mock data MUST be structured ... so it can later be
replaced ... without redesigning the dashboard") — a future feature swaps the mock module for a
real data-fetching function with the same return type, and no UI component needs to change.

**Alternatives considered**:
- *Inline mock literals directly in components*: rejected — harder to later swap for real data
  and violates feature-oriented separation between data and presentation.

## 5. shadcn/ui components and icon set needed

**Decision**: Initialize shadcn/ui (New York style, matching the screenshot's tight radii and
neutral palette) and add: `card`, `table`, `input`, `button`, `badge`, `avatar`,
`dropdown-menu`, `separator`, `skeleton`. Icons via `lucide-react`: e.g. `LayoutDashboard`,
`Clock`, `Package`, `Users`, `FileBarChart`, `Settings`, `HelpCircle`, `Search`,
`ArrowDownToLine` (Check In), `MoreHorizontal` (row actions) — exact icon choices finalized
against the screenshot during implementation.

**Rationale**: Constitution requires reusing shadcn/ui primitives before building custom
equivalents and using Lucide as the only icon library; these primitives cover every visual
element in `docs/ui/dashboard.png` (cards, table, search box, buttons, status badges, avatar,
row "..." menu).

**Alternatives considered**:
- *Hand-rolled table/card/badge components*: rejected — duplicates what shadcn/ui already
  provides, against Component and Code Quality and Dependency Discipline principles.

## 6. Storage duration and "current week" calculation

**Decision**: Compute storage duration as whole calendar days between `receivedDate` and
(`checkedOutDate` if present, otherwise "today"), using native `Date` arithmetic — no date
library added. "Hours This Week" mock data uses a Monday–Sunday week definition, consistent with
standard work-week reporting.

**Rationale**: The calculation is simple day-difference arithmetic; adding a date library
(date-fns, dayjs) for this would violate Dependency Discipline (no meaningful value over a
few lines of native `Date` math). Monday-start is a reasonable, unambiguous default for a
trucking operations context and only affects mock-data generation, not user-facing behavior
requiring clarification.

**Alternatives considered**:
- *Add `date-fns` for day-diff and week-boundary helpers*: rejected — unnecessary dependency for
  arithmetic this simple.

## Summary

All Technical Context unknowns are resolved. No `NEEDS CLARIFICATION` markers remain.
