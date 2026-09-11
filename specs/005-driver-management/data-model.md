# Phase 1 Data Model: Driver Management

Extends the existing `User`/`Driver` Prisma models in place (`prisma/schema.prisma`). No new
tables. See research.md for why each design choice was made.

## Entity: `User` (existing — no schema change)

| Field | Type | Notes |
|---|---|---|
| `id` | `String` (cuid) | Unchanged |
| `clerkUserId` | `String` (unique) | Unchanged — the join key back to Clerk; used to call `banUser`/`unbanUser` and to look up `lastSignInAt` |
| `name` | `String` | Unchanged — full name shown in the directory |
| `email` | `String?` (unique) | Unchanged — this feature treats it as **required** for `DRIVER`-role users and read-only after creation (FR-019); enforced by Zod at the write boundary, not a schema-level NOT NULL, since `email` remains nullable for other paths outside this feature's scope |
| `role` | `UserRole` (`ADMINISTRATOR` \| `DRIVER`) | Unchanged — always written as `DRIVER` by this feature's create action |

## Entity: `Driver` (existing — extended)

```prisma
enum DriverStatus {
  ACTIVE
  INACTIVE
  ON_LEAVE
}

model Driver {
  id          String       @id @default(cuid())
  userId      String       @unique
  user        User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  roleType    String                          // reused as "driver class" (research.md #9)
  phone       String?                          // NEW — optional phone number
  truckNumber String?                          // CHANGED from String — assignment is now optional
  status      DriverStatus @default(ACTIVE)    // NEW
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
}
```

| Field | Type | Change | Notes |
|---|---|---|---|
| `id` | `String` (cuid) | unchanged | |
| `userId` | `String` (unique) | unchanged | One-to-one with `User`; only ever created for `DRIVER`-role users |
| `roleType` | `String` | unchanged, reused | This feature's "driver class" (e.g., "Class A Driver"); a fixed small set of labels per spec Assumptions, validated by Zod enum, not a DB enum (keeps future label additions a Zod-only change) |
| `phone` | `String?` | **new column** | Optional; validated as a phone format by Zod when present (FR-014) |
| `truckNumber` | `String?` | **nullability change** (was required) | Free-text identifier (spec Assumptions — no separate Truck entity); `null` means unassigned |
| `status` | `DriverStatus` | **new column**, default `ACTIVE` | Drives the summary cards, filtering, and (via research.md #6) Clerk ban/unban on transitions to/from `INACTIVE` |
| `createdAt`/`updatedAt` | `DateTime` | unchanged | |

**Not stored**: "last activity" is never a column — it's read live from Clerk per request
(research.md #4). This is a deliberate divergence from the Key Entities section's plain-English
"last activity... attribute", which describes the driver's *logical* attributes, not a mandate
that every logical attribute be a physical column.

### Validation rules (enforced server-side via Zod, see contracts/driver-management.md)

- `name`: required, non-empty.
- `email`: required (create only), well-formed email.
- `temporaryPassword`: required (create only), minimum length pre-check only — see research.md #3
  for why the authoritative check is Clerk's rejection, not a duplicated Zod rule set.
- `phone`: optional; when present, must match a valid phone format.
- `roleType` ("driver class"): optional on create/edit; one of the fixed label set used by the
  reference screenshots.
- `truckNumber`: optional; when present and non-blank, must not match the `truckNumber` of any
  other `Driver` row whose `status != INACTIVE` (FR-021) — checked in the Server Action and backed
  by a database partial unique index (research.md #8).
- `status`: one of `ACTIVE` / `INACTIVE` / `ON_LEAVE`; editable directly from the Edit Driver
  dialog (FR-019) in addition to the dedicated deactivate/reactivate row actions.

### State transitions

```
        (created)
            │
            ▼
        ┌────────┐   admin sets status=ON_LEAVE (edit dialog)   ┌───────────┐
        │ ACTIVE │ ─────────────────────────────────────────────▶ ON_LEAVE  │
        └────┬───┘ ◀───────────────────────────────────────────  └─────┬─────┘
             │        admin sets status=ACTIVE (edit dialog)            │
             │                                                          │
   deactivate│ (banUser, truckNumber→null if set)      deactivate       │
             ▼                                          (banUser, truckNumber→null)
        ┌──────────┐  reactivate (unbanUser)                            │
        │ INACTIVE │ ◀───────────────────────────────────────────────────
        └──────────┘
```

- `ACTIVE ⇄ ON_LEAVE`: a plain field edit via the Edit Driver dialog's status control; no Clerk
  call — "on leave" is a reporting label only and does not restrict access (spec Clarifications).
- `ACTIVE → INACTIVE` or `ON_LEAVE → INACTIVE` ("Deactivate" row action): sets `status =
  INACTIVE`, sets `truckNumber = null` if one was assigned (FR-024), and calls
  `clerkClient.users.banUser(clerkUserId)`.
- `INACTIVE → ACTIVE` ("Reactivate" row action): sets `status = ACTIVE` and calls
  `clerkClient.users.unbanUser(clerkUserId)`. Truck assignment is not restored automatically — the
  administrator re-assigns a truck afterward if needed, since the freed truck may have already
  been given to someone else.

## Migration considerations

- `truckNumber` becomes nullable — non-breaking; all existing rows already have a non-null value
  from the timesheets-feature seed data.
- `status` is added with `@default(ACTIVE)` — non-breaking; every existing `Driver` row backfills
  to `ACTIVE`, which is correct (no driver in the current seed data represents a departed or
  on-leave driver).
- The partial unique index is added via raw SQL in the same migration (Prisma's schema DSL has no
  native partial-index syntax):
  ```sql
  CREATE UNIQUE INDEX "Driver_truckNumber_active_key"
    ON "Driver" ("truckNumber")
    WHERE "truckNumber" IS NOT NULL AND "status" <> 'INACTIVE';
  ```
