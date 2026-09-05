# Feature Specification: Timesheet Management

**Feature Branch**: `004-timesheet-management`

**Created**: 2026-09-04

**Status**: Draft

**Input**: User description: "Create a specification for the Timesheet Management feature. User Story 1, priority P1. As an administrator, I want to view and manage truck driver timesheets so that I can monitor weekly hours, review submissions, and keep driver time records accurate. UI Reference: use the provided timesheets screenshot (docs/ui/timesheets.png, docs/ui/add-timesheet.png) as the primary visual reference for layout and styling — page structure, summary card layout, driver submissions table, filters and action placement, spacing, typography, borders, and overall visual hierarchy. Business rules cover administrator-only access, a consistent sidebar, summary cards (total team hours, submitted timesheets, average daily hours), a driver submissions table (name, role/type, hours for the selected week, last submitted date/time, status), statuses (Submitted, Not Submitted, Draft), filters (driver, week/date range), an Add Timesheet action, a per-row action menu, viewing a driver's timesheet detail, full create/edit/delete of timesheet records, totals calculated from daily entries, and a clean, simple, responsive, design-system-consistent page. Acceptance scenarios cover viewing timesheets, filtering, viewing driver detail, managing (create/update/delete) entries with totals updating, and correct color-coded status display. Out of scope: driver self-service timesheet entry, timesheet approval workflow, payroll processing, invoice generation, GPS/location tracking, and advanced reporting/analytics."

## Clarifications

### Session 2026-09-04

- Q: Does an administrator take an explicit "Submit" action to move a timesheet to Submitted status, or is Submitted status automatically derived once all required days in the week have saved entries? → A: Status is fully automatic/derived: Not Submitted (no entries) → Draft (some but not all days have entries) → Submitted (all required days have entries). No explicit "Submit" action exists.
- Q: Can a driver have more than one daily entry for the same date within a timesheet (e.g., a split shift), or is each date limited to exactly one entry? → A: One entry per date. Adding a new entry for a date that already has one edits/replaces it rather than creating a second row.
- Q: How should the "Average daily hours" summary card be calculated? → A: Total hours ÷ total logged days — the sum of all hours across all daily entries in scope, divided by the count of daily entries (days actually logged) in scope.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Administrator Views and Manages Driver Timesheets (Priority: P1)

As an administrator, I want to view and manage truck driver timesheets so that I can monitor weekly hours, review submissions, and keep driver time records accurate.

**Why this priority**: This is the entire feature. Without it, administrators have no way to see how many hours drivers worked in a given week or to correct timesheet records, which is a core operational need for running the trucking business.

**Independent Test**: Sign in as an administrator, open the Timesheets page, and confirm summary metrics and a driver submissions table render; filter the table by driver and by week; open a driver's timesheet to see its daily entries; create, edit, and delete a timesheet record and confirm totals and status update accordingly.

**Acceptance Scenarios**:

1. **Given** an administrator opens the Timesheets page, **When** the page loads, **Then** summary metrics (total team hours, submitted timesheets, average daily hours) and the driver submissions table are displayed.
2. **Given** timesheet records exist, **When** the administrator filters by driver or by week/date range, **Then** only matching timesheet records are shown in the table and reflected in the summary metrics.
3. **Given** a driver has timesheet entries, **When** the administrator selects that driver, **Then** the driver's detailed daily timesheet entries for the selected week are displayed.
4. **Given** an administrator is viewing a timesheet, **When** they create, update, or delete a daily entry, **Then** the timesheet's total hours and status are recalculated and updated accordingly.
5. **Given** drivers have different timesheet states, **When** the page loads, **Then** each driver row displays its correct status (Submitted, Draft, or Not Submitted), with each status visually distinguished by a different color.

---

### Edge Cases

- What happens when a driver has no saved entries for the selected week? The row shows 0 hours logged, no last-submitted date/time, and a status of Not Submitted.
- What happens when a driver has some but not all daily entries saved for the selected week? The row shows the partial total and a status of Draft.
- What happens when the administrator applies a driver filter, a week filter, or both and no records match? The table shows an empty state instead of stale or unrelated rows, and summary cards reflect zero/blank values for that scope.
- What happens when the administrator deletes the last remaining daily entry in a timesheet? The timesheet's total hours become 0 and its status reverts to Not Submitted (or Draft, if the administrator has not removed the timesheet record itself).
- What happens when the administrator deletes an entire timesheet record (not just one entry)? The driver's row for that week reverts to Not Submitted with 0 hours and no last-submitted date/time.
- What happens when the administrator tries to view detail for a driver with zero entries for the selected week? The detail view opens and shows an empty daily breakdown rather than an error.
- What happens on smaller screens (tablet/mobile)? Summary cards, the filter row, and the table remain usable — stacking, scrolling, or condensing as needed — without breaking the page layout.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST restrict access to the Timesheets page to users with the administrator role; non-administrator users MUST NOT be able to view or reach this page's content.
- **FR-002**: The Timesheets page MUST use the same application sidebar and shell navigation as the rest of the admin area, with no layout deviations.
- **FR-003**: System MUST display summary cards for: total team hours, count of submitted timesheets (e.g., submitted vs. total expected), and average daily hours, each computed for the currently selected filter scope (driver/week). Average daily hours MUST be calculated as the sum of hours across all daily entries in scope divided by the count of daily entries (days actually logged) in scope, not by the number of drivers or calendar days.
- **FR-004**: System MUST display a driver submissions table listing, for each driver: driver name, driver role/type, hours logged for the selected week, last submitted date/time, and submission status.
- **FR-005**: System MUST support three submission statuses — Submitted, Not Submitted, and Draft — and MUST render each with a visually distinct color so they can be told apart at a glance.
- **FR-006**: System MUST provide a filter to narrow the driver submissions table to a specific driver.
- **FR-007**: System MUST provide a filter to narrow the driver submissions table to a specific week or date range.
- **FR-008**: System MUST update both the driver submissions table and the summary cards to reflect only the records matching the active filter(s).
- **FR-009**: System MUST provide an "Add Timesheet" action that lets the administrator create a new timesheet record for a driver.
- **FR-010**: System MUST provide a per-row action menu on the driver submissions table offering the available management operations for that driver's timesheet (at minimum: view, edit, delete).
- **FR-011**: System MUST let the administrator view a selected driver's detailed timesheet, including its individual daily entries for the selected week.
- **FR-012**: System MUST let the administrator create a new timesheet record (including its daily entry data) for a driver.
- **FR-013**: System MUST let the administrator edit an existing timesheet record and its daily entries.
- **FR-014**: System MUST let the administrator delete a timesheet record or an individual daily entry within one.
- **FR-014a**: System MUST allow at most one daily entry per date within a given timesheet; saving an entry for a date that already has one MUST replace the existing entry rather than create an additional one.
- **FR-015**: System MUST calculate a timesheet's total hours from the sum of its daily entries, and MUST recalculate that total immediately whenever a daily entry is created, edited, or deleted.
- **FR-016**: System MUST automatically derive a timesheet's submission status from its daily entries — Not Submitted (zero daily entries), Draft (at least one but not all required days of the week have entries), Submitted (all required days of the week have entries) — and MUST recompute this status immediately whenever entries change. There is no separate, explicit "Submit" action or approval step.
- **FR-017**: The Timesheets page MUST remain fully usable and responsive across desktop, tablet, and mobile screen sizes.
- **FR-018**: The Timesheets page's layout, summary card styling, table structure, filter and action placement, spacing, typography, and visual hierarchy MUST closely follow the reference screenshots (`docs/ui/timesheets.png`, `docs/ui/add-timesheet.png`).
- **FR-019**: System MUST NOT provide driver self-service timesheet entry, a timesheet approval workflow, payroll processing, invoice generation, GPS/location tracking, or advanced reporting/analytics as part of this feature.

### Key Entities

- **Driver Timesheet**: A single driver's time record for one week. Attributes: the driver it belongs to, the week/date range it covers, its list of daily entries, its total hours (derived), its submission status (derived), and the date/time it was last submitted.
- **Daily Entry**: One day's logged time within a driver timesheet. Attributes: the date, the hours worked (directly entered or derived from a start/end time), and the parent timesheet it belongs to. Each date within a timesheet has at most one daily entry; saving a new entry for a date that already has one replaces it rather than adding a second entry for that date.
- **Driver**: A person whose time is tracked on the Timesheets page. Attributes: name, role/type (e.g., the driver classification shown in the submissions table), and the truck assigned to them (every driver has exactly one truck assigned). Note: consistent with the reference screenshot, an administrator's own logged hours can also appear as a row in this table; an administrator has no assigned truck.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An administrator can open the Timesheets page and see summary metrics and driver submissions with no manual data assembly required.
- **SC-002**: Filtering by driver, by week, or by both returns only matching timesheet records 100% of the time, with no unrelated rows left visible.
- **SC-003**: An administrator can go from the Timesheets page to a specific driver's detailed daily entries in a single selection, with no dead ends or missing data for drivers that have entries.
- **SC-004**: 100% of create, edit, and delete actions on a timesheet or its daily entries result in the displayed total hours and status being correct immediately, without requiring a manual page refresh.
- **SC-005**: Every driver row shows one of exactly three statuses (Submitted, Draft, Not Submitted), each rendered in a distinct, consistent color, so an administrator can identify a driver's submission state without reading the text label.
- **SC-006**: The page remains fully usable (no broken layout, no inaccessible controls) when viewed at common desktop, tablet, and mobile widths.

## Assumptions

- A timesheet week runs Monday through Sunday, matching common weekly-payroll conventions and the "This week" filter shown in the reference screenshot.
- Status is fully automatic/derived, with no explicit "Submit" action: "Not Submitted" means a driver has zero saved daily entries for the selected week; "Draft" means at least one but not all required days of the week have a saved entry; "Submitted" means every required day of the week has a saved entry. Editing or deleting an entry immediately recomputes the status (e.g., removing an entry from a Submitted week can revert it to Draft or Not Submitted).
- The trend/comparison figures shown under each summary card in the reference screenshot (e.g., percentage change "vs last month") are a visual styling detail from the mockup, not a required business computation, since the business rules only call for total team hours, submitted timesheets, and average daily hours for the selected scope.
- "Last submitted date/time" reflects the most recent time the administrator saved that driver's timesheet for the selected week.
- Because driver self-service entry is out of scope, all timesheet creation, editing, and deletion in this feature is performed by the administrator on a driver's behalf; there is no separate driver-facing submission action.
- Deleting a whole timesheet record removes all of its daily entries and returns that driver/week to a Not Submitted state; deleting a single daily entry only affects that entry's parent timesheet's total and status.
- "Driver role/type" refers to the classification already used elsewhere in the system for a team member (e.g., a driver classification or "Administrator" for staff who also log hours), and this feature does not introduce new role/type values.
