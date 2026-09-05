# Quickstart: Validating the Administrator Dashboard

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

1. **Administrator sees the dashboard** — Sign in as the administrator test user, navigate to
   `/dashboard`. Expect: sidebar (Dashboard active), top nav with avatar/initials, header with
   today's date + "Good [morning/afternoon/evening], <first name>" + overview line, three
   summary cards with icon/value/label/trend, and a Container Inventory card with a small set of
   rows (see spec.md scenarios 1–6, 12).

2. **Container status and search** — On the dashboard, confirm each inventory row shows a
   clearly distinct "In Warehouse" or "Checked Out" badge (scenario 7). Type a known container
   number's substring into the search field; expect only matching rows to remain (scenario 8).
   Type text matching nothing; expect a "no results" state (spec.md Edge Cases), not an empty
   table. With a mock row containing a very long customer name or container number, confirm the
   row truncates or wraps without breaking the row layout (spec.md Edge Cases).

3. **Check In and View inventory entry points** — Activate "Check In"; expect the check-in entry
   point to appear (no persisted change) (scenario 9). Activate "View inventory"; expect
   navigation toward the full inventory destination, which may currently be a placeholder page
   (scenario 10).

4. **Placeholder navigation** — Click each of Timesheets, Containers, Drivers, Reports, Settings
   in the sidebar; expect navigation to succeed to a placeholder page for each, without error
   (scenario 11).

5. **Route access control** — In a signed-out browser/session, visit `/dashboard`; expect a
   redirect to sign-in with the dashboard never rendering (scenario 13). Sign in as the driver
   test user and visit `/dashboard`; expect a redirect away from the Administrator dashboard
   (scenario 14).

6. **Responsive behavior** — With devtools/browser resized to common tablet and mobile widths,
   confirm the shell, header, summary cards, and inventory preview remain usable — no
   overlapping content, no horizontal page scroll, navigation still reachable (scenario 12,
   Edge Cases, SC-004).

7. **Keyboard accessibility** — Using only the keyboard (Tab/Shift+Tab/Enter/Space), reach and
   operate: sidebar links, the search field, Check In, each row's action menu, and View
   inventory. Confirm a visible focus indicator at every stop (SC-006).

8. **Zero/empty states** — With a mock data variant where active drivers, hours, and inventory
   are all `0` and the inventory list is empty, confirm the summary cards show `0` (not blank)
   and the inventory card shows an explicit empty state (spec.md Edge Cases).

## Automated checks

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

`test` covers the pure-function unit tests from research.md: storage-duration derivation,
greeting selection, and `resolveRouteAccess` (contracts/route-access.md) — including the
fail-closed case for an unrecognized/missing role.
