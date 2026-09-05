# Phase 1 Data Model: User Login

## No new entities

This feature introduces no persisted data, database tables, or Prisma models. The spec's only
Key Entity is:

- **User Session**: A signed-in state established and managed entirely by Clerk. The application
  reads it (via Clerk's `auth()` server helper, already in use across the project) to decide
  whether to render `<SignIn/>` or redirect to `/dashboard`. It has no attributes, relationships,
  or lifecycle that this codebase defines, stores, or migrates — Clerk owns all of that.

The existing `SessionRole` type (`"administrator" | "driver"`, defined in
`src/lib/auth/route-access.ts`) is not used by this feature — see research.md #2 for why the
sign-in page's redirect check is role-agnostic and reads only `userId` truthiness from `auth()`.

No `data-model.md` schema, validation rules, or state-transition diagram apply beyond what is
already documented in `specs/001-admin-dashboard/data-model.md` for the session/role concepts
this feature reuses unchanged.
