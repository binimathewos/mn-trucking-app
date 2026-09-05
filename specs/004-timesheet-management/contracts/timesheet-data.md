# Contract: Timesheet Data Access & Mutations (Database-Backed)

This feature has no external API surface. Its "contract" is the function signatures the UI
depends on — same convention as `specs/001-admin-dashboard/contracts/dashboard-data.md` — now
backed by Prisma/PostgreSQL instead of a mock module.

## Read functions (`src/features/timesheets/data/timesheet-repository.ts`, server-only)

### `getTeamDirectory(): Promise<Driver[]>`

Returns every `User` (Administrators and Drivers alike, per spec Assumptions), mapped to the
`Driver` view-model (`id`, `name`, `roleType`, `truckNumber`) in data-model.md.

- MUST return every user regardless of whether they have any timesheet yet.
- MUST NOT throw for an empty team (returns `[]`; caller renders the empty state).

### `getDriverSubmissions(weekStart: string, driverId?: string): Promise<DriverSubmissionRow[]>`

Returns one row per user in scope (optionally narrowed to a single `driverId`) for the given
week, left-joined against `Timesheet`/`TimesheetEntry` so users with no timesheet for that week
still appear with zeroed-out fields (`hoursLogged: 0`, `status: "not_submitted"`,
`lastSubmittedAt: null`, `dailyEntries: []`).

- MUST include every field `DriverSubmissionRow` in data-model.md defines, including
  `dailyEntries`, so the detail dialog needs no separate query.
- `hoursLogged`, `status`, and `lastSubmittedAt` MUST be derived via `lib/calculations.ts`
  (`deriveTotalHours`, `deriveStatus`, `deriveLastSubmittedAt`) from the fetched `entries`, never
  read from a stored column (none exists — data-model.md).
- Filtering by `driverId` MUST match on `User.id`; an unmatched id yields an empty array, not an
  error.

### `getTimesheetSummary(rows: DriverSubmissionRow[]): TimesheetSummary`

Pure — takes the already-fetched, already-filtered `DriverSubmissionRow[]` from
`getDriverSubmissions` and reduces it into the three summary-card figures (data-model.md
formulas). Kept separate from the database query so it can also be unit-tested without a
database, alongside the rest of `lib/calculations.ts`.

## Write functions (`timesheet-repository.ts`, called only from Server Actions)

### `upsertDailyEntry(input: { driverId: string; weekStart: string; date: string; startTime: string; endTime: string }): Promise<void>`

1. `Timesheet.upsert` on `{ userId_weekStart: { userId: driverId, weekStart } }` — creates the
   parent timesheet if it doesn't exist yet.
2. `TimesheetEntry.upsert` on `{ timesheetId_date: { timesheetId, date } }` with
   `hours` computed via `computeHoursFromTimeRange(startTime, endTime)` and `savedAt: new Date()`
   — creates or **replaces** the entry for that date (FR-014a; also a DB unique constraint,
   research.md #4).

- Caller (the Server Action) MUST have already validated `input` against
  `dailyEntryInputSchema` — this function does not re-validate shape, only persists.

### `deleteDailyEntry(input: { driverId: string; weekStart: string; date: string }): Promise<void>`

Deletes the matching `TimesheetEntry` (resolving the parent `Timesheet` by
`{ userId_weekStart }` first). A no-op (not an error) if no matching entry exists.

### `deleteTimesheet(input: { driverId: string; weekStart: string }): Promise<void>`

Deletes the `Timesheet` row for `{ userId_weekStart }`; `onDelete: Cascade` removes its entries.
A no-op if no matching timesheet exists.

## Server Actions (`src/features/timesheets/actions/timesheet-actions.ts`, `"use server"`)

Each action is the only caller of the write functions above, and each:

1. Calls `getSessionAccess()` → `resolveAdminOnlyAccess()`; throws (surfaced as a form error, not
   a silent no-op) if the result is not `{ outcome: "render" }`. This re-check is independent of
   the `(restricted)` route layout — defense in depth, per the constitution's Authentication,
   Authorization, and Security principle.
2. Parses its input through the matching Zod schema (`dailyEntryInputSchema` for
   `saveDailyEntryAction`; smaller id/date schemas for the two delete actions).
3. Calls the corresponding repository write function.
4. Calls `revalidatePath("/timesheets")` so the page's next render reflects the change —this is
   what makes SC-004 ("totals updated immediately, without a manual page refresh") true without
   any client-held duplicate state (research.md #7).

| Action | Repository call |
|---|---|
| `saveDailyEntryAction(input)` | `upsertDailyEntry(input)` |
| `deleteDailyEntryAction(input)` | `deleteDailyEntry(input)` |
| `deleteTimesheetAction(input)` | `deleteTimesheet(input)` |

## Consumer expectation

`timesheets/page.tsx` (a Server Component) is the only caller of the read functions; it passes
already-derived `DriverSubmissionRow[]` and `TimesheetSummary` down as props. Dialog/table
components call the Server Actions directly (via a `<form action={...}>` or an event handler) and
never import `timesheet-repository.ts` or `@prisma/client` themselves — keeping Prisma access
strictly server-only, per the constitution's Data and Persistence principle.
