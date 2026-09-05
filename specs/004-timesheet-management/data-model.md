# Phase 1 Data Model: Timesheet Management (Database-Backed Revision)

Persisted models live in `prisma/schema.prisma`. Application-facing view-model types (returned by
the repository layer, consumed by components) live in `src/features/timesheets/types.ts`, largely
unchanged in shape from the original mock-data plan — only their source changed.

## Prisma schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserRole {
  ADMINISTRATOR
  DRIVER
}

/// Any signed-in person, linked to their Clerk identity. Administrators and
/// Drivers are both represented here because an administrator's own logged
/// hours can appear in the driver submissions table (spec Assumptions).
model User {
  id          String   @id @default(cuid())
  clerkUserId String   @unique
  name        String
  email       String?  @unique
  role        UserRole
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  driver     Driver?
  timesheets Timesheet[]
}

/// Driver-specific profile data, one-to-one with a DRIVER-role User.
/// Deliberately minimal: only what this feature's table needs to display
/// (spec Key Entities: Driver.roleType) plus the truck assignment every
/// driver has (business rule: every driver has a truck assigned to them).
/// Not created for ADMINISTRATOR users.
model Driver {
  id          String   @id @default(cuid())
  userId      String   @unique
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  roleType    String
  truckNumber String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

/// One user's time record for one Monday-start week. totalHours, status, and
/// lastSubmittedAt are intentionally NOT columns here — they're derived at
/// read time from `entries` by lib/calculations.ts (research.md #5), so they
/// can never drift out of sync with the entries they summarize.
model Timesheet {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  weekStart DateTime @db.Date
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  entries TimesheetEntry[]

  @@unique([userId, weekStart])
}

/// One day's logged time within a Timesheet (spec Key Entities: Daily Entry).
/// `hours` is computed from startTime/endTime once, at save time, and stored
/// — it is not recomputed from the strings on every read (data-model.md
/// keeps a record's historical hours stable even if the computation rule
/// ever changes later).
model TimesheetEntry {
  id          String    @id @default(cuid())
  timesheetId String
  timesheet   Timesheet @relation(fields: [timesheetId], references: [id], onDelete: Cascade)
  date        DateTime  @db.Date
  startTime   String
  endTime     String
  hours       Float
  savedAt     DateTime  @default(now())

  @@unique([timesheetId, date])
}
```

No Containers, Billing, or Reports models are introduced, per the request scoping this revision.

## Derived values (unchanged rules from the original plan, now computed from real rows)

`TimesheetStatus` (`"not_submitted" | "draft" | "submitted"`), `totalHours`, and
`lastSubmittedAt` are computed in `src/features/timesheets/lib/calculations.ts` from a
`Timesheet`'s `entries`, exactly as specified in the spec's Clarifications (2026-09-04):

| Condition | Status |
|---|---|
| 0 entries for the week | `not_submitted` |
| 1–6 of the week's 7 dates have an entry | `draft` |
| All 7 of the week's dates have an entry | `submitted` |

- `totalHours` = sum of `entries[].hours`.
- `lastSubmittedAt` = max `entries[].savedAt`, or `null` when there are no entries.
- `averageDailyHours` (for the summary cards) = sum of `hours` across every entry in the active
  filter scope ÷ count of those entries — **not** divided by driver count or calendar days
  (Clarifications, 2026-09-04).

## Application view-model types (`src/features/timesheets/types.ts`)

These are what components actually receive — same shapes as the original mock-data plan, now
documented against their Prisma source instead of a mock array.

### `Driver` (directory row)

| Field | Type | Source |
|---|---|---|
| `id` | `string` | `User.id` |
| `name` | `string` | `User.name` |
| `roleType` | `string` | `"Administrator"` when `User.role === "ADMINISTRATOR"`; otherwise `Driver.roleType` |
| `truckNumber` | `string \| null` | `Driver.truckNumber` when `User.role === "DRIVER"`; `null` for Administrators (they have no `Driver` profile) |

### `DailyEntry`

| Field | Type | Source |
|---|---|---|
| `date` | `string` (ISO `yyyy-mm-dd`) | `TimesheetEntry.date` |
| `startTime` | `string` (`HH:mm`) | `TimesheetEntry.startTime` |
| `endTime` | `string` (`HH:mm`) | `TimesheetEntry.endTime` |
| `hours` | `number` | `TimesheetEntry.hours` |
| `savedAt` | `string` (ISO datetime) | `TimesheetEntry.savedAt` |

**Uniqueness rule** (Clarifications, 2026-09-04; now also a DB constraint — research.md #4): at
most one `DailyEntry` per `date` within a timesheet. The repository's `upsertDailyEntry` uses
Prisma's `upsert` against `@@unique([timesheetId, date])`, so saving a new entry for an
already-used date replaces it rather than creating a second row.

### `DriverSubmissionRow` (table row + detail-view source)

| Field | Type | Source |
|---|---|---|
| `driverId` | `string` | `User.id` |
| `driverName` | `string` | `User.name` |
| `roleType` | `string` | See `Driver.roleType` above |
| `truckNumber` | `string \| null` | See `Driver.truckNumber` above — carried onto the row so the detail dialog can show it without a second fetch |
| `hoursLogged` | `number` | Derived `totalHours` for the selected week, or `0` if no `Timesheet` row exists |
| `lastSubmittedAt` | `string \| null` | Derived, or `null` |
| `status` | `TimesheetStatus` | Derived, or `"not_submitted"` |
| `dailyEntries` | `DailyEntry[]` | The week's entries (used directly by the detail dialog — no second fetch, per plan.md) |

`getDriverSubmissions(weekStart, driverId?)` returns one `DriverSubmissionRow` per `User` in
scope — including drivers with **no** `Timesheet` row for that week at all (left-joined against
the full team directory), so Not Submitted drivers still appear (Edge Cases in spec.md).

### `TimesheetSummary`

| Field | Type | Formula |
|---|---|---|
| `totalTeamHours` | `number` | Sum of `hoursLogged` across rows in scope |
| `submittedCount` | `number` | Count of rows in scope with `status === "submitted"` |
| `totalDriverCount` | `number` | Count of rows in scope |
| `averageDailyHours` | `number` | See "Derived values" above |

### `WeekOption` (pure, DB-free — unchanged from the original plan)

| Field | Type | Notes |
|---|---|---|
| `value` | `string` (ISO `yyyy-mm-dd`) | The week's Monday |
| `label` | `string` | `"This week"` for the current week, else a formatted range |

## Validation rules (`dailyEntryInputSchema`, a Zod schema in `lib/calculations.ts`)

Enforced inside every Server Action before a write reaches Prisma (the feature's actual server
boundary, per Constitution Check Principle 8):

- `driverId` (maps to `User.id`) is required and must reference an existing `User`.
- `date` is required and must fall within the target week (Monday–Sunday of `weekStart`).
- `startTime`/`endTime` are required 24-hour `HH:mm`; `endTime` must be strictly after
  `startTime` (no overnight/cross-midnight shifts — unchanged from the original plan).

## Relationships

```text
User 1 ──── 0..1 Driver          (only for role = DRIVER; Administrators have none)
User 1 ──── 0..* Timesheet       (one per week the user has any entries for)
Timesheet 1 ──── 0..7 TimesheetEntry   (unique by date)
```

## Clerk linkage

`User.clerkUserId` is the join key to Clerk's identity (research.md #2). It is set:

- For whoever is actually signed in, lazily, by `getOrCreateCurrentUser()` on first use.
- For seeded drivers, by `prisma/seed.ts` using placeholder values (`seed_<slug>`) — a documented
  development-only stand-in, since seeded drivers don't have real Clerk accounts (research.md
  #2, #8).
