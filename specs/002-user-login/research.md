# Phase 0 Research: User Login

All items below were open technical questions raised by the Technical Context, not user-facing
scope questions (those were resolved in `/speckit-clarify`). Each is resolved with a decision,
rationale, and alternatives considered.

## 1. Making `redirectToSignIn()` land on our page instead of Clerk's hosted portal

**Decision**: Set `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in` (and document it in
`.env.local.example`). No code changes to `src/proxy.ts`, `src/app/page.tsx`, or
`src/app/(admin)/layout.tsx` — all three already call Clerk's `redirectToSignIn()` from
`001-admin-dashboard`.

**Rationale**: Clerk's `auth().redirectToSignIn()` helper redirects to whatever sign-in URL the
Clerk instance is configured with; without `NEXT_PUBLIC_CLERK_SIGN_IN_URL` (or an equivalent
middleware option) it falls back to Clerk's hosted Account Portal. Setting the env var is the
smallest possible change that makes every existing unauthenticated-redirect call site in the app
point at this feature's new page, satisfying FR-001/FR-004 without touching already-correct,
tested route-protection code (Principle 16: smallest coherent change).

**Alternatives considered**:
- *Pass `signInUrl` explicitly to `clerkMiddleware()` in `proxy.ts`*: rejected — only covers the
  middleware call site, not `redirectToSignIn()` calls in `page.tsx`/`(admin)/layout.tsx`; the
  env var covers all three uniformly since Clerk reads it as the shared default.
- *Hardcode `/sign-in` as a `redirect()` call at each of the three sites instead of relying on
  `redirectToSignIn()`*: rejected — would duplicate a URL string at three call sites and diverge
  from the Clerk-recommended helper; the env var keeps a single source of truth.

## 2. Where to check "already authenticated" on the sign-in page

**Decision**: In `src/app/sign-in/page.tsx` (Server Component), call Clerk's `auth()` directly and
read `userId` — if truthy, `redirect("/dashboard")` before rendering `<SignIn/>`. Do **not** call
`resolveRouteAccess()` / `getSessionAccess()` for this check.

**Rationale**: `resolveRouteAccess()` is role-aware — it sends authenticated Drivers to
`driver-area`. Per Clarifications, an authenticated user of *any* role visiting `/sign-in` must
land on `/dashboard`, not a role-specific destination. Reusing the role-aware function here would
silently reintroduce role-based branching into a feature that explicitly excludes it (FR-012).
A direct, unconditional `userId` check is both simpler and correctly scoped to what this feature
requires.

**Alternatives considered**:
- *Reuse `getSessionAccess()`/`resolveRouteAccess()` and special-case its result*: rejected — adds
  a conditional just to undo role-aware behavior that doesn't apply here; a direct `auth()` call
  is less code and cannot drift from the two functions' role logic in the future.
- *Handle this redirect in `proxy.ts` instead of the page*: rejected — `proxy.ts`'s matcher is
  deliberately scoped to admin routes only; adding `/sign-in`-specific branching there would
  widen a well-tested, narrowly-scoped file for a check that's simpler and just as effective at
  the page level (Principle 10: no unrelated refactors).

## 3. Enforcing "email + password only" (FR-013)

**Decision**: No frontend restriction code. Ensure the Clerk instance's **User & Authentication**
settings (Clerk Dashboard) have only the Email address + Password strategy enabled for this
environment; `<SignIn/>` automatically reflects whatever strategies the instance is configured
with.

**Rationale**: Which sign-in strategies are offered (password, email code, OAuth, etc.) is
instance configuration in Clerk, not a prop or client-side toggle on `<SignIn/>` — there is no
supported way to "hide" a configured social provider purely from the React component while
leaving it enabled on the instance. Treating this as configuration (documented for whoever
provisions the Clerk instance, the same way `001-admin-dashboard` documented the
`publicMetadata.role` requirement in `.env.local.example`) keeps the code free of authentication
logic, matching FR-002.

**Alternatives considered**:
- *Build a custom credential form with `useSignIn()` and manually call the password strategy*:
  rejected — this is exactly the "custom authentication logic" FR-002 forbids; it would also
  require reimplementing Clerk's verification/error/recovery flows that FR-007 requires
  preserving as-is.

## 4. Whether new automated tests are warranted

**Decision**: Add no new Vitest tests for this feature. `tests/unit/route-access.test.ts` (from
`001-admin-dashboard`) is unchanged and still covers the app's one authorization decision
function.

**Rationale**: The constitution requires automated tests for business logic, calculations, and
authorization *rules* — this feature introduces none. The only conditional it adds is a single,
non-branching `if (userId) redirect("/dashboard")` in a Server Component; it is not an extractable
pure function (`redirect()` throws a Next.js-internal control-flow signal and cannot be
meaningfully unit-tested in isolation), and it makes no role-based decision. End-to-end coverage
of this behavior lives in `quickstart.md`'s manual scenarios (matching every spec acceptance
scenario), which is the appropriate weight for a check this small (risk-based testing, Principle
14).

**Alternatives considered**:
- *Extract the check into a tiny `isAlreadySignedIn(userId)` helper purely to have something to
  unit test*: rejected — the function would be a one-line identity check on a boolean; extracting
  it would be a test-driven abstraction with no behavior to verify beyond
  "`Boolean(x)` returns `x`" (avoid premature abstraction, Principle 16).
- *Add a Playwright/browser test for the redirect*: deferred, not rejected — valuable once more
  end-to-end coverage exists across the app, but disproportionate setup cost to introduce a new
  test runner for one route in this feature.

## 5. Whether this feature needs a `src/features/auth/` folder

**Decision**: No. The entire feature is implemented directly in `src/app/sign-in/page.tsx`
(logo, heading, and `<SignIn/>`, plus the one auth check).

**Rationale**: `src/features/dashboard/` exists because that feature has multiple components,
typed mock data, and pure derivation logic that benefit from separation from the route file. This
feature has none of that — one route, no local state, no data shapes, no logic beyond a single
redirect check. Creating a feature folder for a single JSX return would be an unused abstraction
(constitution: "avoid large monolithic ... utility files" cuts both ways — don't fragment a
one-file feature either).

**Alternatives considered**:
- *`src/features/auth/components/sign-in-panel.tsx` wrapping the page content*: rejected — there
  is exactly one caller (`page.tsx` itself); an indirection with a single call site adds a file
  and an import without adding reuse or clarity.

## Summary

All Technical Context unknowns are resolved. No `NEEDS CLARIFICATION` markers remain.
