# Contracts: Driver Management

This feature exposes no public HTTP API — like `src/features/timesheets/actions/`, its interface
surface is a set of Next.js Server Actions (`"use server"`), each independently re-checking
administrator authorization (constitution §9; see `assertAdminAccess` precedent in
`timesheet-actions.ts`) before validating its input with Zod and touching Prisma/Clerk. All
actions live in `src/features/drivers/actions/driver-actions.ts` and throw on
authorization/validation/business-rule failure — the caller (a dialog's submit handler) turns a
thrown error into the visible form/toast error state.

Every action below performs, first and unconditionally: re-check administrator role
(`resolveAdminOnlyAccess`) → throw if not administrator (FR-001, FR-002, SC-005).

## `getDriverDirectory(filters?): Promise<DriverDirectoryResult>`

Not a Server Action (no mutation) — a data-access function called from the Server Component route
(`src/features/drivers/data/driver-repository.ts`), used directly by `page.tsx`.

**Input**:
```ts
interface DriverDirectoryFilters {
  status?: "ACTIVE" | "INACTIVE" | "ON_LEAVE";
  search?: string; // matched against name, case-insensitive
}
```

**Output**:
```ts
interface DriverDirectoryResult {
  stats: { totalDrivers: number; activeToday: number; onLeave: number };
  drivers: DriverRow[];
}

interface DriverRow {
  id: string;
  name: string;
  initials: string;
  email: string;
  phone: string | null;
  driverClass: string;           // Driver.roleType
  truckNumber: string | null;
  status: "ACTIVE" | "INACTIVE" | "ON_LEAVE";
  lastActivity: string | null;    // ISO timestamp from Clerk lastSignInAt, or null = "not yet active"
}
```

**Behavior**: Reads all `DRIVER`-role `User`+`Driver` rows (`stats` are always computed over the
*unfiltered* set — FR-006), applies `filters` for the returned `drivers` list only, then merges in
`lastSignInAt` via one `clerkClient.users.getUserList({ userId: [...] })` call keyed by
`clerkUserId` (research.md #4). Throws (surfaced by `page.tsx`'s `error.tsx` boundary) if either
the database query or the Clerk call fails (FR-011).

## `addDriverAction(input: unknown): Promise<{ driverId: string }>`

**Input** (validated by `addDriverInputSchema`, Zod):
```ts
{
  fullName: string;          // required, non-empty
  email: string;              // required, valid email
  temporaryPassword: string;   // required, min length pre-check (research.md #3)
  phone?: string;               // optional, valid phone format if present
  driverClass?: string;          // optional, one of the fixed label set
  truckNumber?: string;           // optional
}
```

**Behavior** (FR-016/FR-017, research.md #7):
1. Validate input; on failure, throw a Zod-derived field-error map.
2. If `truckNumber` provided, check no other non-`INACTIVE` `Driver` already holds it (FR-021);
   throw a clear conflict error if so.
3. `provisionDriverAccount({ email, password: temporaryPassword, name: fullName })` → creates the
   Clerk user with `publicMetadata.role = "driver"`, email pre-verified (research.md #2). A
   Clerk-side duplicate-email or weak-password rejection is caught and re-thrown as the
   corresponding actionable field error (FR-015, FR-014) — no local writes have happened yet.
4. `prisma.$transaction([...])`: create `User` (`clerkUserId`, `name`, `email`, `role: DRIVER`)
   and `Driver` (`roleType: driverClass ?? ""`, `phone`, `truckNumber`, `status: ACTIVE`) together.
5. On step 4 failure: call `clerkClient.users.deleteUser(clerkUserId)` to compensate; if that also
   fails, log the orphaned `clerkUserId` and throw an error that tells the administrator manual
   cleanup may be needed (research.md #7) — otherwise throw the plain actionable error.
6. On success: `revalidatePath("/drivers")`, return `{ driverId }`.

## `updateDriverAction(input: unknown): Promise<void>`

**Input** (validated by `updateDriverInputSchema`, Zod):
```ts
{
  driverId: string;             // required
  fullName: string;              // required
  phone?: string;                 // optional
  driverClass?: string;            // optional
  truckNumber?: string;             // optional
  status: "ACTIVE" | "INACTIVE" | "ON_LEAVE";
}
```
`email` is intentionally **not** an accepted field (FR-019/FR-020 — read-only, enforced by simply
never writing it here, not by a runtime rejection of an extra field).

**Behavior** (FR-018–FR-022):
1. Validate input.
2. If `truckNumber` changed and is non-null, check uniqueness against other non-`INACTIVE`
   drivers (FR-021), excluding the driver being edited.
3. If `status` is changing to/from `INACTIVE`, follow the same Clerk `banUser`/`unbanUser` +
   truck-release steps as `setDriverStatusAction` below (an edit-dialog status change and a
   row-action status change are the same underlying transition — see data-model.md state diagram).
4. Update the `User.name` and `Driver` row in one `prisma.$transaction`.
5. `revalidatePath("/drivers")`.

## `setDriverStatusAction(input: { driverId: string; status: "ACTIVE" | "INACTIVE" }): Promise<void>`

Powers the row-actions menu's "Deactivate"/"Reactivate" shortcuts (FR-023, FR-025) — a thin
wrapper that only ever toggles `ACTIVE ⇄ INACTIVE` (not `ON_LEAVE`, which is edit-dialog-only per
the state diagram in data-model.md).

**Behavior**:
1. Load the target `Driver` (404-equivalent throw if missing).
2. If transitioning to `INACTIVE`: set `status = INACTIVE`, `truckNumber = null` (FR-024), call
   `clerkClient.users.banUser(clerkUserId)`.
3. If transitioning to `ACTIVE`: set `status = ACTIVE`, call
   `clerkClient.users.unbanUser(clerkUserId)`. Truck assignment is left as-is (already `null` from
   step 2, unless subsequently edited).
4. `revalidatePath("/drivers")`.

## Error shape (all actions)

Thrown errors carry a `message` safe to show directly to the administrator (constitution §12 — no
sensitive implementation details) and, for validation failures, a field-keyed map so the form can
highlight the specific offending input. No action ever includes the temporary password in a
thrown error, a log line, or a return value (FR-032).
