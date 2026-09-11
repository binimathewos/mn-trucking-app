# Phase 0 Research: Driver Management

All items below resolve unknowns raised in the spec's Technical Context; none remain marked
NEEDS CLARIFICATION.

## 1. Temporary-password field vs. `docs/ui/add-driver.png`

**Decision**: Add a required "Temporary password" field to the Add Driver dialog even though the
reference screenshot does not show one; keep every other field and the dialog's structure/layout
identical to the screenshot.

**Rationale**: The spec (clarified, FR-013/FR-016/FR-032/FR-034) explicitly requires direct
account creation with an administrator-supplied temporary password for the current
(development) configuration — this is a functional requirement layered on top of the visual
mockup, not a redesign of it. Constitution §4 requires reproducing the reference screenshot's
layout/spacing/typography/hierarchy, which this satisfies; it does not forbid adding a
spec-mandated field the mockup simply predates.

**Alternatives considered**:
- *Invitation-only flow matching the screenshot exactly* — rejected: contradicts FR-016
  ("account is created directly... no email invitation") and SC-002 ("without waiting on an
  email round trip"), which are explicit, clarified requirements for this feature's scope.
- *Auto-generate the temporary password server-side* — rejected: the spec's acceptance scenarios
  (US2 Acceptance Scenario 1, FR-013) describe the administrator entering the temporary password.

## 2. Clerk account creation, duplicate-email detection, and role assignment

**Decision**: Use the Clerk Backend SDK's `clerkClient.users.createUser({ emailAddress: [email],
password, firstName, lastName, publicMetadata: { role: "driver" } })` (`@clerk/backend`
`UserAPI.createUser`, re-exported via `@clerk/nextjs/server`). Emails passed this way are created
already **verified** by default, satisfying "immediately usable for sign-in without email
verification" (FR-016) with no extra flag needed. Clerk itself enforces email uniqueness across
the instance — a duplicate `emailAddress` is rejected by the API, which becomes the source of
truth for FR-015's duplicate-account check; the server action surfaces that failure as the
required clear, actionable error rather than re-implementing uniqueness locally. The driver role
is written to `publicMetadata.role = "driver"` — the same location and shape already read by
`getSessionAccess`'s `normalizeRole` (`src/lib/auth/get-session-access.ts`), and the value is
always hardcoded to `"driver"` in this feature's write path (FR-003: never settable to
administrator through this feature).

**Rationale**: Reuses the existing role-storage convention instead of inventing a second one;
lets Clerk (the authentication source of truth) own identity uniqueness instead of duplicating
that check against local data, which could drift.

**Alternatives considered**:
- *Invitation-based creation (`clerkClient.invitations.createInvitation`)* — this is the intended
  production flow per FR-033/Assumptions, but doesn't fit "immediately usable... without waiting
  on an email round trip" (SC-002) for the current spec, and Clerk invitations don't accept an
  administrator-supplied password. Deferred; see #5 below for how the switch stays cheap.
- *Checking `prisma.user.findUnique({ where: { email } })` before calling Clerk* — rejected as
  the sole check: a local-only check can't see accounts created directly in Clerk, and duplicates
  the source of truth. Still useful as a fast pre-check for good UX, but Clerk's rejection remains
  the authoritative signal.

## 3. Password requirements and validation surfacing

**Decision**: Do not hardcode Clerk's minimum password rules in Zod. Zod enforces only presence
and a basic minimum length as a cheap client-side pre-check; the authoritative check is Clerk's
own rejection of `createUser`, whose error is mapped to a field-level form error on the temporary
password field (FR-014, FR-014's "meets the authentication provider's minimum password
requirements", edge case row for password rejection).

**Rationale**: Clerk's password policy is configurable in the Clerk Dashboard and can change
without a code deploy; hardcoding a duplicate rule set in Zod would drift out of sync with the
actual provider-side policy (constitution §7's "avoid duplicating... data that can reliably be
derived" applies analogously to duplicating externally-owned business rules).

**Alternatives considered**: Mirroring Clerk's password-strength rules in a Zod schema — rejected
for the drift risk above; the UX cost (one extra server round trip on a bad password) is small
for an admin-only, low-frequency form.

## 4. "Last activity" without fabricating data

**Decision**: Do not persist `lastActivity`/`lastSignInAt` in the local database at all. At
directory-read time, call `clerkClient.users.getUserList({ userId: [...driverClerkUserIds] })`
(accepts up to 100 user IDs per call, which comfortably covers this single company's roster) and
merge each returned user's `lastSignInAt` (epoch ms or `null`) onto the corresponding driver row
by `clerkUserId`. A `null` value renders as "Not yet active" (FR-012, edge case row); a non-null
value is formatted the same way the existing timesheets feature formats relative activity
timestamps.

**Rationale**: `lastSignInAt` is Clerk-owned truth; storing a local copy would require a sync
mechanism (webhook or polling) that FR-031 explicitly puts out of scope ("sync... only guaranteed
for changes made through this application") and constitution §7 discourages duplicating derivable
data. Reading it live avoids ever fabricating or staling a timestamp.

**Alternatives considered**:
- *Store `lastSignInAt` locally, updated via a Clerk webhook* — rejected as scope creep: no
  webhook infrastructure exists in this codebase yet, and FR-031 explicitly disclaims
  reconciliation-with-external-changes as out of scope for this feature.
- *Derive "last activity" from local `Timesheet`/`TimesheetEntry` records instead* — rejected:
  that's submission activity, not sign-in activity, and would misrepresent drivers who sign in
  without submitting a timesheet that day.

## 5. Keeping the account-creation method swappable (FR-033)

**Decision**: Route all account creation through one function,
`provisionDriverAccount(input): Promise<{ clerkUserId: string }>` in
`src/features/drivers/lib/provision-account.ts`. Its current implementation calls
`clerkClient.users.createUser(...)` as described in #2. Everything above and below this function
(the Server Action, the Zod schema, the Prisma writes, the UI) depends only on its
`{ clerkUserId }` return shape, not on how the account was created.

**Rationale**: Satisfies FR-033 with the simplest possible boundary — a single swappable function,
not a configurable strategy/plugin system (which would be speculative infrastructure the
constitution's YAGNI principle §16 warns against). Switching to an invitation-based flow later
means changing this one function's body (and dropping the password field from the form/schema);
the `Driver`/`User` models, the Server Action contract, and the directory/edit UI are unaffected
because they already only ever dealt with a `clerkUserId`.

**Alternatives considered**: An `AccountProvisioningStrategy` interface with two implementations
selected by an env var — rejected as premature: there is exactly one implementation needed today,
and the constitution explicitly discourages building abstractions before there's a second
concrete use case.

## 6. Revoking/restoring application access on deactivate/reactivate

**Decision**: On deactivation, in the same Server Action that sets `Driver.status = INACTIVE`,
call `clerkClient.users.banUser(clerkUserId)`. On reactivation, call
`clerkClient.users.unbanUser(clerkUserId)` alongside setting `Driver.status = ACTIVE`. A banned
Clerk user has all sessions revoked and cannot sign in again, which is exactly "prevent that
driver from using restricted application functionality going forward" (FR-023) and "regain access
to the functionality permitted to their role" on reactivation (FR-025) — enforced at the
authentication layer itself, not by adding a new local "is this driver banned" check that every
route would otherwise need to remember to perform.

**Rationale**: The existing route-access layer (`resolveDashboardAccess`/`resolveAdminOnlyAccess`)
only checks `isSignedIn`/role — it has no notion of an inactive driver today, and every driver
route (dashboard, timesheets, etc.) would need a new check added if access control lived locally.
Using Clerk's ban primitive centralizes the enforcement at the point that already gates all
access (the ability to have a session at all), matching how this codebase already treats Clerk as
the authority for identity/session concerns.

**Alternatives considered**: Add an `isActive` check inside `getSessionAccess` or the shared
layouts that queries the local `Driver` row on every request — rejected: adds a DB round trip to
every authenticated page load for a condition Clerk can already enforce for free at the session
layer, and duplicates state (`Driver.status` vs. a second "is active" signal) that could disagree
after the compensating-rollback paths in #7.

## 7. Partial-failure handling for driver creation (FR-017)

**Decision**: Create the Clerk account first via `provisionDriverAccount`. If that fails, nothing
local has been written yet, so there is nothing to roll back — the error is simply surfaced. If
the subsequent `prisma.$transaction([...])` (creating the `User` and `Driver` rows together)
fails, immediately call `clerkClient.users.deleteUser(clerkUserId)` as a compensating action so no
orphaned Clerk account is left behind, then surface an actionable error. If that compensating
delete itself throws, the error is logged with the orphaned `clerkUserId` and the administrator is
told the account may need manual cleanup — this satisfies the edge case's "or the inconsistency
is clearly surfaced and resolvable" fallback rather than silently hiding it.

**Rationale**: There's no cross-system transaction between Clerk and Postgres, so the ordering
choice determines what "no orphaned record" means in practice. Creating the harder-to-undo,
externally-visible resource (a sign-in-capable account) first, then wrapping the local writes in
one Prisma transaction, then compensating on failure is the standard saga pattern for exactly this
two-system shape, and keeps the local `User`/`Driver` pair atomic with each other (via
`$transaction`) even though it can't be atomic with Clerk.

**Alternatives considered**:
- *Create the local `User`/`Driver` first, then the Clerk account* — rejected: a failed Clerk
  call after a committed local write leaves a `User`/`Driver` with no real account behind it
  (worse: it would need its own rollback of a committed transaction, which is less safe than
  deleting a just-created, not-yet-referenced Clerk user).
- *Two-phase "reserve locally, confirm after Clerk succeeds"* — rejected as unnecessary complexity
  for this scale (single-admin, one-at-a-time driver creation); no evidence of concurrent-creation
  pressure that would justify it.

## 8. Truck-assignment uniqueness enforcement

**Decision**: Enforce "a truck belongs to at most one active driver" at two layers: (a) an
application-level check inside the add/edit Server Actions — query for another `Driver` row with
the same (case-insensitive) `truckNumber` and `status != INACTIVE`, and reject with a clear
message if found (FR-021) — for a good, specific error message; and (b) a database-level partial
unique index (raw SQL in the Prisma migration, since Prisma's schema DSL has no native partial
index syntax) as a last-resort integrity guarantee against races. `ON_LEAVE` drivers still count
as holding their truck (only deactivation frees it, per FR-024/edge cases), so the partial index
condition is `status <> 'INACTIVE'`.

**Rationale**: Constitution §7 ("prefer relational modeling and database constraints where they
protect data integrity") plus §8 ("business invariants MUST be enforced server-side") both point
to a real constraint, not just an application check; the application-level check exists
separately because a bare constraint violation is a poor, non-actionable error message for the
form (FR-014's "clear message" bar).

**Alternatives considered**: Application-level check only, no database constraint — rejected:
leaves a real (if narrow) race window between the check and the write with no safety net,
contradicting SC-003's "100%... no two active drivers ever end up sharing one truck."

## 9. Driver class field

**Decision**: Reuse the existing `Driver.roleType` column (already present, already rendered as
"Class A Driver" text by the timesheets feature's `toRoleType` mapping) as this feature's "driver
class" field. No new column is added.

**Rationale**: Constitution §10 ("reuse existing... schemas... before creating new ones; do not
duplicate existing functionality"). The column already stores exactly this value for exactly this
purpose.

**Alternatives considered**: A new `driverClass` column plus a migration to backfill from
`roleType` — rejected: pure duplication of an existing, already-correct field.
