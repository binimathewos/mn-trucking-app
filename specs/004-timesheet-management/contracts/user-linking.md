# Contract: Clerk-to-User Linking

## `getOrCreateCurrentUser(): Promise<User>`

Location: `src/lib/auth/get-or-create-current-user.ts` (server-only; shared infrastructure, not
specific to the timesheets feature, since any future feature needing a local `User.id` for the
signed-in session will call it too).

Behavior:

1. Calls `getSessionAccess()` (existing, from 003-role-based-navigation) to get Clerk's
   `userId`/`user`/`role`.
2. If there is no signed-in Clerk user, throws — callers are always inside an already
   authorization-checked path (a Server Action or a page behind the `(restricted)` layout), so
   this should be unreachable in practice.
3. `prisma.user.upsert`:
   - `where: { clerkUserId: user.id }`
   - `update: { name, email, role }` (keeps the local copy in sync with Clerk on every call —
     cheap at this scale, and avoids a stale name/email/role if an admin changes them in Clerk)
   - `create: { clerkUserId: user.id, name, email, role }`
4. Returns the resulting `User` row.

- MUST NOT create a `Driver` profile as a side effect — that only exists for drivers who are
  provisioned through the seed script (or, in the future, an explicit "add driver" flow), not
  for whichever role happens to sign in first.
- MUST be idempotent — calling it repeatedly for the same Clerk user updates, never duplicates,
  the `User` row (guaranteed by the `clerkUserId` unique constraint in data-model.md).

## Consumer expectation

Called at the start of any Server Action that needs to resolve "who is performing this action"
to a local `User.id` (none of the three timesheet Server Actions currently need this, since their
`driverId` input already names the target `User.id` directly — but the function exists so the
signed-in administrator is guaranteed a `User` row of their own, letting their logged hours
appear in `getTeamDirectory()`/the submissions table per spec Assumptions, and so future features
needing "the current user's own record" don't need to reinvent this).
