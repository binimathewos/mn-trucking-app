# Quickstart: Validating Driver Management

Prerequisites: local Postgres running with `DATABASE_URL` set, Clerk dev instance keys in `.env`
(`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`), migrations applied
(`pnpm prisma migrate dev`), and at least one administrator account (`publicMetadata.role =
"admin"` in Clerk) to sign in with.

```bash
pnpm install
pnpm prisma migrate dev
pnpm dev
```

Sign in at the app's sign-in page as an administrator, then navigate to **Drivers** in the
sidebar (`/drivers`).

## Scenario 1 — Roster view (User Story 1 / FR-006–FR-012)

1. With at least one driver already seeded, open `/drivers`.
   - **Expect**: summary cards (Total drivers, Active today, On leave) and a directory table
     render with real values — not the hardcoded `24` / `21` / `3` from the reference mockup.
2. Apply the status filter to `On leave`.
   - **Expect**: only on-leave drivers remain in the table; the summary cards keep showing
     roster-wide totals (unaffected by the filter — data-model.md / contracts note).
3. Search by a driver's first name.
   - **Expect**: only matching rows remain; clearing the search restores the full (filtered)
     list.
4. Search for a name that matches nothing while a status filter is also applied.
   - **Expect**: a distinct "no results" state, not an empty table with no explanation (FR-010).

## Scenario 2 — Add a driver (User Story 2 / FR-013–FR-017, FR-032–FR-034)

1. Click **Add driver**, submit only a full name (leave email/password blank), attempt submit.
   - **Expect**: validation errors on the required fields; no network call succeeds in creating
     anything.
2. Submit a valid full name, a fresh email, and a temporary password meeting Clerk's minimum
   requirements.
   - **Expect**: dialog closes, success feedback appears, the new driver appears in the directory
     without a manual reload, and the summary cards update.
3. In the Clerk Dashboard (or via `clerkClient.users.getUserList`), confirm the new user has
   `publicMetadata.role = "driver"`, a verified email, and can sign in immediately with the
   submitted temporary password (no email-verification step).
4. Repeat step 2 with the same email again.
   - **Expect**: a clear duplicate-account error; no second Clerk user or `Driver` row is created.
5. Repeat step 2 with a truck number already assigned to an existing active driver.
   - **Expect**: a clear conflict error; no account or profile is created (FR-017's "no orphaned
     record" applies here too — verify no Clerk user was left behind for this attempt).

## Scenario 3 — Edit a driver (User Story 3 / FR-018–FR-022)

1. Open **Edit** from an existing driver's row.
   - **Expect**: form pre-filled with current name/phone/driver class/truck/status; email shown
     read-only.
2. Change phone, driver class, and truck assignment to an unused truck number; save.
   - **Expect**: directory reflects the new values; no new Clerk account was created (same
     `clerkUserId` as before — spot-check in Clerk Dashboard).
3. Attempt to assign a truck already held by a different active driver; save.
   - **Expect**: clear rejection; original assignment for both drivers unchanged.
4. Clear the truck field and save.
   - **Expect**: driver shows no assigned truck; that truck number becomes assignable to another
     driver (verify via step 3's flow with the now-freed number).

## Scenario 4 — Deactivate / reactivate (User Story 4 / FR-023–FR-025)

1. From the row-actions menu, deactivate an active driver who has a truck assigned.
   - **Expect**: status becomes Inactive; the truck is freed (assignable elsewhere, per Scenario
     3 step 4); the driver's historical timesheets remain visible/unchanged in the Timesheets
     page.
2. Attempt to sign in as that now-deactivated driver (separate browser/session).
   - **Expect**: sign-in is rejected (Clerk ban takes effect immediately).
3. Reactivate the driver from the row-actions menu.
   - **Expect**: status returns to Active; the driver can sign in again.

## Scenario 5 — Non-administrator access is blocked (User Story 5 / FR-001–FR-003)

1. Sign in as a driver-role user; navigate directly to `/drivers`.
   - **Expect**: redirected away (existing `(restricted)` layout behavior — verify it still
     covers this route).
2. While signed in as a driver, attempt to call one of the Server Actions directly (e.g., via
   browser dev tools invoking the action, or a scripted request if the harness supports it).
   - **Expect**: rejected regardless of any role value the client claims.
3. Attempt to submit a crafted request that tries to set a role/status implying administrator
   privilege through any driver-management input.
   - **Expect**: rejected — no field in any of this feature's actions can grant the administrator
     role (contracts/driver-management.md — no such field exists in any input schema).

## Automated checks

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

All four must pass before the feature is considered complete (constitution §15).
