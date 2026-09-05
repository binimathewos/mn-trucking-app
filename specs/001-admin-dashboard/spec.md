# Feature Specification: Administrator Dashboard

**Feature Branch**: `001-admin-dashboard`

**Created**: 2026-09-04

**Status**: Draft

**Input**: User description: "Create a specification for the initial Administrator Dashboard feature. Before defining the feature, inspect the provided dashboard screenshot and the applicable UI reference in docs/ui/. The dashboard screenshot is the visual source of truth. User Story 1 — P1: As an Administrator, I want to view a high-level operational dashboard so that I can quickly understand current driver activity, weekly hours, and container inventory. Includes the Administrator application shell (sidebar navigation, top navigation, logged-in user presentation), a dashboard header, three operational summary cards, a Container Inventory preview with search and Check In action, and mock dashboard data. Out of scope: timesheet management, container CRUD/persistence, actual check-in workflow, driver management, customer management, invoice management, reports, settings functionality, database persistence, and backend integrations."

## Clarifications

### Session 2026-09-04

- Q: What should happen when a Driver (or an unauthenticated visitor) tries to access the
  Administrator dashboard route? → A: Redirect away — unauthenticated visitors are sent to
  sign-in, and authenticated Drivers are redirected to their own area (or a driver placeholder);
  the Administrator dashboard never renders for them.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Operational Dashboard (Priority: P1)

As an Administrator, I want to view a high-level operational dashboard so that I can quickly
understand current driver activity, weekly hours, and container inventory as soon as I sign in.

**Why this priority**: This is the Administrator's landing experience and the first feature of
the application. Without it, there is no usable Administrator entry point, and no way to
validate the overall application shell that every future Administrator feature will be built
into.

**Independent Test**: Can be fully tested by signing in as an Administrator, landing on the
dashboard, and confirming that the application shell, header, summary cards, and container
inventory preview all render with data — without any other feature (Timesheets, Containers,
Drivers, Reports, Settings) being functionally implemented.

**Acceptance Scenarios**:

1. **Given** an Administrator has signed in, **When** the dashboard loads, **Then** the
   application shell is displayed with a sidebar containing Dashboard, Timesheets, Containers,
   Drivers, Reports, and Settings, plus company branding and the logged-in user's profile at the
   bottom of the sidebar.
2. **Given** the Administrator is on the dashboard, **When** the sidebar renders, **Then**
   "Dashboard" is visually indicated as the current/active page.
3. **Given** the Administrator is on the dashboard, **When** the top navigation renders, **Then**
   an avatar or initials representing the logged-in user is displayed.
4. **Given** the Administrator is on the dashboard, **When** the page header renders, **Then**
   it shows the current date, a personalized greeting using the Administrator's first name
   (e.g., "Good morning, Jordan"), and a short operational overview message (e.g., "Here's
   what's happening across your operation today.").
5. **Given** the Administrator is on the dashboard, **When** the operational summary loads,
   **Then** three summary cards are displayed showing Active Drivers (total count), Hours This
   Week (total recorded hours for the current week), and In Inventory (total containers
   currently in inventory), each with an icon, a primary value, a label, and supporting trend
   information.
6. **Given** the Administrator is on the dashboard, **When** the Container Inventory section
   loads, **Then** a limited, recent set of container rows is displayed (not the full
   inventory), each showing container number, customer, location, received date, storage
   duration, and status.
7. **Given** a container's status, **When** it is displayed in the Container Inventory list,
   **Then** it is visually represented as either "In Warehouse" or "Checked Out" using a clearly
   distinguishable status indicator.
8. **Given** the Container Inventory section, **When** the Administrator types into the
   container search field, **Then** the visible rows are filtered to containers matching the
   search text.
9. **Given** the Container Inventory section, **When** the Administrator activates the "Check
   In" action, **Then** the system presents the container check-in interaction entry point
   (without performing an actual persisted check-in, since that workflow is out of scope for
   this feature).
10. **Given** the Container Inventory section, **When** the Administrator activates "View
    inventory", **Then** the system navigates toward the full container inventory destination
    (which may be a placeholder page if the Containers feature is not yet implemented).
11. **Given** the Administrator clicks a sidebar item other than Dashboard (Timesheets,
    Containers, Drivers, Reports, Settings), **When** the navigation occurs, **Then** the
    application navigates to that section's page, which may be a placeholder if the
    corresponding feature has not yet been built.
12. **Given** the Administrator is viewing the dashboard on a tablet or mobile-sized screen,
    **When** the page renders, **Then** the application shell, header, summary cards, and
    container inventory preview all remain usable and legible without broken layout or hidden
    critical content.
13. **Given** a visitor is not signed in, **When** they attempt to access the Administrator
    dashboard route, **Then** they are redirected to sign-in and the Administrator dashboard
    never renders.
14. **Given** a signed-in Driver, **When** they attempt to access the Administrator dashboard
    route, **Then** they are redirected to their own area (or a driver placeholder) and the
    Administrator dashboard never renders.

### Edge Cases

- What happens when there are zero active drivers, zero hours this week, or zero containers in
  inventory? Summary cards MUST still render with a `0` value rather than an empty or broken
  state.
- What happens when the Container Inventory preview has no containers to show (e.g., an empty
  mock data set)? The system MUST show a clear empty state instead of an empty table.
- What happens when a container search returns no matches? The system MUST show a clear
  "no results" state rather than an empty table with no explanation.
- How does the system handle a very long customer name or container number in the inventory
  preview? Content MUST truncate or wrap without breaking the row layout.
- How does the greeting behave outside the morning? The greeting MUST reflect the appropriate
  time of day (morning, afternoon, evening) rather than always saying "Good morning."
- What happens when the sidebar is viewed on a narrow (mobile) screen? Navigation MUST remain
  reachable (e.g., collapsed or toggled) rather than disappearing or overlapping content.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide an Administrator application shell consisting of a sidebar
  navigation, a top navigation area, and a main content area.
- **FR-002**: Sidebar navigation MUST include exactly these items, in order: Dashboard,
  Timesheets, Containers, Drivers, Reports, Settings.
- **FR-003**: Sidebar MUST display company logo/branding and the logged-in user's profile (name
  and role) near the bottom of the sidebar.
- **FR-004**: Top navigation MUST display the logged-in user's avatar or initials.
- **FR-005**: System MUST visually indicate which sidebar item corresponds to the page the
  Administrator is currently viewing.
- **FR-006**: Selecting a sidebar item other than Dashboard MUST navigate to that section; if
  the section's feature has not yet been implemented, the system MUST navigate to a placeholder
  page rather than fail or do nothing.
- **FR-007**: Dashboard header MUST display the current date, a personalized greeting that
  includes the logged-in Administrator's first name, and a short operational overview message.
- **FR-008**: System MUST display three operational summary cards: Active Drivers (current
  total active driver count), Hours This Week (total driver hours recorded for the current
  week), and In Inventory (current total container count in inventory).
- **FR-009**: Each summary card MUST display an icon, a primary value, a label describing the
  metric, and supporting trend information relative to a prior period.
- **FR-010**: System MUST display a Container Inventory section showing a limited, recent subset
  of containers rather than the complete inventory.
- **FR-011**: Each row in the Container Inventory section MUST display container number,
  customer, location, received date, storage duration, and status.
- **FR-012**: Storage duration for each container MUST be derived from that container's
  relevant dates (e.g., received date and, when applicable, checked-out date) rather than being
  independently entered or hardcoded per row.
- **FR-013**: Container status MUST be shown with a clearly distinguishable visual indicator
  representing at minimum "In Warehouse" and "Checked Out."
- **FR-014**: System MUST provide a container search control that filters the displayed
  Container Inventory rows by matching search text.
- **FR-015**: System MUST provide a "Check In" action associated with the Container Inventory
  section that initiates the check-in interaction; the underlying check-in workflow and data
  persistence are out of scope for this feature.
- **FR-016**: System MUST provide row-level actions on Container Inventory rows where
  appropriate to the row's context.
- **FR-017**: System MUST provide a "View inventory" action that leads the Administrator toward
  the full container inventory destination, which may be a placeholder page if the full
  inventory feature has not yet been implemented.
- **FR-018**: System MUST render the dashboard, including the application shell, summary cards,
  and container inventory preview, using realistic mock data, without requiring database
  persistence or completed Driver, Timesheet, Customer, or Container features.
- **FR-019**: Mock data used for the dashboard MUST be structured by the entities described in
  Key Entities below, so it can later be replaced by real application data without redesigning
  the dashboard.
- **FR-020**: Dashboard layout MUST adapt for tablet and mobile viewport widths while preserving
  navigation access, content legibility, and control usability, in addition to closely matching
  the reference design at desktop widths.
- **FR-021**: All interactive elements on the dashboard (navigation items, search, Check In,
  row actions, View inventory) MUST be operable via keyboard and clearly indicate visual focus.
- **FR-022**: System MUST restrict the Administrator dashboard route to authenticated
  Administrators. An unauthenticated visitor MUST be redirected to sign-in, and an authenticated
  Driver MUST be redirected to their own area (or a driver placeholder); in neither case does
  the Administrator dashboard render.

### Key Entities

- **Administrator Profile**: The signed-in Administrator viewing the dashboard. Represented by
  first name, full name, role, and an avatar/initials representation.
- **Operational Summary**: The aggregate metrics shown in the summary cards — active driver
  count, total hours recorded for the current week, and total containers currently in
  inventory — each with a comparison trend value against a prior period.
- **Container Inventory Record**: A single container entry shown in the inventory preview,
  including container number, associated customer, current location, a required received date,
  an optional checked-out date (used to derive storage duration when present), computed storage
  duration, and status (e.g., In Warehouse, Checked Out).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An Administrator can determine current active driver count, weekly hours, and
  containers in inventory within 5 seconds of the dashboard finishing loading, without
  navigating away from the page.
- **SC-002**: 100% of sidebar navigation items visually communicate which page is currently
  active, verifiable by inspection of any dashboard or placeholder page.
- **SC-003**: An Administrator can locate a specific container in the inventory preview using
  search in under 10 seconds when the container is present in the mock data set.
- **SC-004**: The dashboard (shell, header, summary cards, and container inventory preview)
  remains fully usable — no overlapping content, no inaccessible controls, no horizontal
  scrolling of the page body — at common desktop, tablet, and mobile viewport widths.
- **SC-005**: An Administrator can reach any of the six primary sections (Dashboard,
  Timesheets, Containers, Drivers, Reports, Settings) from the dashboard shell in a single
  navigation action.
- **SC-006**: The dashboard is fully navigable and operable using only a keyboard, with a
  visible focus indicator on every interactive element.
- **SC-007**: 100% of attempts by an unauthenticated visitor or an authenticated Driver to open
  the Administrator dashboard route result in a redirect away from the dashboard, with the
  dashboard content never rendering for them.

## Assumptions

- The signed-in Administrator's identity (first name, full name, role, avatar/initials) comes
  from the authenticated session; for this feature it is treated as already available and is
  not itself being built here.
- "Active Drivers," "Hours This Week," and "In Inventory" values, along with their trend
  percentages, are populated from a mock/dummy data source for this feature, since Driver,
  Timesheet, and Container features are not yet implemented.
- The Container Inventory preview shows a small, fixed-size recent subset (matching the
  reference screenshot's presentation of a handful of rows out of the full inventory count);
  the exact subset size is a presentation detail, not a business rule, for this feature.
- The "Check In" action and per-row actions are present and interactive at the UI level for
  this feature, but do not persist data or perform the real container check-in workflow, which
  is explicitly out of scope.
- "View inventory" and the non-Dashboard sidebar items link to their respective sections; where
  those sections' features do not yet exist, they resolve to a placeholder page rather than a
  broken link.
- The visual design (dark sidebar, card styling, typography, spacing, status badges, etc.) is
  governed by the `docs/ui/dashboard.png` reference screenshot and the project constitution's UI
  Design System principle, and is not re-specified in detail here.
