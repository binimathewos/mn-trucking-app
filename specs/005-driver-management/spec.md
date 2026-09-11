# Feature Specification: Driver Management

**Feature Branch**: `005-driver-management`

**Created**: 2026-09-11

**Status**: Draft

**Input**: User description: "Build an administrator-only Drivers management feature (single-tenant application using Clerk for authentication) matching the provided drivers.png and add-driver.png screenshots. Administrators can view the driver directory and roster statistics (total drivers, active today, on leave, unassigned trucks), add a new driver (creating/inviting a corresponding Clerk user with the Driver role and a linked local Driver profile with full name, email, phone, driver class, and optional truck assignment), edit an existing driver's profile (name, phone, driver class, truck assignment, status; email is not changed through this feature), deactivate and reactivate a driver, and assign or unassign a truck (one truck belongs to at most one active driver). Non-administrator (Driver) users must be denied access to this page and its management actions, enforced server-side. Driver status uses ACTIVE, INACTIVE, and ON_LEAVE. Statistics and directory data must come from the database, not mock data, and 'last activity' must reflect real available activity data rather than fabricated timestamps. Partial failures (e.g., the account invite succeeds but local profile creation fails, or vice versa) must not leave orphaned or inconsistent records."

## Clarifications

### Session 2026-09-11

- Q: If a driver's account is changed or removed directly in the authentication provider (outside this application), should the system detect and reconcile that automatically, or is staying in sync only guaranteed for changes made through this app? → A: Out of scope — sync is only guaranteed for changes made through this application; no reconciliation of external changes.
- Q: When a driver's status is set to "on leave," should they keep normal application access (same as active), or should access be restricted the same way it is for an inactive driver? → A: On leave keeps full access — it is a roster/reporting label only; access restriction happens exclusively via active/inactive.
- Q: Should this feature introduce a minimal "Truck" record in the data model (so trucks can be selected, counted, and checked for conflicts), or should truck assignment stay a simple free-text identifier on each driver with no real list to select from? → A: Keep truck assignment as free text per driver; there is no separate truck list, and "unassigned trucks" has no reliable total to count against. As a direct consequence, the "Unassigned trucks" summary card is dropped from this feature's scope rather than redefined.
- Q: Should a driver be required to change their temporary password the first time they sign in, or can they keep using the password the administrator set for as long as they like? → A: No forced change — the password the administrator set remains valid indefinitely; no first-sign-in change step.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Administrator Views the Driver Roster (Priority: P1)

As an administrator, I want to see a directory of all drivers along with roster-health statistics so that I can understand my team's current status at a glance.

**Why this priority**: This is the foundation of the entire feature. Every other capability (adding, editing, deactivating, assigning trucks) operates on top of this view, and without it an administrator has no visibility into the driver roster at all.

**Independent Test**: Sign in as an administrator, open the Drivers page, and confirm the summary cards and driver directory table render with real data; apply a status filter and a search term and confirm the results narrow correctly.

**Acceptance Scenarios**:

1. **Given** at least one driver exists, **When** the administrator opens the Drivers page, **Then** summary cards (total drivers, active today, on leave) and a driver directory table are displayed, with values computed from current data.
2. **Given** no drivers exist yet, **When** the administrator opens the Drivers page, **Then** the directory shows a clear empty state instead of a blank or confusing table.
3. **Given** drivers with different statuses exist, **When** the administrator filters by status, **Then** only drivers matching the selected status are shown.
4. **Given** drivers exist, **When** the administrator searches (e.g., by name), **Then** only matching drivers are shown.
5. **Given** driver data cannot be loaded, **When** the page attempts to load, **Then** a clear error state is shown instead of a blank or broken page.

---

### User Story 2 - Administrator Adds a New Driver (Priority: P1)

As an administrator, I want to add a new driver so that they can access the application with driver-level permissions and appear in the roster.

**Why this priority**: This is the primary way new drivers enter the system. Without it, the roster can never grow beyond however it was first populated, and new hires cannot get access to the application.

**Independent Test**: Open the Add Driver dialog, submit valid required fields (including a temporary password), and confirm a new driver appears in the directory, their account is created directly and is immediately usable for sign-in, and the new account holds the driver role.

**Acceptance Scenarios**:

1. **Given** the administrator opens Add Driver and submits a valid full name, email, and temporary password, **When** submission succeeds, **Then** the driver's account is created directly (no email invitation) and is immediately usable for sign-in without email verification, the driver role is assigned to it, a linked driver profile is created, and the new driver appears in the directory.
2. **Given** the administrator submits the form without a required field (full name, email, or temporary password), **When** they attempt to submit, **Then** validation errors are shown and no account or profile is created.
3. **Given** the administrator submits an email already associated with an existing account, **When** they submit, **Then** a clear duplicate-account error is shown and no duplicate account or profile is created.
4. **Given** the administrator enters a temporary password that does not meet the authentication provider's minimum password requirements, **When** they submit, **Then** a clear validation error is shown and no account or profile is created.
5. **Given** the administrator selects a truck already assigned to another active driver, **When** they submit, **Then** the assignment is rejected with a clear message and no invalid assignment is saved.
6. **Given** the account-creation step fails, **When** the failure occurs, **Then** no local driver profile is left behind, and the administrator sees an actionable error.
7. **Given** the local profile creation fails after the account was already created, **When** the failure occurs, **Then** the system does not silently lose track of the created account, and the administrator sees an actionable error.
8. **Given** creation succeeds, **When** the dialog closes, **Then** the driver directory and statistics refresh to reflect the new driver without a manual page reload, and the administrator sees success feedback.

---

### User Story 3 - Administrator Edits an Existing Driver (Priority: P2)

As an administrator, I want to update a driver's profile details and truck assignment so that roster information stays accurate over time.

**Why this priority**: Roster data (phone numbers, driver class, truck assignments) changes over the course of employment; without editing, the only way to fix incorrect data would be to recreate the driver, which is disruptive and unsafe.

**Independent Test**: Open the Edit action from a driver's row, change phone number, driver class, and truck assignment, save, and confirm the changes are reflected in the directory without a new account being created.

**Acceptance Scenarios**:

1. **Given** the administrator opens Edit for an existing driver, **When** the dialog opens, **Then** it is pre-filled with the driver's current name, phone, driver class, truck assignment, and status, and displays their email as read-only.
2. **Given** the administrator changes phone number, driver class, truck assignment, or status and saves, **When** the save succeeds, **Then** the updated values appear in the directory and no new account is created.
3. **Given** the administrator assigns a truck already assigned to a different active driver, **When** they save, **Then** the change is rejected with a clear message.
4. **Given** the administrator unassigns a driver's truck, **When** they save, **Then** the driver shows no assigned truck and that truck becomes available for assignment to another driver.

---

### User Story 4 - Administrator Deactivates and Reactivates a Driver (Priority: P2)

As an administrator, I want to deactivate a driver who is no longer active and reactivate them later if needed, without losing their historical records.

**Why this priority**: Drivers leave or go on extended leave regularly; the business needs a way to remove their access and exclude them from active operations while preserving timesheets and history for records and potential reactivation.

**Independent Test**: Deactivate an active driver from the row actions menu, confirm their status changes and their historical timesheets remain intact, then reactivate them and confirm status returns to active.

**Acceptance Scenarios**:

1. **Given** an active driver, **When** the administrator deactivates them, **Then** the driver's status becomes inactive, their historical records (timesheets, assignment history) remain unchanged, and their ability to use restricted application functionality is revoked.
2. **Given** an inactive driver, **When** the administrator reactivates them, **Then** the driver's status returns to active and they regain access to the functionality permitted to their role.
3. **Given** a driver with an assigned truck is deactivated, **When** deactivation completes, **Then** the truck is freed for assignment to another active driver.

---

### User Story 5 - Non-Administrator Access Is Blocked (Priority: P1)

As the business, I need any user without the administrator role to be prevented from accessing driver management so that driver data and account changes stay protected.

**Why this priority**: This is a hard security boundary. Driver management touches account creation, roles, and personal data; if a non-administrator could reach it — even by bypassing the UI — the rest of the feature's guarantees would be meaningless.

**Independent Test**: Sign in as a driver-role user, attempt to open the Drivers page directly by URL, and separately attempt to invoke a driver-management action directly; confirm both are denied.

**Acceptance Scenarios**:

1. **Given** a signed-in user with the driver role, **When** they navigate to the Drivers page, **Then** they are denied access or redirected away from it.
2. **Given** a signed-in user with the driver role, **When** they attempt to invoke a driver-management action directly (bypassing the UI), **Then** the action is rejected regardless of any role information submitted by the client.
3. **Given** a request that attempts to grant or change a user's role to administrator through driver-management functionality, **When** it is submitted by anyone other than an administrator, **Then** it is rejected.

---

### Edge Cases

- What happens when an administrator tries to add a driver whose email is already registered to an existing account? The request is rejected with a clear duplicate-account message, and no new account or profile is created.
- What happens when an administrator assigns a truck that is already assigned to another active driver, either when adding or editing? The assignment is rejected with a clear message; the existing assignment is left unchanged.
- What happens when an administrator leaves truck assignment blank while adding or editing a driver? The driver is saved with no assigned truck; this is a valid state.
- What happens when a driver with an assigned truck is deactivated? The truck is unassigned and becomes available to assign to another active driver.
- What happens if the account-creation step succeeds but creating the local driver profile fails, or the reverse? No inconsistent state is left behind — either the whole operation is undone, or the inconsistency is clearly surfaced and resolvable rather than silently hidden — and the administrator sees an actionable error either way.
- What happens when the administrator enters a temporary password that does not meet the authentication provider's minimum password requirements? Validation fails with a clear message, and no account or profile is created.
- What happens when a driver's account has been created but they have never signed in? "Last activity" shows a clear "not yet active" indication rather than a fabricated timestamp.
- What happens when a status filter and a search term together match no drivers? The directory shows a distinct no-results state, not an empty table with no explanation.
- What happens when the driver directory or statistics cannot be loaded (e.g., the database or authentication provider is unreachable)? A clear error state is shown, not a blank or partially rendered page.
- What happens when an administrator edits a driver but does not change the email field? The email remains exactly as it was; it cannot be modified through this dialog.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST restrict access to the Drivers page and all driver-management actions to users with the administrator role, enforced on the server independent of, and in addition to, any UI-level hiding of controls.
- **FR-002**: System MUST reject any driver-management action attempted by a non-administrator, including direct invocation that bypasses the visible UI, regardless of role information supplied by the client.
- **FR-003**: System MUST prevent any driver-management request from granting or elevating a user to the administrator role.
- **FR-004**: The Drivers page MUST use the existing application sidebar and shell navigation, consistent with the rest of the administrator area.
- **FR-005**: The Drivers page MUST display a breadcrumb/eyebrow ("Team / Directory"), a page title ("Drivers"), a subtitle describing driver roster management, and a primary "Add driver" action.
- **FR-006**: System MUST display summary cards for total drivers, drivers active today, and drivers on leave, each computed from current driver data rather than fixed or sample values.
- **FR-007**: System MUST display a driver directory table listing, for each driver: avatar/initials and full name, driver class, phone number, assigned truck (or none), status, last activity, and a row-level actions menu.
- **FR-008**: System MUST support filtering the driver directory by status.
- **FR-009**: System MUST support searching the driver directory (e.g., by name).
- **FR-010**: System MUST show a distinct empty state when no drivers exist at all, and a distinct no-results state when an applied filter or search matches no drivers.
- **FR-011**: System MUST show a loading state while directory and statistics data are being retrieved, and an error state if that data cannot be retrieved.
- **FR-012**: "Last activity" MUST reflect a real recorded activity or sign-in event for that driver when one exists, and MUST show a clear "not yet active" indication when none exists; the system MUST NOT display a fabricated or estimated timestamp.
- **FR-013**: System MUST provide an "Add driver" action that opens a form collecting full name (required), email (required), a temporary password (required), phone number (optional), driver class (optional), and truck assignment (optional); the role assigned to accounts created through this form is fixed as driver.
- **FR-014**: System MUST validate, on the server, that full name, email, and temporary password are present, that email is well-formed, that the temporary password meets the authentication provider's minimum password requirements, that phone (when supplied) is a valid phone format, and that a supplied truck identifier is not already assigned to another active driver.
- **FR-015**: System MUST reject an attempt to add a driver whose email already belongs to an existing account, showing a clear, actionable error, and MUST NOT create a duplicate account or driver profile in that case.
- **FR-016**: On successful driver creation, System MUST: create the driver's account directly (not via an email invitation) using the submitted email and temporary password, configure the account so it is immediately usable for sign-in without requiring email verification, assign that account the driver role, create a linked local driver profile, associate the local profile with the created account via its account identifier, persist the selected truck assignment (if any), close the dialog, refresh the directory and statistics, and show success feedback.
- **FR-017**: If any step of driver creation fails partway through (for example, the account is created but local profile creation fails, or the reverse), System MUST handle the failure so that no orphaned or inconsistent driver record is left behind, and MUST present an actionable error to the administrator.
- **FR-032**: The temporary password entered by the administrator MUST be sent directly to the authentication provider to create the account and MUST NOT be persisted anywhere in the application's own database, logs, or client-visible state beyond the initial form submission.
- **FR-033**: The account-creation method used when adding a driver (direct creation with an administrator-supplied temporary password and no email verification, vs. an invitation-based flow with provider-driven verification) MUST be implemented so it can be switched for production use without redesigning this feature's data model or user flows.
- **FR-034**: System MUST NOT require a driver to change their administrator-set temporary password before or during their first sign-in; that password remains valid for continued use until an administrator or the driver changes it through functionality outside this feature.
- **FR-018**: System MUST provide an "Edit" action, accessible from each driver's row actions menu, that reuses the add-driver form layout where practical and is pre-filled with the driver's current details.
- **FR-019**: The Edit Driver form MUST allow updating full name, phone number, driver class, truck assignment, and status, and MUST treat email as read-only, visibly indicating that it cannot be changed from this dialog.
- **FR-020**: Editing a driver MUST NOT create a new or duplicate account; it MUST update only the existing linked driver profile.
- **FR-021**: System MUST enforce that a truck can be assigned to at most one active driver at a time, both when adding and when editing a driver, and MUST reject any assignment that would violate this.
- **FR-022**: System MUST allow an administrator to unassign a driver's truck, after which that truck becomes available for assignment to another driver.
- **FR-023**: System MUST allow an administrator to deactivate an active driver; deactivation MUST set that driver's status to inactive, MUST prevent that driver from using restricted application functionality going forward, and MUST NOT delete or alter their historical business records (e.g., past timesheets, assignment history).
- **FR-024**: Deactivating a driver who has an assigned truck MUST free that truck for assignment to another active driver.
- **FR-025**: System MUST allow an administrator to reactivate an inactive driver, restoring their status to active and their access to the functionality permitted to their role.
- **FR-026**: System MUST support at least three driver statuses — active, inactive, and on leave — used consistently across statistics, filtering, and the directory display. Of these, only "inactive" restricts application access (per FR-023); "on leave" is a roster/reporting classification only and MUST NOT by itself restrict a driver's normal application access.
- **FR-027**: The Drivers page and its dialogs MUST remain fully usable and responsive at desktop, tablet, and mobile viewport sizes.
- **FR-028**: The Drivers page layout, summary cards, directory table, and Add/Edit Driver dialogs MUST closely follow the reference screenshots (`docs/ui/drivers.png`, `docs/ui/add-driver.png`) for structure, spacing, typography, and visual hierarchy.
- **FR-029**: System MUST NOT use hard-coded or mock driver, statistic, or activity data once this feature is wired to real data; all displayed values MUST originate from actual application data.
- **FR-030**: All driver-management mutations MUST require the requester to be authenticated, in addition to the administrator-role check in FR-001.
- **FR-031**: System is NOT required to detect or reconcile changes made directly in the authentication provider outside this application (e.g., manually deleting or editing an account there); synchronization between the authentication provider and local driver records is only guaranteed for changes made through this feature's own flows.

### Key Entities

- **Driver**: A driver-role team member managed through this feature. Attributes: linked account identifier, email, full name, phone number, driver class, status (active, inactive, or on leave), assigned truck identifier (optional free-text label; at most one active driver may hold a given identifier at a time), last activity, and record timestamps. A Driver is distinct from an administrator account. There is no separate Truck entity in this feature's scope — the assigned truck is a plain identifying label on the Driver record, not a reference to a managed fleet list.
- **Account**: The authentication identity created for a driver — directly, with an administrator-supplied temporary password (development configuration), or via an invitation-based flow (production configuration) — holding the driver role and linked to exactly one Driver record. Authentication, session, and password details live entirely with the authentication identity; the Driver record holds only trucking-domain profile information and never a password.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An administrator can view the full driver roster and roster-health statistics with no manual data assembly, and the displayed values always match the underlying driver and truck-assignment data.
- **SC-002**: An administrator can add a new driver — from opening the dialog to that driver being able to sign in — in a single guided flow, without performing any step outside the application and without waiting on an email round trip.
- **SC-003**: 100% of attempts to assign a truck already assigned to another active driver are rejected with a clear explanation, and no two active drivers ever end up sharing one truck.
- **SC-004**: 100% of failed driver-creation attempts (validation failure, duplicate email, or account-creation failure) leave no orphaned or inconsistent driver records behind.
- **SC-005**: A non-administrator user is blocked from reaching driver management 100% of the time, whether through the page directly or by attempting the underlying action directly.
- **SC-006**: An administrator can deactivate and later reactivate a driver with zero loss of that driver's historical business records.
- **SC-007**: The Drivers page remains fully usable, with no broken layout or inaccessible controls, at common desktop, tablet, and mobile widths.

## Assumptions

- The directory and statistics in this feature's scope apply to driver-role accounts. The administrator row shown in the reference screenshot (`docs/ui/drivers.png`) is treated as illustrative mockup content, not a requirement to list non-driver accounts in this feature's directory, since the feature description and acceptance criteria are entirely driver-focused.
- "Active today" and "on leave" reflect the driver's current status field (active vs. on-leave) rather than a separate attendance-tracking system, since no attendance system is described in scope.
- Truck assignment is a free-text identifier on the driver record, not a reference to a separate managed fleet list; there is no total truck count for the system to know. Consequently, an "Unassigned trucks" summary statistic is not included in this feature — only total drivers, active today, and on leave are shown. Uniqueness (at most one active driver per truck identifier) is still enforced by comparing the submitted identifier against other active drivers' assigned identifiers.
- "Last activity" reflects the driver's most recent recorded sign-in or usage event when available; a driver whose account exists but who has never signed in shows a clear "not yet active" indication rather than any timestamp.
- Email is treated as read-only once a driver account exists, because changing the address tied to an authentication identity carries verification implications beyond this feature's scope. An administrator who needs to correct a driver's email handles it outside the Edit Driver dialog.
- Deactivating a driver also revokes their ability to sign in to or use the application; reactivating restores it, since preventing "restricted application functionality" for an inactive driver is a stated requirement.
- The trend/percentage figures shown under each summary card in the reference screenshot (e.g., "vs last month") are a visual mockup detail, not a required business computation, since only the three summary values (total drivers, active today, on leave) are specified. The reference screenshot's fourth "Unassigned trucks" card is not part of this feature's scope (see the truck-assignment assumption above).
- The "Filter" control and status dropdown shown together in the reference screenshot both serve the single "status filtering" requirement; one combined status control is an acceptable fulfillment.
- Driver class values (e.g., Class A Driver, Class B Driver) are a fixed, small set of classification labels rather than a separate user-managed list, consistent with how they appear in the reference screenshots.
- A newly added driver defaults to active status upon creation, since no status field appears in the Add Driver screenshot.
- The "Export directory" control shown in the reference screenshot is not required functionality for this specification; it is not covered by the requirements above.
- For development, driver accounts are created directly with an administrator-supplied temporary password and are immediately usable for sign-in without email verification; no invitation email is sent. This is a development-time convenience, not a permanent constraint on the feature's design.
- The account-creation approach is expected to change for production (e.g., to an invitation-based flow with provider-driven email verification and no admin-supplied password); this feature's data model (a Driver linked to an account via a stored account identifier) does not need to change to support that later switch.
- The temporary password is used only to create the account through the authentication provider's own server-side API; it is never written to the application's own database, logs, or any client-visible state beyond the initial form submission, consistent with the project-wide rule that passwords are never stored locally.
- No forced password-change step is required on first sign-in; the administrator-set password remains valid indefinitely for this development configuration. Password reset/change for an existing driver, if ever needed, happens through functionality outside this feature (e.g., standard account-recovery flows), not through the Edit Driver dialog.
