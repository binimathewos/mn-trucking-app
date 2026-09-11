# Phase 1 Data Model: Routes & Client Management

Adds two new Prisma models (`Client`, `Route`) and one relation on the existing `Driver` model.
No existing column changes. See research.md for why each design choice was made.

## Entity: `Client` (new)

```prisma
enum ClientStatus {
  ACTIVE
  INACTIVE
}

model Client {
  id          String       @id @default(cuid())
  companyName String
  contactName String
  phone       String
  email       String
  address     String
  status      ClientStatus @default(ACTIVE)
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  routes Route[]
}
```

| Field | Type | Notes |
|---|---|---|
| `id` | `String` (cuid) | Primary key, follows existing convention (`User`, `Driver`) |
| `companyName` | `String` | Required (spec Assumptions — all client fields required) |
| `contactName` | `String` | Required |
| `phone` | `String` | Required; validated as a phone format by Zod (FR-030) |
| `email` | `String` | Required; validated as a well-formed email by Zod (FR-030). Not marked `@unique` — two clients coincidentally sharing a contact email is not a business rule violation, and the spec has no dedup requirement beyond "reusable, not recreated per route" (satisfied by the select-existing-client UI flow, not a DB constraint) |
| `address` | `String` | Required |
| `status` | `ClientStatus` | Defaults `ACTIVE` on create (FR-029); `INACTIVE` clients are excluded from the route-form select (FR-033/FR-034) but never deleted (FR-032) |
| `createdAt`/`updatedAt` | `DateTime` | Standard audit columns, existing convention |

### Validation rules (Zod, `src/features/clients/lib/validation.ts`)

- `companyName`, `contactName`, `address`: required, non-empty (trimmed).
- `phone`: required, valid phone format (reuse the existing `PHONE_RE` pattern from
  `src/features/drivers/lib/validation.ts`).
- `email`: required, well-formed email.
- `status`: `ACTIVE | INACTIVE`, settable only via the dedicated activate/deactivate action, not
  the add/edit form (mirrors `setDriverStatusAction` vs. `updateDriverAction` split).

## Entity: `Route` (new)

```prisma
enum RouteStatus {
  SCHEDULED
  ASSIGNED
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

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
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  @@index([driverId])
  @@index([clientId])
  @@index([status])
  @@index([pickupAt])
}
```

| Field | Type | Notes |
|---|---|---|
| `id` | `String` (cuid) | Primary key |
| `sequenceNumber` | `Int` (unique, autoincrement) | Backing value for the displayed, human-readable route number (research.md #2); never shown raw, always formatted via `formatRouteNumber()` |
| `clientId` / `client` | `String` / relation | Required — every route belongs to exactly one client (FR-011, FR-014) |
| `driverId` / `driver` | `String?` / relation | Optional — a route may exist unassigned (spec "A route may be created without a driver") |
| `pickupAddress` | `String` | Required |
| `deliveryAddress` | `String` | Required |
| `pickupAt` | `DateTime` | Required — drives scheduling, date filtering, and is one side of the conflict-overlap check |
| `deliveryAt` | `DateTime?` | Optional appointment/estimate (spec Assumptions); its absence disables conflict-checking for that route (research.md #4) |
| `referenceNumber` | `String?` | Load/container/reference number, free text |
| `notes` | `String?` | Job instructions/notes, free text |
| `status` | `RouteStatus` | Defaults `SCHEDULED`; see state model below |
| `createdAt`/`updatedAt` | `DateTime` | Standard audit columns |

**Not stored**: truck information. A route's truck is never a column — it is read at render time
via `route.driver?.truckNumber` (research.md #6, FR-025, FR-040).

### Relation added to existing `Driver` model

```prisma
model Driver {
  // ...existing fields unchanged...
  routes Route[]
}
```

No other change to `Driver`.

### Validation rules (Zod, `src/features/routes/lib/validation.ts`)

- `clientId`: required; server re-checks the referenced `Client` exists and `status === "ACTIVE"`
  (FR-014) — a client that was deactivated between page load and submit is rejected, not silently
  accepted.
- `pickupAddress`, `deliveryAddress`: required, non-empty.
- `pickupAt`: required, valid datetime.
- `deliveryAt`: optional, valid datetime when present; no ordering check against `pickupAt` is
  enforced beyond what the admin enters (out of scope — spec does not require it).
- `driverId`: optional; when present, server re-checks the referenced `Driver` exists and
  `status === "ACTIVE"` (FR-014, FR-018) and runs the conflict check (research.md #4) before
  accepting it.
- `referenceNumber`, `notes`: optional, free text.
- `status` (manual override only, via `setRouteStatusAction`): one of `SCHEDULED | ASSIGNED |
  IN_PROGRESS | COMPLETED`; rejected if the route is currently `COMPLETED` or `CANCELLED`
  (FR-023). `CANCELLED` is reachable only through the dedicated cancel action, not this schema.

### State model (FR-017a/b/c, FR-020–FR-023, Clarifications session)

```
                 create (no driver)
                        │
                        ▼
                 ┌────────────┐   assign driver (auto)   ┌──────────┐
                 │ SCHEDULED  │ ────────────────────────▶ │ ASSIGNED │
                 └─────┬──────┘ ◀──────────────────────── └────┬─────┘
                       │          unassign driver (auto)        │
     admin sets status │ (any direction, any of the 3           │ admin sets status
     manually ─────────┴───── non-final statuses, freely) ──────┘ manually
                       │                                        │
                       ▼                                        ▼
                 ┌─────────────┐  admin sets status  ┌────────────────┐
                 │ IN_PROGRESS │ ◀──────────────────▶ │ (SCHEDULED /   │
                 └──────┬──────┘                      │  ASSIGNED)     │
                        │                              └────────────────┘
       admin marks      │      admin cancels (from any non-final status)
       complete         ▼                          │
                 ┌────────────┐                     ▼
                 │ COMPLETED  │              ┌─────────────┐
                 └────────────┘              │  CANCELLED  │
                  (final — locked)            └─────────────┘
                                               (final — locked)
```

- **Auto-sync** (`assignDriverAction` / `unassignDriverAction`): assigning a driver to a
  non-final route sets `status = ASSIGNED`; removing a driver without a replacement sets `status =
  SCHEDULED`. Both are blocked entirely if the route is already `COMPLETED`/`CANCELLED` (FR-023).
- **Manual override** (`setRouteStatusAction`): the administrator may set `status` to any of
  `SCHEDULED | ASSIGNED | IN_PROGRESS` at any time regardless of the current non-final status or
  current driver assignment, and to `COMPLETED` to close out the job. The next driver
  assign/unassign after a manual override re-applies the auto-sync rule above (no "sticky manual"
  state is tracked — research.md #3).
- **Cancellation** (`cancelRouteAction`): sets `status = CANCELLED` from any non-final status.
  Never deletes the row (FR-022, SC-004).
- **Final states** (`COMPLETED`, `CANCELLED`): once reached, `status`, `driverId`, and all core
  route fields (client, pickup/delivery details, dates, reference number, notes) are immutable —
  every mutating action re-checks `isFinalStatus` first and rejects (FR-023).

### Migration considerations

- Two new tables (`Client`, `Route`), two new enums (`ClientStatus`, `RouteStatus`), one new
  relation column (`Driver.routes` is a reverse relation — no column on `Driver` itself, since the
  foreign key lives on `Route.driverId`). Fully additive; no existing table or column changes.
- `Route.sequenceNumber` uses Prisma's `autoincrement()`, which Postgres backs with a `SERIAL`-style
  sequence — no manual sequence-management SQL needed in the migration.
