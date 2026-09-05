# Contract: `/sign-in` Route

Resolves FR-001, FR-003, FR-004, FR-005, FR-012, FR-013, and the Clarifications session
(2026-09-04) into the concrete, testable route behavior for the app's one new page.

## Route: `GET /sign-in`

| Visitor state | Behavior |
|---|---|
| Not signed in | Renders the sign-in page: company logo, heading, and Clerk's `<SignIn/>` component (email + password strategy, as configured on the Clerk instance — see research.md #3). No protected content is ever included in this response. |
| Signed in (any role) | Server-side redirect to `/dashboard` before any sign-in UI renders. Role is never consulted — the redirect target is always `/dashboard`, regardless of Administrator/Driver status (Clarifications 2026-09-04; FR-003, FR-012). |

- The "signed in" check MUST be performed server-side via Clerk's `auth()` helper (already used
  elsewhere in the app) — never inferred from a client-supplied flag or query parameter.
- On successful authentication *through* the `<SignIn/>` component, Clerk MUST be configured
  (via the component's redirect props) to send the browser to `/dashboard` — not back to
  `/sign-in`, and not to whatever page originally triggered the sign-in requirement (Assumptions:
  post-login destination is always `/dashboard`).
- On failed authentication, Clerk's `<SignIn/>` component MUST remain on `/sign-in` and display
  its own built-in error messaging (FR-006, FR-007) — this route contract does not introduce any
  custom error-handling path.

## Upstream integration: existing `redirectToSignIn()` call sites

Three call sites already redirect unauthenticated/unauthorized visitors using Clerk's
`redirectToSignIn()` helper, all introduced by `001-admin-dashboard` and unmodified by this
feature:

| Call site | Trigger |
|---|---|
| `src/proxy.ts` | Unauthenticated visitor to an admin-protected route (`/dashboard`, `/timesheets`, `/containers`, `/drivers`, `/reports`, `/settings`) |
| `src/app/page.tsx` | Unauthenticated visitor to `/` |
| `src/app/(admin)/layout.tsx` | Unauthenticated visitor rendering any `(admin)` route (defense-in-depth, same check as `proxy.ts`) |

This feature's contract obligation to those call sites: once `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`
is set (research.md #1), all three MUST land the visitor on this route rather than Clerk's hosted
Account Portal, with no changes to their own logic required.

## Out of scope for this contract

- Role-based redirect destinations from `/sign-in` (FR-012; drivers still only reach their area by
  first landing on `/dashboard` and being redirected by existing `(admin)` layout logic if they
  navigate into an admin route — unchanged, pre-existing behavior from `001-admin-dashboard`).
- Any API/Route Handler — this feature exposes a page, not a JSON endpoint.
