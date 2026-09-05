# Quickstart: Validating Role-Based Dashboard Navigation

## Prerequisites

- pnpm installed; project dependencies installed via `pnpm install`
- A Clerk development instance configured for this project, with Clerk env vars set locally
- Two Clerk test users:
  - one with `publicMetadata.role = "administrator"`
  - one with `publicMetadata.role = "driver"`

## Run

```bash
pnpm dev
```

## Validation scenarios

Each scenario maps to an acceptance scenario in `spec.md`.

1. **Driver lands on `/dashboard`, not a separate area** — Sign in as the driver test user.
   Expect the browser to land on `/dashboard` (not `/driver` or any other driver-only URL), and
   the page to render without error (US1, scenario 1).

2. **Administrator experience is unchanged** — Sign in as the administrator test user. Expect
   `/dashboard` to render exactly as before this feature (full operational summary, container
   inventory), and the sidebar to show all six items: Dashboard, Timesheets, Containers,
   Drivers, Reports, Settings (US1 scenario 2, US2 scenario 1, FR-004/FR-008).

3. **Already-signed-in Driver visiting `/sign-in`** — While signed in as the driver test user,
   navigate to `/sign-in`. Expect a redirect to `/dashboard`, not to a separate driver-area page
   (US1, scenario 3).

4. **Driver's navigation is restricted** — On `/dashboard` as the driver test user, confirm the
   sidebar shows only Dashboard — no Timesheets, Containers, Drivers, Reports, or Settings link
   is visible (US2, scenarios 2–3).

5. **Driver's dashboard content is minimal** — Still signed in as the driver, confirm the
   `/dashboard` page body shows the minimal/placeholder content (no Administrator operational
   summary or container inventory data is visible) (FR-009).

6. **Direct-URL access to Administrator-only pages is blocked for Drivers** — While signed in as
   the driver test user, directly navigate (type the URL) to each of `/timesheets`,
   `/containers`, `/drivers`, `/reports`, and `/settings`. Expect every one to redirect to
   `/dashboard` without ever showing the page's protected content (US3, scenario 1).

7. **Administrator direct-URL access still works** — While signed in as the administrator test
   user, directly navigate to each of the five pages above. Expect each to render normally,
   unchanged from current behavior (US3, scenario 2).

8. **Signed-out access is still blocked** — In a signed-out browser/session, visit `/dashboard`
   and each of the five Administrator-only pages. Expect every one to redirect to `/sign-in`
   (Edge Cases, FR-007) — unchanged from current behavior.

## Automated checks

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

`test` covers the pure-function unit tests: `resolveDashboardAccess` and `resolveAdminOnlyAccess`
(`contracts/route-access.md`, replacing the old `resolveRouteAccess` tests) and
`getNavItemsForRole` (`contracts/navigation.md`) — each including the fail-closed case for a
missing/unrecognized role.
