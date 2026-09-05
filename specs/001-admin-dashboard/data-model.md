# Phase 1 Data Model: Administrator Dashboard

These shapes describe the data this feature consumes, sourced from mock data for now (per
FR-018/FR-019). They are intentionally shaped so a future feature can supply them from real
Driver, Timesheet, and Container data without changing the dashboard UI.

## SessionUser (sourced from Clerk; not defined/persisted by this feature)

Represents the signed-in visitor, as read from the authenticated session.

| Field | Type | Notes |
|---|---|---|
| firstName | string | Used in the header greeting (e.g., "Jordan") |
| fullName | string | Used in the sidebar profile |
| role | `"administrator" \| "driver"` | Drives the route-access decision (FR-022); read server-side from Clerk session claims, never trusted from the client |
| initials | string | Derived from name for the avatar; falls back gracefully if name parts are missing |

## OperationalSummary

The three summary-card metrics shown on the dashboard (FR-008, FR-009).

| Field | Type | Notes |
|---|---|---|
| activeDrivers.value | number (≥ 0) | Total currently active drivers |
| activeDrivers.trendPercent | number | Signed percentage vs. prior period |
| activeDrivers.trendDirection | `"up" \| "down" \| "flat"` | Drives the trend indicator's visual direction |
| hoursThisWeek.value | number (≥ 0) | Total driver hours recorded for the current week (Monday–Sunday) |
| hoursThisWeek.trendPercent | number | Signed percentage vs. prior period |
| hoursThisWeek.trendDirection | `"up" \| "down" \| "flat"` | |
| inInventory.value | number (≥ 0) | Total containers currently in inventory |
| inInventory.trendPercent | number | Signed percentage vs. prior period |
| inInventory.trendDirection | `"up" \| "down" \| "flat"` | |

**Validation rules**: all `value` fields are non-negative integers; `trendPercent` may be
negative (decline), zero, or positive.

## ContainerInventoryRecord

A single row in the Container Inventory preview (FR-010–FR-013).

| Field | Type | Notes |
|---|---|---|
| id | string | Stable identifier for the row (e.g., for row actions) |
| containerNumber | string | Business identifier shown to the Administrator (e.g., `MNKU-123456`); unique within the inventory |
| customerName | string | Customer associated with the container |
| location | string | Warehouse bay/location label (e.g., `Bay 04`) |
| receivedDate | ISO date string | Date the container was received; required |
| checkedOutDate | ISO date string \| null | Present only once the container has left; when null, storage duration is measured through "today" |
| status | `"in_warehouse" \| "checked_out"` | Drives the status badge (FR-013); `checked_out` implies `checkedOutDate` is present |

**Derived field (not stored)**: `storageDurationDays` — computed as whole calendar days between
`receivedDate` and (`checkedOutDate` ?? today). Not part of the stored/mock record itself, to
satisfy FR-012 and the constitution's "avoid duplicating data that can reliably be derived."
`receivedDate` is required on every record, so this derivation always has a valid input and
never needs a missing-value fallback.

**Relationships**: `customerName` and `location` are simple display strings for this feature —
they do not link to Customer or Container entities (those features do not exist yet). A future
Customer/Container feature can replace these strings with real relations without changing this
shape's consumers, as long as the same field names/types are produced.

## DashboardInventoryPreview (composed view, not a stored entity)

What the Container Inventory card actually renders: a bounded slice of
`ContainerInventoryRecord[]` (a small, fixed preview count per research.md/assumptions) plus the
total inventory count (for the "Showing N of M" and summary-card "In Inventory" value) and the
current search text (client-side UI state, not persisted).
