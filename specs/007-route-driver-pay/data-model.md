# Phase 1 Data Model: Route-Based Driver Pay

Adds one new Prisma model (`DriverPaySettings`), one new column on `Route`, and one new column
plus relation on `TimesheetEntry`. No existing column is removed or retyped. See research.md for
why each design choice was made.

## Entity: `Route` (existing — extended)

```prisma
model Route {
  id              String      @id @default(cuid())
  sequenceNumber  Int         @unique @default(autoincrement())
  clientId        String
  client          Client      @relation(fields: [clientId], references: [id])
  driverId        String?
  driver          Driver?     @relation(fields: [driverId], references: [id])
  pickupAddress   String
  deliveryAddress String
  pickupAt        DateTime
  deliveryAt      DateTime?
  referenceNumber String?
  notes           String?
  status          RouteStatus @default(SCHEDULED)
  hourlyRate      Decimal     @default(0) @db.Decimal(10, 2)
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  timesheetEntries TimesheetEntry[]

  @@index([driverId])
  @@index([clientId])
  @@index([status])
  @@index([pickupAt])
}
```

| Field | Type | Notes |
|---|---|---|
| `hourlyRate` | `Decimal(10,2)` | **New.** Dollars-and-cents rate paid to the assigned driver per hour on this route (FR-005). `@default(0)` only covers the rare direct-DB-insert path (e.g. seed scripts); every UI-driven create sends an explicit value (FR-007/FR-008). Never negative (enforced by Zod, FR-015). Editable by an ADMINISTRATOR any time the route is not in a final status (`isFinalStatus`, reusing the existing `loadMutableRoute` guard — unchanged behavior, FR-009). |
| `timesheetEntries` | `TimesheetEntry[]` | **New** back-relation from the extended `TimesheetEntry.routeId` below. |

All other fields are unchanged from the 006 Routes & Client Management feature.

### Validation rules (Zod, `src/features/routes/lib/validation.ts`)

- `hourlyRate`: required string matching `/^\d+(\.\d{1,2})?$/` (non-negative, ≤2 decimal places),
  added to both `createRouteInputSchema` and `updateRouteInputSchema`. Converted to
  `new Prisma.Decimal(value)` before the Prisma write.

## Entity: `DriverPaySettings` (new)

```prisma
model DriverPaySettings {
  id                String   @id @default("default")
  defaultHourlyRate Decimal  @default(0) @db.Decimal(10, 2)
  updatedAt         DateTime @updatedAt
}
```

| Field | Type | Notes |
|---|---|---|
| `id` | `String` | Always the literal `"default"` — this table only ever holds one row (research.md #7). Not a `SessionRole`-scoped or per-driver value (spec Assumptions: single system-wide setting). |
| `defaultHourlyRate` | `Decimal(10,2)` | The rate a newly created route's `hourlyRate` is prepopulated with (FR-007). `@default(0)` so a fresh environment starts at `$0.00` until an administrator sets one (spec Edge Cases). |
| `updatedAt` | `DateTime` | Standard audit column. No change-history/audit trail is kept beyond "when was it last touched" (Clarifications 2026-09-11 — no rate audit trail). |

**Get-or-create semantics**: `getDriverPaySettings()` (`src/features/settings/data/driver-pay-settings-repository.ts`)
does `prisma.driverPaySettings.upsert({ where: { id: "default" }, update: {}, create: { id: "default" } })`
so the row always exists after first read, with no seed/migration data step required.

### Validation rules (Zod, `src/features/settings/lib/validation.ts`)

- `defaultHourlyRate`: same `/^\d+(\.\d{1,2})?$/` pattern as `Route.hourlyRate`, required,
  non-negative.

## Entity: `TimesheetEntry` (existing — extended)

```prisma
model TimesheetEntry {
  id          String    @id @default(cuid())
  timesheetId String
  timesheet   Timesheet @relation(fields: [timesheetId], references: [id], onDelete: Cascade)
  date        DateTime  @db.Date
  startTime   String
  endTime     String
  hours       Float
  routeId     String?
  route       Route?    @relation(fields: [routeId], references: [id], onDelete: SetNull)
  savedAt     DateTime  @default(now())

  @@unique([timesheetId, date])
}
```

| Field | Type | Notes |
|---|---|---|
| `routeId` | `String?` | **New.** Nullable at the DB level only to keep pre-existing rows (recorded before this feature) valid (FR-021); required by Zod (`dailyEntryInputSchema`) for every entry saved through `saveDailyEntryAction` going forward, regardless of whether the caller is a DRIVER or an ADMINISTRATOR (FR-001, FR-019). Server-side, the referenced route MUST be currently assigned to the entry's `driverId` (`isRouteAssignedToDriver`, research.md #6) — checked on every save, never trusted from client input (FR-004). |
| `route` | `Route?` | **New.** `onDelete: SetNull` — if a `Route` were ever hard-deleted (routes are otherwise only soft-cancelled via `status`, per the 006 feature), historical entries degrade to "no route" (same display path as FR-021) rather than being destroyed. |

Calculated pay is **not** a stored field (research.md #4) — it's derived wherever an entry with a
route is displayed: `hours × route.hourlyRate` (FR-017), always using the route's *current* rate.

### Validation rules (Zod, `src/features/timesheets/lib/calculations.ts` → `dailyEntryInputSchema`)

- `routeId`: required, non-empty string.
- (Existing rules unchanged: `driverId`, `weekStart`/`date` ISO-date, `startTime`/`endTime` 24h
  `HH:mm`, `date` within the target week, `endTime` strictly after `startTime`.)

### Server-side authorization for `routeId` (both new and existing callers)

| Caller | `driverId` in the write | Allowed routes |
|---|---|---|
| DRIVER | Forced server-side to the caller's own `Driver.id` (never taken from client input) | Only routes where `route.driverId === caller's own Driver.id` |
| ADMINISTRATOR | Taken from the form (any driver) | Only routes where `route.driverId === <that driver's> Driver.id` — same restriction as above, just for a driver of the admin's choosing (Clarifications 2026-09-11) |

Both paths call the same `isRouteAssignedToDriver(routeId, driverId)` check (research.md #6);
violating it throws before any write occurs (SC-001, SC-006).

## Derived/display types (TypeScript, not persisted)

```ts
// src/features/timesheets/types.ts — DailyEntry extended
interface DailyEntry {
  date: string;
  startTime: string;
  endTime: string;
  hours: number;
  savedAt: string;
  routeId: string | null;
  routeLabel: string | null;   // e.g. "Rochester → Minneapolis" (pickupAddress → deliveryAddress), null if no route
  hourlyRate: string | null;   // formatted "24.50", null if no route
  calculatedPay: string | null; // formatted "228.00" = hours × hourlyRate, null if no route
}

// DriverSubmissionRow gains a rolled-up total:
interface DriverSubmissionRow {
  // ...existing fields unchanged...
  totalCalculatedPay: string; // sum of each dailyEntries[].calculatedPay that isn't null, formatted "1,482.50"
}
```

```ts
// src/features/routes/types.ts — RouteRow and the create/update input types extended
interface RouteRow {
  // ...existing fields unchanged...
  hourlyRate: string; // formatted "24.50"
}

interface CreateRouteInput {
  // ...existing fields unchanged...
  hourlyRate: string;
}

interface UpdateRouteInput {
  // ...existing fields unchanged...
  hourlyRate: string;
}
```

```ts
// src/features/settings/types.ts — new
interface DriverPaySettingsRow {
  defaultHourlyRate: string; // formatted "22.00"
}
```

## Entity-relationship summary

```
Route 1 ──< TimesheetEntry   (routeId, nullable; SetNull on Route delete)
Route.driverId ──> Driver     (existing, unchanged — defines "currently assigned")
DriverPaySettings              (standalone singleton; no relations)
```
