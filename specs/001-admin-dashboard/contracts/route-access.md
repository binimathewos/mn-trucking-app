# Contract: Administrator Route Access

Resolves Clarification Session 2026-09-04 / FR-022 / SC-007 into a concrete, testable decision
function, shared by Clerk middleware and the `(admin)` layout server component (research.md #2).

## `resolveRouteAccess(session: { isSignedIn: boolean; role?: "administrator" | "driver" }): RouteAccessResult`

`RouteAccessResult` is one of:

| Result | When | Effect |
|---|---|---|
| `{ outcome: "render" }` | `isSignedIn` is `true` and `role` is `"administrator"` | The Administrator dashboard (and other `(admin)` routes) render normally |
| `{ outcome: "redirect", destination: "sign-in" }` | `isSignedIn` is `false` | Visitor is redirected to sign-in; dashboard never renders |
| `{ outcome: "redirect", destination: "driver-area" }` | `isSignedIn` is `true` and `role` is `"driver"` | Driver is redirected to their own area/placeholder; dashboard never renders |

- MUST be a pure function of its input — no network/database calls inside it — so both the edge
  middleware and the server layout can call it with whatever session data each layer already
  has, and so it is unit-testable without mocking Clerk.
- MUST NOT default an unrecognized/missing `role` to `"administrator"`; anything other than
  exactly `"administrator"` while signed in resolves to the `driver-area` redirect (fail closed,
  per the constitution's least-privilege principle).

## Consumer expectation

- `clerkMiddleware` calls this (via the session claims Clerk exposes at the edge) to short-circuit
  unauthenticated requests to `(admin)/*` before any React rendering happens.
- `src/app/(admin)/layout.tsx` calls this again server-side (defense in depth) using the full
  Clerk session, and performs the actual `redirect()` for the `driver-area` and `sign-in` cases
  if middleware did not already handle them.
