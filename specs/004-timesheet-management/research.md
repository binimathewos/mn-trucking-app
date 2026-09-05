# Phase 0 Research: Timesheet Management (Database-Backed Revision)

The feature spec left no unresolved `NEEDS CLARIFICATION` markers. The decisions below resolve
the implementation-level questions for making this the project's first database-backed feature,
per the follow-up directive to add the Postgres/Prisma/Clerk persistence foundation.

## 1. Why a database now, and why here

**Decision**: Introduce PostgreSQL + Prisma as part of this feature rather than as a separate
"infrastructure" feature, scoped to exactly the three models this feature needs.

**Rationale**: The constitution already names PostgreSQL and Prisma as the project's canonical
stack (Technology Foundation, Data and Persistence) — no prior feature had implemented that yet,
so every feature so far used mock data. This feature is both the first to need real
create/edit/delete behavior with acceptance criteria that assume durable-looking state (view →
manage → totals update) and the one the user explicitly directed to carry this work. Scoping the
schema to `User`, `Driver`, `Timesheet`, `TimesheetEntry` only (no Containers/Billing/Reports)
keeps this a "smallest coherent change" per the AI Agent Discipline principle, even though it
also happens to lay the foundation later features will reuse.

**Alternatives considered**: Standing up the database as its own, separate feature/spec first —
rejected as unnecessary process overhead; the constitution already dictates the stack, and there
is no independent user-facing behavior to specify for "a database exists" on its own.

## 2. Linking a Clerk session to a local `User` row

**Decision**: `getOrCreateCurrentUser()` (`src/lib/auth/get-or-create-current-user.ts`) upserts a
`User` row keyed by `clerkUserId` whenever the current session is used to read or write
timesheet data, using `currentUser()` (already called by `getSessionAccess()`) for `name`,
`email`, and the normalized role.

**Rationale**: Clerk is the identity provider; the app's own tables need a stable local id to
use as a foreign key on `Timesheet.userId` and `Driver.userId`. A lazy upsert on first use is the
smallest mechanism that satisfies "link application users to Clerk using Clerk user ID" — it
guarantees whoever is actually signed in (typically the administrator) has a corresponding
`User` row, including their own logged hours (per spec Assumptions: an administrator's hours can
appear in the table too).

**Alternatives considered**: A Clerk webhook (`user.created`/`user.updated`) syncing every Clerk
account into the `User` table proactively — rejected as speculative infrastructure beyond what
this feature's acceptance criteria require (no scenario depends on a user existing in the local
DB before they ever sign in), and it would need webhook-signature verification (`svix`) not
otherwise needed anywhere in the app yet. The lazy-upsert approach can be replaced by a webhook
later without changing the `User` schema if that becomes necessary.

**Seed-data caveat**: The development seed script (research.md #8) creates `Driver`-role `User`
rows with placeholder `clerkUserId` values (e.g. `seed_<slug>`), since seeded drivers don't have
real Clerk accounts in a dev environment. This is a development/demo-only limitation, not a
production behavior — documented in `prisma/seed.ts` and quickstart.md rather than worked around
with unrequested account-provisioning logic.

## 3. Schema shape: `User` + `Driver`, not one merged table

**Decision**: `User` is the Clerk-linked identity/role record (any signed-in person); `Driver` is
a one-to-one profile extension of `User` holding the driver classification (`roleType`, e.g.
"Class A Driver") and the truck assigned to that driver (`truckNumber`, e.g. "Truck 12"). Both
are plain string fields on `Driver`, not a separate `Truck` model. `Timesheet` links to `User.id`
directly (not `Driver.id`), because the driver submissions table can include an Administrator's
own row (spec Assumptions).

**Rationale**: This matches the spec's Key Entities — **Driver**'s distinguishing attributes are
its classification and its assigned truck — while keeping `Timesheet` valid for any team member
who logs hours, administrators included, without giving every `User` a meaningless `Driver`
profile. `truckNumber` is a plain field (not a `Truck` model with its own table) because nothing
in this feature manages trucks as their own records — no truck roster, no reassignment history,
no maintenance data was requested; it is simply an attribute every driver has, per the stated
business rule ("every driver has a truck assigned to him/her"). Modeling a full `Truck` entity
now would be exactly the kind of speculative, un-requested future-domain modeling the AI Agent
Discipline principle and the "do not model future domains" instruction warn against.

**Alternatives considered**: A single `User` table with nullable `roleType`/`truckNumber` columns
and no separate `Driver` model — rejected because the user's request explicitly asked for
"Required User/Driver ... models," and keeping driver-specific attributes on a dedicated model
avoids polluting the identity table with domain data a future Drivers-management feature will own
and extend. A separate `Truck` model with a `Driver.truckId` foreign key — rejected for now as
premature: it would only pay for itself once something needs to manage trucks independently of
drivers (a fleet/vehicles feature), which nothing in this feature's scope requires; a single
string field can be migrated to a real relation later without disrupting `Driver`'s other
fields, if that feature is ever built.

## 4. Timesheet identity and the one-entry-per-date rule, enforced at the database

**Decision**: `Timesheet` is uniquely identified by `(userId, weekStart)` via
`@@unique([userId, weekStart])`; `TimesheetEntry` is uniquely identified by `(timesheetId, date)`
via `@@unique([timesheetId, date])`. The repository's write path uses Prisma's `upsert` against
these constraints.

**Rationale**: The spec's Clarifications (2026-09-04) fixed a one-entry-per-date rule (FR-014a).
A database constraint enforces this even if application logic ever has a bug — defense in depth,
consistent with how the constitution treats authorization (never rely on one layer alone),
applied here to data integrity.

**Alternatives considered**: Enforcing uniqueness only in application code (as the original
mock-data plan's `upsertDailyEntry` did) — rejected now that a real database is available; a
constraint is strictly stronger and costs nothing extra to declare.

## 5. Derived fields stay derived, not stored

**Decision**: `Timesheet.totalHours`, `Timesheet.status`, and `Timesheet.lastSubmittedAt` are
still never stored (same decision as the original plan) — they're computed in
`lib/calculations.ts` from `TimesheetEntry` rows, now fetched from Postgres instead of a mock
array. `TimesheetEntry.hours` remains stored (computed once, at save time, from `startTime`/
`endTime`), per data-model.md.

**Rationale**: Storing derived aggregates on `Timesheet` would create a second source of truth
that could drift from its entries after an edit/delete — exactly the class of bug the constitution's
Data and Persistence principle warns against ("avoid duplicating persisted data that can reliably
be derived"). Computing them at read time from a handful of rows per driver per week is cheap at
this scale (Technical Context: tens of drivers).

**Alternatives considered**: A stored `totalHours`/`status` column updated by application code on
every write — rejected as an unnecessary second source of truth with no performance justification
at this scale.

## 6. Filtering moves to the URL, queries move to Prisma

**Decision**: The driver and week filters are represented as `searchParams` on `/timesheets`
(`?driverId=...&week=...`). `page.tsx` reads them and calls
`getDriverSubmissions(weekStart, driverId?)` directly against the database. The `FiltersBar`
client component stages a pending selection locally and applies it by navigating (updating the
URL) when "Filter" is clicked — same interaction model as the original plan, now backed by real
navigation instead of an in-memory list already loaded client-side.

**Rationale**: This is the idiomatic Next.js App Router pattern once data is server-fetched: the
URL is the source of truth for "what's currently being viewed," the page re-renders server-side
with fresh data, and the view is bookmarkable/shareable. It also removes the need to load the
entire dataset into client state up front (the original mock-data plan's `timesheets-board.tsx`),
since Prisma can fetch exactly the scoped rows a given filter combination needs.

**Alternatives considered**: Keeping a client-side copy of all timesheets and filtering in the
browser (the original plan) — rejected now that a real backend exists; it would mean fetching
every driver's every week up front for no benefit, and two sources of truth (URL vs. client
state) for the same filters.

## 7. Mutations: Server Actions, then `revalidatePath`

**Decision**: `saveDailyEntryAction`, `deleteDailyEntryAction`, and `deleteTimesheetAction` are
`"use server"` functions in `src/features/timesheets/actions/timesheet-actions.ts`. Each: (1)
calls `resolveAdminOnlyAccess` via `getSessionAccess()` and throws/redirects if the caller is not
an administrator; (2) validates input with the `dailyEntryInputSchema` Zod schema (or the
matching delete-input schema); (3) calls the corresponding repository write function; (4) calls
`revalidatePath("/timesheets")`.

**Rationale**: Server Actions are the constitution's stated mechanism for mutations. Re-checking
authorization inside each action (not just relying on the `(restricted)` layout) follows the same
defense-in-depth pattern 003-role-based-navigation already established for page-level access.
`revalidatePath` triggers Next.js's built-in re-render of the Server Component tree after the
action resolves, which is what makes totals/status "update immediately, without a manual page
refresh" (SC-004) true here — no client-held duplicate state or manual `router.refresh()` call is
needed.

**Alternatives considered**: A Route Handler (`POST /api/timesheets/...`) called via `fetch` from
the client — rejected; Server Actions are the more direct, less boilerplate-heavy mechanism for
same-app form-style mutations, and the constitution names Route Handlers specifically for
"HTTP/API boundary... including external integrations and webhooks," which this isn't.

## 8. Development seed data

**Decision**: `prisma/seed.ts`, run via `tsx` and wired through Prisma's `"prisma": { "seed": ... }`
`package.json` convention, creates: one `Administrator` `User` (matching the signed-in dev
account's role, with a realistic name), a handful of `Driver`-role `User` + `Driver` rows with
realistic names, classifications (e.g. "Class A Driver", "Class B Driver"), and a distinct
assigned `truckNumber` each (e.g. "Truck 12", "Truck 07" — no two seeded drivers share a truck),
and 2–3 weeks of `Timesheet` + `TimesheetEntry` rows per driver covering all three statuses (some
fully submitted, some partial/Draft, at least one driver with no entries at all for the current
week) so every status color and the empty state are exercisable without manually creating data
first.

**Rationale**: The spec's Acceptance Scenario 5 and SC-005 require all three statuses to be
visible and distinguishable; seeding a mix up front makes that immediately verifiable
(quickstart.md) instead of requiring the reviewer to manually construct every status by hand.

**Alternatives considered**: A single flat "everyone submitted" seed — rejected, would not
exercise the Draft/Not-Submitted states or the empty-detail-view edge case without extra manual
setup.

## 9. Dashboard metrics wiring — scope

**Decision**: `getOperationalSummary()` (`src/features/dashboard/data/mock-dashboard-data.ts`)
becomes `async`. Its `activeDrivers.value` and `hoursThisWeek.value` are now computed from the
same repository the Timesheets page uses (`getTeamDirectory()` count, and
`getDriverSubmissions(currentWeekStart)`'s summed hours, respectively). `inInventory` and the
container-preview functions are untouched — Containers is explicitly not modeled by this
revision. The `trendPercent`/`trendDirection` fields for the two now-real metrics are left as a
static neutral placeholder (`0`, `"flat"`) rather than computing a real week-over-week or
month-over-month comparison.

**Rationale**: The user's request was to "wire relevant dashboard timesheet metrics to real
data" — the two metrics this feature's data actually backs, not a reason to build historical
trend analytics. Spec.md's own Assumptions already treat trend/comparison figures as "a visual
styling detail... not a required business computation," and building real trend math here would
edge into "Advanced reporting and analytics," which is explicitly out of scope in spec.md.

**Alternatives considered**: Computing a real "vs last week" trend now that weekly data exists —
rejected as unrequested scope creep into reporting/analytics territory the spec explicitly
excludes; can be revisited as its own feature if wanted.

## 10. Prisma Client lifecycle

**Decision**: A single cached `PrismaClient` instance in `src/lib/db/prisma.ts`, using the
standard Next.js dev-mode pattern (`globalThis.__prisma ??= new PrismaClient()`), imported only
by server-only modules (`timesheet-repository.ts`, `get-or-create-current-user.ts`,
`timesheet-actions.ts`).

**Rationale**: Prevents exhausting Postgres connections from Next.js dev-server hot-reloading
creating a new `PrismaClient` per reload — the standard, documented mitigation for this exact
problem.

**Alternatives considered**: A new `PrismaClient()` per call site — rejected, this is the
well-known anti-pattern the singleton exists to avoid.

## 11. New UI primitive, week bounds, status colors

Unchanged from the original plan (still valid under the DB-backed design):

- **`select` component**: generated via the project's `shadcn` CLI for the driver/week dropdowns
  (no new runtime dependency; wraps the already-installed `@base-ui/react`).
- **Week bounds**: Monday–Sunday weeks; `getWeekOptions()` stays a pure, DB-free function
  returning a bounded 8-week list (current + 7 preceding), now used to populate the week
  `Select` whose `value` is passed as the `week` searchParam.
- **Status colors**: Submitted → emerald, Draft → amber, Not Submitted → slate/gray, reusing the
  existing emerald-for-good convention from the dashboard's container status badge.
