# Contract: Dashboard Data Source

This feature has no external API surface. Its "contract" is the TypeScript shape that any data
source — today's mock module, tomorrow's real query — must produce for the dashboard UI to
render correctly, per data-model.md.

## `getOperationalSummary(): OperationalSummary`

Returns the three summary-card metrics described in data-model.md
(`activeDrivers`, `hoursThisWeek`, `inInventory`), each with `value`, `trendPercent`, and
`trendDirection`.

- MUST return non-negative integer `value`s.
- MUST NOT throw for an empty operation (all `value`s may be `0`); the UI renders zero states,
  not an error, when values are `0` (see spec.md Edge Cases).

## `getContainerInventoryPreview(searchText?: string): { records: ContainerInventoryRecord[]; totalCount: number }`

Returns the bounded preview slice (and total inventory count) the Container Inventory card
renders.

- `records` MUST be a small, fixed-size subset (not the full inventory) when `searchText` is
  omitted or empty.
- When `searchText` is provided, `records` MUST contain only entries whose `containerNumber` or
  `customerName` match the search text (case-insensitive substring match); MAY be empty when
  nothing matches — the UI renders a "no results" state in that case, not an error.
- `totalCount` MUST reflect the full inventory size, independent of any active search filter,
  so the summary card and "Showing N of M" / "View inventory" affordances stay consistent.
- Every returned record's `storageDurationDays` (when displayed) MUST be derived at read time
  per data-model.md, not stored on the record.

## Consumer expectation

Dashboard components (`summary-cards.tsx`, `container-inventory-card.tsx`) call only these two
functions to obtain data — never the mock module's internal constants directly — so a future
feature can replace the mock implementation with a real one (e.g., backed by Prisma) behind the
same two function signatures without changing any component.
