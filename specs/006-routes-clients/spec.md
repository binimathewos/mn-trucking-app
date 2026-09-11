# Feature Specification: Routes & Client Management

**Feature Branch**: `006-routes-clients`

**Created**: 2026-09-11

**Status**: Draft

**Input**: User description: "Add a new Routes feature to the MN Trucking application. Add Routes to the main sidebar navigation between Containers and Drivers. Allow ADMIN users to create and manage trucking jobs/routes, manage clients, and assign routes to drivers. A Route represents a delivery/transport job performed for a client, with a unique route/job number, client, pickup/delivery locations and times, an optional assigned driver, a load/container/reference number, job instructions/notes, and a status (SCHEDULED, ASSIGNED, IN_PROGRESS, COMPLETED, CANCELLED). Trucks are never stored or assigned directly on a Route; truck information is derived from the assigned driver's existing truck assignment (Route → Driver → Truck). Provide a /routes page (view, search, filter by status/driver/client/date, create, edit, assign/reassign driver, update status, view details, cancel without hard-deleting) and a /clients management page (not in the sidebar, linked from Routes) supporting view/search, add, edit, and activate/deactivate of reusable client records, plus a quick-add-client flow from within route creation that preserves in-progress route form data. Only ACTIVE drivers may be assigned to routes, and obvious conflicting driver assignments should be prevented where practical. ADMIN has full route and client management; DRIVER can only view routes assigned to them and cannot manage routes or clients. All authorization must be enforced server-side."

## Clarifications

### Session 2026-09-11

- Q: When a driver is assigned to or unassigned from a route, should the route's status change automatically, and can the administrator freely override the status at any time? → A: Status auto-syncs with driver presence (ASSIGNED when a driver is assigned, SCHEDULED when none), and the administrator can still manually set any non-final status at any time (including moving it back to SCHEDULED or ahead to IN_PROGRESS); the next assign/unassign will re-sync ASSIGNED/SCHEDULED again.
- Q: Since delivery date/time is optional, how should the system determine a driver's "busy window" for conflict detection when a route has no delivery date/time set? → A: Skip the check — conflict detection only runs when both the route being assigned and the driver's other non-final route have a delivery date/time set; routes missing a delivery date/time are never checked against for overlap.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Administrator Creates and Views Routes (Priority: P1)

As an administrator, I want to create a route/job record for a client and see all routes in one place so that every delivery job the company performs is tracked from the moment it is scheduled.

**Why this priority**: This is the foundation of the entire feature. Nothing else — assignment, status tracking, cancellation, filtering — has meaning until routes can be created and viewed.

**Independent Test**: Sign in as an administrator, open the Routes page, create a route for an existing active client with pickup/delivery details and no driver yet, and confirm it appears in the routes table with status reflecting "no driver assigned."

**Acceptance Scenarios**:

1. **Given** at least one active client exists, **When** the administrator opens the Routes page, **Then** a table of all routes is displayed showing route number, client, pickup, delivery, driver, pickup date, status, and row actions.
2. **Given** no routes exist yet, **When** the administrator opens the Routes page, **Then** a clear empty state is shown instead of a blank table.
3. **Given** the administrator opens "Create route" and submits a client, pickup address, delivery address, and pickup date/time without selecting a driver, **When** submission succeeds, **Then** a new route is created with a unique, system-generated route number, status reflects that no driver is assigned, and the route appears in the table without a manual page reload.
4. **Given** the administrator submits the create-route form missing a required field (client, pickup address, delivery address, or pickup date/time), **When** they attempt to submit, **Then** validation errors are shown and no route is created.
5. **Given** the administrator opens "View details" for a route, **When** the details view opens, **Then** all recorded information for that route is displayed, including derived truck information from the assigned driver when one is assigned.
6. **Given** an administrator edits an existing route's pickup/delivery details, load/reference number, or notes and saves, **When** the save succeeds, **Then** the updated values are reflected in the table and details view.

---

### User Story 2 - Administrator Assigns and Reassigns a Driver (Priority: P1)

As an administrator, I want to assign an available driver to a route and change that assignment later so that jobs get covered and reassigned as circumstances change.

**Why this priority**: Getting a job to a driver is the core operational purpose of a route; without reliable assignment, the feature does not deliver its main value.

**Independent Test**: Create a route with no driver, assign an active driver to it, confirm the route's status and driver column update, then reassign it to a different active driver and confirm the change is reflected with no duplicate or orphaned assignment.

**Acceptance Scenarios**:

1. **Given** a route with no assigned driver, **When** the administrator assigns an active driver, **Then** the route shows that driver, the route's status updates to reflect it is assigned, and the derived truck information (if the driver has one) becomes visible on the route.
2. **Given** the administrator attempts to assign a driver whose status is not active, **When** they attempt the assignment, **Then** the assignment is rejected with a clear message and the route's driver is unchanged.
3. **Given** a route already has an assigned driver, **When** the administrator reassigns it to a different active driver, **Then** the route reflects only the new driver and no record of a simultaneous double-assignment is created.
4. **Given** a driver is already assigned to another route whose pickup-to-delivery window overlaps the route being assigned, **When** the administrator attempts to assign that same driver, **Then** the system blocks the conflicting assignment and clearly explains why.
5. **Given** a route has a completed or cancelled status, **When** the administrator attempts to change its assigned driver, **Then** the change is rejected because the route is in a final state.
6. **Given** a driver already has another non-final route that overlaps in pickup date but either that route or the route being assigned has no delivery date/time recorded, **When** the administrator assigns that driver, **Then** the assignment is allowed because the overlap check only applies when both routes have a delivery date/time.

---

### User Story 3 - Driver Access Is Restricted to Their Own Routes (Priority: P1)

As the business, I need a signed-in driver to see only the routes assigned to them and be unable to create, edit, or manage any route or client so that operational and client data stays protected and drivers are not confused by jobs that are not theirs.

**Why this priority**: This is a hard security boundary spanning both new resource types (routes and clients). If a driver could reach route or client management, or see other drivers' jobs, the rest of this feature's guarantees would be meaningless.

**Independent Test**: Sign in as a driver-role user, confirm the routes view shows only routes assigned to that driver, and separately attempt to invoke a route-management or client-management action directly; confirm both are denied server-side.

**Acceptance Scenarios**:

1. **Given** a signed-in driver with one or more routes assigned to them, **When** they view their routes, **Then** they see only routes where they are the assigned driver, never routes assigned to other drivers or unassigned routes.
2. **Given** a signed-in driver, **When** they attempt to create, edit, cancel, or change the status of any route by directly invoking the underlying action (bypassing the UI), **Then** the action is rejected regardless of any role information supplied by the client.
3. **Given** a signed-in driver, **When** they attempt to access client management or any client-management action, **Then** access is denied.
4. **Given** a signed-in driver, **When** they attempt to view the details of a route not assigned to them by directly requesting it, **Then** access is denied.

---

### User Story 4 - Administrator Manages Route Status and Cancellation (Priority: P2)

As an administrator, I want to move a route through its lifecycle and cancel it if the job falls through, without losing the job record, so that operational history and reporting stay accurate.

**Why this priority**: Status is what makes the routes table operationally useful (knowing what is scheduled vs. in progress vs. done), and preserving cancelled jobs is an explicit business requirement, but this builds on top of creation and assignment already being possible.

**Independent Test**: Advance a route through its statuses, then cancel a different route and confirm it remains visible in the table and details view with a cancelled status rather than disappearing.

**Acceptance Scenarios**:

1. **Given** an unassigned, scheduled route, **When** the administrator manually updates its status, **Then** the new status is saved and reflected in the table.
2. **Given** any route that is not already completed or cancelled, **When** the administrator cancels it, **Then** its status becomes cancelled, the record remains visible in the routes table and details view, and no data is deleted.
3. **Given** a route that is already completed or cancelled, **When** the administrator attempts to cancel it again or change its status, **Then** the action is rejected because the route is already in a final state.
4. **Given** a route's status is updated, **When** the update succeeds, **Then** the table and any open details view reflect the new status without a manual page reload.

---

### User Story 5 - Administrator Manages Clients (Priority: P2)

As an administrator, I want to maintain a reusable list of clients — separate from any single route — so that client information is entered once and reused across many jobs instead of retyped every time.

**Why this priority**: Routes cannot be created without a client to attach them to, but the client list itself is a supporting/reference capability rather than the primary workflow, so it ranks just behind route creation and assignment.

**Independent Test**: From the Routes page, open client management, add a new client, edit that client's details, and deactivate it; confirm the deactivated client no longer appears as selectable for new routes but any existing routes referencing it are unaffected.

**Acceptance Scenarios**:

1. **Given** the administrator is on the Routes page, **When** they select "Manage clients," **Then** they are taken to a client management page listing all clients with search.
2. **Given** the administrator submits a valid company name and contact details for a new client, **When** submission succeeds, **Then** the client is created as active and immediately selectable in route forms.
3. **Given** the administrator edits an existing client's contact details, **When** the save succeeds, **Then** the updated details apply to that client going forward and existing routes referencing the client are unaffected.
4. **Given** an active client, **When** the administrator deactivates it, **Then** it no longer appears as a selectable option for new or edited routes, but routes that already reference it continue to display its information normally.
5. **Given** an inactive client, **When** the administrator reactivates it, **Then** it becomes selectable again for routes.
6. **Given** the administrator is creating a route and the client they need does not yet exist, **When** they use the quick-add-client option, add the new client, and return to the route form, **Then** the previously entered route fields (pickup, delivery, dates, notes, etc.) are still present and the newly created client is selected.

---

### User Story 6 - Administrator Searches and Filters Routes (Priority: P3)

As an administrator, I want to search and filter the routes list so that I can quickly find a specific job or a relevant subset of jobs as the list grows.

**Why this priority**: This is an efficiency enhancement on top of the core viewing capability delivered in User Story 1; the feature is usable without it for a small number of routes, but becomes necessary as volume grows.

**Independent Test**: With multiple routes in different statuses, assigned to different drivers and clients, apply a status filter, then a driver filter, then a date filter, and confirm the table narrows correctly each time; then search by route number and confirm only the matching route is shown.

**Acceptance Scenarios**:

1. **Given** routes with different statuses exist, **When** the administrator filters by status, **Then** only routes matching that status are shown.
2. **Given** routes assigned to different drivers (and some unassigned), **When** the administrator filters by driver, **Then** only routes matching that driver (or explicitly "unassigned") are shown.
3. **Given** routes for different clients, **When** the administrator filters by client, **Then** only routes for that client are shown.
4. **Given** routes with different pickup dates, **When** the administrator filters by a date or date range, **Then** only routes with a matching pickup date are shown.
5. **Given** the administrator searches by route number, client name, or reference number, **When** a search term is entered, **Then** only matching routes are shown.
6. **Given** filters and a search term together match no routes, **When** the administrator applies them, **Then** a distinct no-results state is shown, not an empty table with no explanation.

---

### Edge Cases

- What happens when an administrator creates a route without selecting a driver? The route is created successfully in an unassigned state and can be assigned later.
- What happens when an administrator tries to assign an inactive driver? The assignment is rejected with a clear message; the route's driver is unchanged.
- What happens when an administrator tries to assign a driver who already has an overlapping route in a non-final status? The assignment is blocked with a clear explanation of the conflicting route, provided both routes being compared have a delivery date/time recorded; if either route lacks one, the overlap check is skipped for that pair and the assignment is allowed.
- What happens when an administrator tries to change the status or driver of a completed or cancelled route? The change is rejected because the route is in a final state.
- What happens when an administrator cancels a route? The route's status becomes cancelled; the record and its full history remain visible and are never hard-deleted.
- What happens when a client used by existing routes is deactivated? Existing routes keep displaying that client's information normally; the client simply stops appearing as a selectable option for new or edited routes.
- What happens when an administrator adds a client mid-route-creation via quick-add? All route fields entered so far are preserved, and the new client becomes the selected client once created.
- What happens when a driver who is assigned to one or more non-final routes is deactivated as a driver? Those existing route assignments are left unchanged (the historical assignment is preserved), but that driver can no longer be selected for any new or reassigned route while inactive.
- What happens when a driver-role user attempts to view, create, edit, or act on a route not assigned to them, or on client data, whether through the UI or by directly invoking the underlying action? The attempt is denied server-side regardless of what the client claims about the user's role.
- What happens when route search/filter criteria match nothing? A distinct no-results state is shown instead of an empty, unexplained table.
- What happens when route or client data cannot be loaded? A clear error state is shown instead of a blank or partially rendered page.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST restrict route creation, route editing, driver assignment/reassignment, route status changes, route cancellation, and all client management to users with the administrator role, enforced on the server independent of, and in addition to, any UI-level hiding of controls.
- **FR-002**: System MUST reject any route-management or client-management action attempted by a non-administrator, including direct invocation that bypasses the visible UI, regardless of role information supplied by the client.
- **FR-003**: System MUST restrict a driver-role user's view of routes to only those routes where they are the currently assigned driver, both in any list view and when a specific route is requested directly.
- **FR-004**: "Routes" MUST appear in the main sidebar navigation, positioned between "Containers" and "Drivers," visible only to the administrator role, consistent with existing navigation's role-based visibility.
- **FR-005**: The Routes page MUST be reachable at `/routes` and MUST use the existing application sidebar, top navigation, and page-header *visual* conventions used by other administrator pages (this governs layout/styling only — per FR-003/US3, `/routes` itself must remain reachable by a signed-in driver, so it MUST NOT be placed behind admin-only access gating).
- **FR-006**: The Routes page MUST display a table of routes with, at minimum: route number, client, pickup location, delivery location, assigned driver (or an explicit "unassigned" indicator), pickup date/time, status, and a row-level actions control.
- **FR-007**: System MUST support filtering the routes list by status, by driver (including an "unassigned" option), by client, and by pickup date or date range.
- **FR-008**: System MUST support searching routes by route number, client name, and load/reference number.
- **FR-009**: System MUST show a distinct empty state when no routes exist at all, and a distinct no-results state when an applied filter or search matches no routes.
- **FR-010**: System MUST show a loading state while route data is being retrieved and an error state if it cannot be retrieved.
- **FR-011**: System MUST provide a "Create route" action collecting: client (required, selected from active clients), pickup location/address (required), delivery location/address (required), pickup date/time (required), delivery date/time or appointment (optional), assigned driver (optional, selected from active drivers only), load/container/reference number (optional), and job instructions/notes (optional).
- **FR-012**: System MUST generate a unique route/job number automatically for every created route; the route number MUST NOT be manually entered and MUST NOT collide with any existing route's number.
- **FR-013**: System MUST NOT include a truck-selection control anywhere in the route create or edit form.
- **FR-014**: System MUST validate, on the server, that the selected client exists and is active, that pickup and delivery locations and the pickup date/time are present, and that any selected driver exists and is active, rejecting the request with a clear message if any check fails.
- **FR-015**: On successful route creation, System MUST assign a system-generated route status appropriate to whether a driver was selected (unassigned vs. assigned), persist the route, refresh the routes list without a manual page reload, and show success feedback.
- **FR-016**: System MUST allow the administrator to edit an existing route's client, pickup/delivery details, dates, load/reference number, and notes, provided the route is not in a completed or cancelled status.
- **FR-017**: System MUST allow the administrator to assign a driver to an unassigned route, and to reassign an already-assigned route to a different driver, in both cases restricted to drivers with active status.
- **FR-017a**: When a driver is assigned to a route that has no other administrator-chosen non-final status already set beyond the default, System MUST automatically set that route's status to ASSIGNED; when a driver is removed from a route (unassigned) without a replacement, System MUST automatically set that route's status to SCHEDULED. These automatic transitions apply only to non-final routes.
- **FR-017b**: A manual status override (FR-021) does not suppress future auto-sync: the next driver assignment or unassignment on that route MUST still re-apply the ASSIGNED/SCHEDULED auto-sync in FR-017a, regardless of any status the administrator set manually in between.
- **FR-017c**: System MUST allow the administrator to remove an assigned driver from a non-final route without selecting a replacement, returning the route to an unassigned state (subject to the auto-sync to SCHEDULED in FR-017a).
- **FR-018**: System MUST reject any attempt to assign a driver whose status is not active, with a clear message, leaving the route's existing assignment (if any) unchanged.
- **FR-019**: System MUST prevent assigning a driver to a route when that driver is already assigned to a different route, not in a completed or cancelled status, whose pickup-to-delivery time window overlaps the route being assigned, and MUST clearly identify the conflicting route in the rejection. This overlap check MUST run only when both the route being assigned and the driver's other non-final route have a delivery date/time recorded; if either route lacks a delivery date/time, the pair MUST NOT be checked against each other for overlap.
- **FR-020**: System MUST support the route statuses SCHEDULED, ASSIGNED, IN_PROGRESS, COMPLETED, and CANCELLED, used consistently across creation, editing, filtering, and display.
- **FR-021**: System MUST allow the administrator to manually update a route's status to any non-final status (SCHEDULED, ASSIGNED, IN_PROGRESS) at any time, and to COMPLETED, provided the route is not already in a completed or cancelled status; no forward-only ordering is enforced among the non-final statuses.
- **FR-022**: System MUST allow the administrator to cancel a route that is not already completed or cancelled; cancellation MUST set its status to CANCELLED and MUST NOT delete the route record or any of its data.
- **FR-023**: System MUST reject any attempt to change the status, driver assignment, or core details of a route that is already in a completed or cancelled status, since these are final states.
- **FR-024**: System MUST provide a route details view showing all recorded route information, including the assigned driver's derived truck information (when a driver is assigned and has a truck), without storing or duplicating truck data on the route itself.
- **FR-025**: System MUST derive any truck information shown for a route by reading it from the currently assigned driver's own record at the time of display; if the route has no assigned driver, or the assigned driver has no truck, System MUST show a clear "no truck" indication rather than a fabricated value.
- **FR-026**: The Routes page MUST provide a "Manage clients" link or button that navigates to `/clients`.
- **FR-027**: The Clients page MUST be reachable at `/clients`, MUST NOT appear in the main sidebar navigation, and MUST be accessible only to the administrator role, enforced server-side.
- **FR-028**: The Clients page MUST display a searchable list of clients showing, at minimum: company name, contact name, phone, email, and status.
- **FR-029**: System MUST provide an "Add client" action collecting company name (required), contact name (required), phone (required), email (required), and address (required); a newly created client MUST default to active status.
- **FR-030**: System MUST validate, on the server, that required client fields are present and that email and phone are in a valid format, rejecting the request with a clear message otherwise.
- **FR-031**: System MUST allow the administrator to edit an existing client's company name, contact name, phone, email, and address.
- **FR-032**: System MUST allow the administrator to activate or deactivate a client; System MUST NOT provide a hard-delete action for clients.
- **FR-033**: An inactive client MUST NOT be selectable when creating or editing a route, but MUST continue to display normally on any route created before it was deactivated.
- **FR-034**: Route create and edit forms MUST offer only active clients in the client-selection control.
- **FR-035**: System MUST provide a way to add a new client from within the route creation flow (quick-add) such that, once the new client is created, the administrator returns to the in-progress route form with all previously entered route field values intact and the newly created client selected.
- **FR-036**: The Routes and Clients pages and their dialogs MUST remain fully usable and responsive at desktop, tablet, and mobile viewport sizes.
- **FR-037**: The Routes and Clients pages MUST follow the same visual language (page headers, cards, tables, dialogs, buttons, status badges, form components, spacing, and typography) already established by the application's other administrator pages.
- **FR-038**: System MUST NOT use hard-coded or mock route, client, or driver data once this feature is wired to real data; all displayed values MUST originate from actual application data.
- **FR-039**: All route-management and client-management mutations MUST require the requester to be authenticated, in addition to the administrator-role check in FR-001.
- **FR-040**: System MUST NOT introduce a separate Truck record or duplicate driver or client data directly on the Route record; route data MUST reference its client and (optionally) its driver by relationship rather than by copying their fields.

### Key Entities

- **Route**: A delivery/transport job performed for a client. Attributes: system-generated unique route/job number, pickup location/address, delivery location/address, pickup date/time, delivery date/time or appointment (optional), load/container/reference number (optional), job instructions/notes (optional), and status (SCHEDULED, ASSIGNED, IN_PROGRESS, COMPLETED, or CANCELLED). Relationships: belongs to exactly one Client; optionally assigned to one Driver. A Route never stores truck data directly — truck information, when needed, is read from its assigned Driver. Routes are never hard-deleted; CANCELLED is a preserved terminal status.
- **Client**: A reusable company/customer record that routes are performed for. Attributes: company name, contact name, phone, email, address, and status (ACTIVE or INACTIVE). Relationship: a Client can have many Routes. Clients are never hard-deleted, only deactivated.
- **Driver (existing)**: Referenced, not redefined, by this feature. A Route's assigned driver must be an existing active Driver. Truck information shown for a route is derived from this existing Driver record's own truck assignment; this feature introduces no new truck data.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An administrator can create a fully valid route — including one with no driver yet assigned — in a single guided flow without needing to leave the Routes page.
- **SC-002**: 100% of attempts to assign an inactive driver to a route are rejected, and no route ever ends up assigned to an inactive driver.
- **SC-003**: 100% of attempts to assign a driver to two overlapping, non-final routes that both have a delivery date/time recorded are blocked before the conflicting assignment is saved.
- **SC-004**: Cancelling a route never removes it from the system: 100% of cancelled routes remain visible in the routes table and details view afterward.
- **SC-005**: An administrator can add a brand-new client while creating a route and return to that route with zero previously entered fields lost, every time.
- **SC-006**: A driver-role user can never view or act on a route not assigned to them, or reach client management, verified through both direct navigation and direct action attempts.
- **SC-007**: An administrator can narrow a large routes list to a specific job using status, driver, client, or date filters, or a text search, without a full page reload.
- **SC-008**: The Routes and Clients pages remain fully usable, with no broken layout or inaccessible controls, at common desktop, tablet, and mobile widths.

## Assumptions

- No reference screenshots exist yet for Routes or Clients pages (unlike other features documented under `docs/ui/`). Implementation will follow the same established visual patterns (page headers, summary/table layout, dialogs, status badges) already used by the Containers and Drivers pages rather than a new screenshot-driven design.
- The route/job number is system-generated and unique (e.g., a sequential identifier), not manually typed by the administrator, since the feature only specifies that it must be unique and does not describe a required format. The separate "load/container/reference number" field remains a free-text field the administrator enters, distinct from the system-generated route number.
- Pickup date/time is required because scheduling, filtering by date, and driver conflict detection all depend on it. Delivery date/time is treated as an optional appointment/estimate, consistent with real-world trucking jobs where a firm delivery time is not always known at creation time.
- "Prevent obvious conflicting driver assignments where practical" is interpreted as: a driver cannot be assigned to a route whose pickup-to-delivery window overlaps another non-final (not completed/cancelled) route already assigned to that same driver. This is a straightforward, checkable overlap rule rather than a full logistics/routing optimization, consistent with "where practical." Per the Clarifications session, this check only runs when both routes being compared have a delivery date/time recorded; a route with no delivery date/time is never checked against for overlap (in either direction), so it is possible for a driver to be assigned to two same-day routes when one or both omit a delivery date/time.
- COMPLETED and CANCELLED are treated as final statuses: once a route reaches either, its status, driver assignment, and core job details can no longer be changed, which is how the job record is preserved intact per the "do not hard-delete" requirement. An administrator who needs to correct a finalized route's data does so outside this feature's scope (e.g., a future correction/audit workflow), since none is described here.
- Route status auto-syncs with driver presence at creation and on every assign/unassign (ASSIGNED when a driver is present, SCHEDULED when none) per the Clarifications session, and the administrator can always manually override to any non-final status; no other automatic status-transition triggers (e.g., GPS, time-based) are in scope.
- Deactivating a driver (an existing capability outside this feature) does not retroactively remove that driver from routes already assigned to them; it only removes that driver from being selectable for new or reassigned routes while inactive, mirroring how deactivating a client does not affect that client's existing routes.
- Truck information for a route is presented as read-only, informational data pulled from the assigned driver's existing truck-assignment field at display time; this feature does not add a Truck entity or any new truck-related data storage, per the explicit instruction to keep truck data solely on the Driver side.
- Client fields (company name, contact name, phone, email, address) are all treated as required on creation for a usable, contactable client record, since the feature description lists them as the client's core information without marking any as optional.
- "Search routes" covers route number, client company name, and the load/reference number, since these are the natural identifiers an administrator would use to locate a specific job; free-text search of notes/instructions is not required.
- No client history/audit log is required, per explicit instruction; deactivation/reactivation simply flips the client's current status with no separate change history.
