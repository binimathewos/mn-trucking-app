# Quickstart: Validating User Login

Manual validation guide covering every acceptance scenario and edge case in `spec.md`. No new
automated tests are added for this feature (research.md #4); this guide is the verification path.

## Prerequisites

- `.env` (or `.env.local`) has valid `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`
  for a development Clerk instance (already present in this repo's `.env`).
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in` is set (see research.md #1 and `contracts/sign-in-route.md`).
- The Clerk instance's **User & Authentication** settings have Email address + Password enabled
  (research.md #3).
- At least one Clerk test user exists with a known email/password, and `publicMetadata.role` set
  to `"administrator"` (per `.env.local.example` from `001-admin-dashboard`) so the post-login
  `/dashboard` render succeeds rather than bouncing to the driver area.

## Setup

```bash
pnpm install
pnpm dev
```

## Scenario 1 — Successful login (spec Scenario 1, FR-003, SC-001)

1. Navigate to `http://localhost:3000/sign-in`.
2. Confirm the company logo and the Clerk sign-in form are visible.
3. Enter the test user's valid email + password and submit.
4. **Expected**: redirected to `/dashboard` in well under 10 seconds; the Administrator dashboard
   renders (from `001-admin-dashboard`).

## Scenario 2 — Invalid login (spec Scenario 2, FR-006, SC-004)

1. On `/sign-in`, enter a valid email with an incorrect password.
2. **Expected**: remains on `/sign-in`; Clerk's built-in error message appears; the form is still
   usable for a retry without a page reload.

## Scenario 3 — Protected routes (spec Scenario 3, FR-004, SC-002)

1. In a fresh/incognito session (no Clerk cookie), navigate directly to `/dashboard`.
2. **Expected**: redirected to `/sign-in`; dashboard content is never visible in the response.
3. Repeat for a deep link, e.g. `/timesheets`.
4. **Expected**: same redirect to `/sign-in` (not back to `/timesheets` after login — post-login
   destination is always `/dashboard` per Assumptions).

## Scenario 4 — Already authenticated (spec Scenario 4, FR-005, SC-003)

1. While signed in (from Scenario 1), navigate to `/sign-in` directly.
2. **Expected**: immediately redirected to `/dashboard`; the sign-in form is never shown.

## Scenario 5 — Responsive sign-in (spec Scenario 5, FR-010, SC-005)

1. With the browser dev tools device toolbar, load `/sign-in` at common desktop (≥1280px),
   tablet (~768px), and mobile (~375px) widths.
2. **Expected**: logo, heading, and form remain legible, centered, and fully usable (no
   horizontal scrolling, no clipped/overlapping elements) at every width.

## Accessibility spot-check (FR-011)

1. On `/sign-in`, tab through the page using only the keyboard.
2. **Expected**: focus order reaches the email field, password field, submit button, and any
   Clerk-provided links (e.g. "Forgot password?") in a logical order, with a visible focus
   indicator at each stop.

## Edge case — auth provider unreachable

1. Block network access to `*.clerk.accounts.dev` (or the configured Clerk Frontend API host) via
   browser dev tools request blocking, then load `/sign-in`.
2. **Expected**: a clear error/loading state is shown (Clerk's own degraded-state UI) rather than
   a blank white page.
