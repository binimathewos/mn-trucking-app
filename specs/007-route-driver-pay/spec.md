# Feature Specification: Route-Based Driver Pay

**Feature Branch**: `007-route-driver-pay`

**Created**: 2026-09-11

**Status**: Draft

**Input**: User description: "Update the existing Timesheets and Routes features with route-based driver pay. Add a required Route field to timesheet entries a driver creates, showing only routes currently assigned to that driver, and persist the selected routeId. Add an hourly driver pay rate to each Route, stored as a decimal/money-safe value. Support a configurable default hourly driver rate that seeds new routes' rates; ADMIN can override a route's rate at creation or later, and changing the default never retroactively changes existing route rates. Update Route create/edit forms with a Driver Hourly Rate field prepopulated from the default and overridable by ADMIN. Update Timesheets so ADMIN can see route, hours worked, hourly rate, and calculated pay (hours x rate). DRIVER can only select routes assigned to them and cannot modify rates; ADMIN controls default and route-specific rates; route ownership/assignment must be validated server-side when saving a timesheet."

## Clarifications

### Session 2026-09-11

- Q: When a route's hourly rate is changed after timesheet entries already exist for that route, should previously recorded entries keep the rate that was in effect when they were saved, or always reflect the route's current rate? → A: Always compute pay from the route's current rate; a rate change is reflected immediately in every entry logged against that route, past or future.
- Q: When an ADMIN creates or edits a timesheet entry on behalf of a driver, can the ADMIN pick any route in the system, or only routes assigned to that driver? → A: Same restriction as the driver — the ADMIN must also pick from that driver's currently assigned routes, enforced server-side.
- Q: Can a DRIVER see the hourly rate and calculated pay for their own timesheet entries, or is that ADMIN-only? → A: DRIVER can see the hourly rate and calculated pay for their own timesheet entries, in addition to ADMIN seeing everyone's.
- Q: Should the system keep a history of rate changes (old rate, new rate, who changed it, and when) for the default rate and for individual routes, given that rate changes now immediately affect the calculated pay shown for past timesheet entries too? → A: No audit trail — only the current rate is stored, consistent with how other editable fields in the app work today.
- Q: Besides showing hourly rate and calculated pay on each individual timesheet entry, should the admin also see a rolled-up total calculated pay for the whole timesheet? → A: Yes — add a total calculated pay figure for the timesheet (sum of each entry's pay), alongside the existing total-hours figure.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Driver Logs Hours Against an Assigned Route (Priority: P1)

As a driver, when I record my hours for a day, I want to pick which of my assigned routes/jobs the hours belong to, so that my pay is correctly tied to the work I actually performed.

**Why this priority**: Without a route on the entry, there is no way to compute route-based pay at all — this is the data-capture foundation the rest of the feature depends on.

**Independent Test**: Sign in as a driver with at least one route assigned, open "Add timesheet entry," confirm the Route field lists only routes assigned to this driver, select one, save, and confirm the saved entry is associated with that route.

**Acceptance Scenarios**:

1. **Given** a driver has one or more routes currently assigned to them, **When** they open the timesheet entry form, **Then** the Route field lists only those assigned routes and no others.
2. **Given** a driver has no routes currently assigned to them, **When** they open the timesheet entry form, **Then** no routes are selectable and the driver cannot submit the entry until a route becomes available to select.
3. **Given** a driver is filling out a timesheet entry, **When** they attempt to save without selecting a route, **Then** validation blocks the save with a clear message that Route is required.
4. **Given** a driver selects one of their assigned routes and completes the rest of the entry, **When** they save, **Then** the entry is persisted with that route's identifier and appears correctly associated with the route wherever the entry is shown.
5. **Given** a driver has never been assigned the route belonging to another driver, **When** they attempt to submit a timesheet entry referencing that route (e.g., via a tampered request), **Then** the system rejects the save server-side regardless of what the client sent.

---

### User Story 2 - Administrator Sets and Manages Route Pay Rates (Priority: P1)

As an administrator, I want every route to carry an hourly driver pay rate — prefilled from a configurable default and editable per route — so that driver pay reflects the correct rate for each job.

**Why this priority**: The rate is the other half of the pay calculation; without it, hours logged against a route have no dollar value. This must exist before pay can be shown or trusted anywhere.

**Independent Test**: As an administrator, open "Create route," confirm the Driver Hourly Rate field is prepopulated with the configured default, change it, save, and confirm the route stores the overridden rate rather than the default. Then edit an existing route's rate and confirm the change is saved and does not affect the default or other routes.

**Acceptance Scenarios**:

1. **Given** a configured default hourly driver rate exists, **When** an administrator opens "Create route," **Then** the Driver Hourly Rate field is prepopulated with that default value.
2. **Given** an administrator is creating a route, **When** they change the Driver Hourly Rate before saving, **Then** the route is created with the overridden value, not the default.
3. **Given** an existing route, **When** an administrator edits its Driver Hourly Rate and saves, **Then** the new rate is stored for that route only.
4. **Given** an administrator updates the configurable default hourly rate, **When** the change is saved, **Then** all previously created routes keep their existing rates unchanged, and only routes created after the change use the new default as their starting value.
5. **Given** an administrator submits a route create/edit form with a missing, negative, or non-numeric Driver Hourly Rate, **When** they attempt to save, **Then** validation blocks the save with a clear error.
6. **Given** a DRIVER account, **When** any attempt is made to change the default rate or a route's rate (including a direct server request bypassing the UI), **Then** the system rejects the change server-side.

---

### User Story 3 - Administrator Reviews Route-Based Pay on Timesheets (Priority: P2)

As an administrator, I want to see each timesheet entry's route, hours worked, hourly rate, and calculated pay, so that I can verify driver pay without doing the math by hand.

**Why this priority**: This is the payoff of the feature — turning captured hours and rates into a reviewable pay figure — but it depends on User Stories 1 and 2 already existing.

**Independent Test**: As an administrator, open a driver's timesheet detail that has at least one entry with a route and hours, and confirm the route, hourly rate, hours worked, and a calculated pay amount (hours × rate) are all displayed for that entry, along with a correct total.

**Acceptance Scenarios**:

1. **Given** a timesheet entry has a route and hours worked, **When** an administrator views the timesheet detail, **Then** the entry's route, hourly rate, hours worked, and calculated pay amount (hours × rate) are displayed.
2. **Given** a timesheet has multiple entries across different routes with different rates, **When** an administrator views the timesheet, **Then** each entry shows its own route and rate, pay amounts are calculated per entry (not using a single blended rate), and a total calculated pay for the whole timesheet (the sum of each entry's pay) is displayed alongside the existing total hours.
3. **Given** an administrator later changes a route's hourly rate, **When** they view a timesheet entry that was saved before the rate change, **Then** that entry's displayed rate and calculated pay reflect the route's current (updated) hourly rate, not the rate that applied when the entry was originally saved.
4. **Given** a driver views their own timesheet, **When** the timesheet detail loads, **Then** the driver can see the route, hourly rate, and calculated pay for their own entries.
5. **Given** a timesheet entry was created before this feature existed and has no associated route, **When** an administrator views it, **Then** the entry displays hours worked as before and shows the rate/pay fields as not available rather than a calculation error.

---

### Edge Cases

- What happens when a driver's route assignment is removed after they have already logged hours against it? The previously saved entry keeps its route reference and its calculated pay continues to use that route's hourly rate (current at time of viewing); the route simply no longer appears as selectable for new entries.
- What happens when an administrator unassigns a driver from a route and reassigns it to a different driver? Prior timesheet entries logged by the original driver against that route remain unchanged (route reference and calculated pay using the route's rate); the route becomes selectable for the newly assigned driver going forward.
- What happens if the configured default rate has never been set when an administrator creates the first route? A system-provided baseline default (e.g., $0.00) is used until an administrator configures one, and the Driver Hourly Rate field is still editable at creation.
- How does the system handle a route whose hourly rate is set to zero? Zero is accepted as a valid rate (e.g., for non-paid or trial routes); calculated pay for entries against it is $0.00.
- What happens when a driver has multiple routes assigned and logs several timesheet entries against different routes within the same day or week? Each entry independently stores its own route and rate; totals for the week sum each entry's individually calculated pay.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST require a DRIVER to select a Route when creating a timesheet entry, and MUST block saving the entry until a route is selected.
- **FR-002**: System MUST limit the Route options shown to a DRIVER to only routes currently assigned to that logged-in driver.
- **FR-003**: System MUST persist the selected route's identifier with the saved timesheet entry.
- **FR-004**: System MUST validate, server-side, that the route referenced on a timesheet entry being saved is actually assigned to the driver the entry belongs to, independent of what the client submits, and MUST reject the save otherwise.
- **FR-005**: System MUST store an hourly driver pay rate on every Route, as a decimal/money-safe value (not a floating-point value subject to rounding error).
- **FR-006**: System MUST support a single configurable default hourly driver rate that administrators can view and update.
- **FR-007**: System MUST initialize a newly created route's hourly rate from the current default hourly rate at the time of creation.
- **FR-008**: System MUST allow an ADMINISTRATOR to override a route's hourly rate at creation time, before saving.
- **FR-009**: System MUST allow an ADMINISTRATOR to update an existing route's hourly rate at any later time.
- **FR-010**: System MUST NOT retroactively change any existing route's stored hourly rate when the default hourly rate is updated.
- **FR-011**: System MUST reject any DRIVER-initiated attempt (including direct requests that bypass the UI) to change the default hourly rate or any route's hourly rate.
- **FR-012**: System MUST restrict changes to the default hourly rate and to route-specific hourly rates to ADMINISTRATOR users only, enforced server-side.
- **FR-013**: Route create and edit forms MUST include a Driver Hourly Rate field.
- **FR-014**: The Driver Hourly Rate field on the route create form MUST be prepopulated with the current default hourly rate, and MUST remain editable by an ADMINISTRATOR before saving.
- **FR-015**: System MUST validate that a submitted Driver Hourly Rate is present, numeric, and not negative, rejecting the save with a clear error otherwise.
- **FR-016**: The timesheet view available to an ADMINISTRATOR MUST display, for each timesheet entry that has a route, the route, the hours worked, the hourly rate, and a calculated pay amount.
- **FR-016a**: The timesheet view available to an ADMINISTRATOR MUST display a total calculated pay amount for the whole timesheet, equal to the sum of the calculated pay of each of its entries that has a route, shown alongside the existing total hours figure.
- **FR-017**: The calculated pay amount for a timesheet entry MUST equal that entry's hours worked multiplied by its route's current hourly rate at the time the pay amount is displayed or computed.
- **FR-018**: System MUST NOT store a fixed/historical hourly rate on the timesheet entry itself; the applicable rate for pay purposes is always the referenced route's current hourly rate, so a change to a route's rate immediately changes the calculated pay of every entry (past or future) logged against that route.
- **FR-019**: When an ADMINISTRATOR creates or edits a timesheet entry on behalf of a driver, the system MUST restrict the selectable routes to that same driver's currently assigned routes, and MUST validate this server-side.
- **FR-020**: A DRIVER MUST be able to see the route, hourly rate, and calculated pay amount for their own timesheet entries.
- **FR-021**: Timesheet entries that exist without an associated route (recorded before this feature existed) MUST continue to display their hours worked and MUST show the rate and pay figures as not available rather than producing an error or a fabricated calculation.
- **FR-022**: System MUST NOT allow a DRIVER to modify a route's hourly rate or the default hourly rate through any timesheet-entry-related action.

### Key Entities

- **Route**: An existing delivery/transport job, extended with a **Driver Hourly Rate** — a money-safe decimal amount paid to the assigned driver per hour worked on that route. Set from the default rate at creation and independently editable by an administrator afterward.
- **Default Driver Pay Rate**: A single, administrator-configurable system setting representing the hourly rate used to seed new routes' rates. Changing it affects only routes created afterward.
- **Timesheet Entry**: An existing driver's daily time record, extended with a required reference to the Route it was worked on. Calculated pay is derived at display/read time from the entry's hours worked and the referenced route's current hourly rate (no separate rate is stored on the entry).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of new driver timesheet entries are saved with a valid route that was actually assigned to that driver at the time of entry; zero entries can be saved without one.
- **SC-002**: 100% of routes have an hourly driver pay rate at all times, whether inherited from the default or set explicitly by an administrator.
- **SC-003**: An administrator can determine a driver's calculated pay for any given timesheet entry, and the total calculated pay for that driver's whole timesheet, by looking at a single screen, without performing any manual calculation.
- **SC-004**: Changing the default hourly rate affects 0% of previously created routes' stored rates.
- **SC-005**: Changing a route's hourly rate is reflected in the calculated pay of 100% of timesheet entries logged against that route (past and future) the next time they are viewed.
- **SC-006**: 100% of attempts by a driver to select a route not assigned to them, or to alter any pay rate, are blocked, including attempts that bypass the visible UI.

## Assumptions

- "Timesheet entry" refers to the existing daily entry record a driver fills out (date, start time, end time, hours) — the Route selection applies at that daily-entry level, so a driver working different routes on different days within the same week records each day against its own route.
- The list of routes a driver can select from includes all routes currently assigned to them, except routes that are completed or cancelled — a driver only logs time against a route that is still in progress.
- The default hourly rate is a single, system-wide value (not per-client, per-region, or per-driver); administrators can view and update it from an accessible settings location within the Routes or admin area.
- Existing timesheet entries recorded before this feature was added are not retroactively required to have a route; they remain valid historical records and simply lack rate/pay figures.
- A newly created system, before any administrator has configured a default rate, uses $0.00 as the baseline default so route creation is never blocked by a missing configuration.
- "Money-safe" storage means using a fixed-precision decimal type (avoiding binary floating-point) for hourly rates and any stored monetary/pay figures, consistent with standard practice for financial data.
- No history of rate changes is kept — the default rate and each route's rate only ever expose their current value; who changed a rate and when is out of scope for this feature.
