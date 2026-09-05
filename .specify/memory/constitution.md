<!--
Sync Impact Report
- Version change: [TEMPLATE] → 1.0.0 (initial ratification)
- Modified principles: none (first concrete adoption of the constitution template)
- Added sections:
  - Core Principles: 1. Technology Foundation, 2. Next.js Architecture, 3. Feature-Oriented
    Architecture, 4. UI Design System, 5. Responsive Design, 6. TypeScript Standards,
    7. Data and Persistence, 8. Validation and Data Integrity, 9. Authentication,
    Authorization, and Security, 10. Component and Code Quality, 11. Dependency Discipline,
    12. User Experience States, 13. Accessibility, 14. Testing Strategy, 15. Quality Gates,
    16. AI Agent and Development Discipline
  - Governance
- Removed sections: template placeholders ([SECTION_2_NAME]/[SECTION_2_CONTENT],
  [SECTION_3_NAME]/[SECTION_3_CONTENT]) — this project's rules did not decompose into the
  default 5-principle + 2-section shape, so all 16 rule groups were captured as Core
  Principles instead, per the template's guidance to adapt principle count to project needs.
- Deferred/TODO items: none. RATIFICATION_DATE set to the date this constitution was first
  adopted in this repository (no earlier ratified version existed).
-->

# MN Trucking App Constitution

## Project Context

This is a SaaS web application built for a single trucking company to manage operational
activities: containers, drivers, customers, driver timesheets, and invoices. It is **NOT**
multi-tenant. Tenant architecture, tenant IDs, organization isolation, or multi-company
abstractions MUST NOT be introduced. The application has exactly two user roles:
**Administrator** and **Driver**.

This constitution contains only durable, project-wide engineering rules that apply across
features. Feature-specific business requirements belong in `/speckit.specify`; feature-specific
implementation decisions belong in `/speckit.plan`.

## Core Principles

### 1. Technology Foundation

The application MUST use: Next.js with App Router, React, TypeScript with strict mode enabled,
a `src/` project structure, pnpm exclusively, Tailwind CSS, shadcn/ui, Lucide icons,
PostgreSQL, Prisma ORM, Clerk for authentication, and Zod for runtime validation. Follow
established Next.js, React, and TypeScript conventions instead of creating custom framework
abstractions without a clear need.

### 2. Next.js Architecture

Server Components MUST be the default. Client Components are used only when client-side state,
event handling, React client hooks, browser APIs, or other client-only functionality requires
them, and `"use client"` boundaries MUST be kept as small as practical. Use Server Actions for
mutations and application operations when appropriate, and Route Handlers when an HTTP/API
boundary is appropriate, including external integrations and webhooks. Server-only logic MUST
NOT be moved into Client Components. Prefer built-in Next.js capabilities over custom
infrastructure.

### 3. Feature-Oriented Architecture

Organize code primarily around business features/domains rather than purely technical layers.
Feature-specific components, actions, schemas, types, and utilities SHOULD remain close to their
feature whenever practical. Shared code belongs in common locations only when genuinely reused
across multiple domains. Avoid large monolithic components, services, and utility files.
Maintain clear separation between UI/presentation, business/domain logic, data access,
validation, and authorization. Significant business logic MUST NOT be placed directly inside
presentation components.

### 4. UI Design System

The application MUST maintain a clean, modern, professional SaaS appearance. Screenshots under
`docs/ui/` are the authoritative visual source of truth for applicable screens; the relevant
screenshots MUST be inspected before implementing or modifying UI. Implementations MUST closely
reproduce their layout, spacing, typography, visual hierarchy, navigation structure, card
composition, sizing and alignment, borders/radius/shadows, and overall visual language. A screen
MUST NOT be independently redesigned when a reference screenshot exists. Use Tailwind CSS
consistently, prefer existing shadcn/ui components before creating custom equivalents, and use
Lucide icons rather than introducing additional icon libraries. Extract reusable UI patterns
when meaningful, but avoid unnecessary abstractions.

### 5. Responsive Design

The application is desktop-first but MUST remain fully usable and responsive on tablet and
mobile. Layouts MUST adapt intentionally rather than simply shrink. Navigation, tables, forms,
cards, dialogs, and controls MUST remain usable across supported screen sizes. Avoid fixed
dimensions that unnecessarily break responsive layouts.

### 6. TypeScript Standards

TypeScript strict mode MUST remain enabled. `any` MUST NOT be used unless technically necessary
and explicitly justified. Prefer type inference where types are obvious, and define clear types
at important domain, database, API, validation, and component boundaries. Avoid unnecessary type
assertions, unsafe casts, and unnecessary type duplication.

### 7. Data and Persistence

PostgreSQL and Prisma are the canonical persistence layer. Database access MUST occur
server-side; Client Components MUST NEVER directly access Prisma or the database. Schema changes
MUST use Prisma schema changes and migrations. Prefer relational modeling and database
constraints where they protect data integrity. Avoid duplicating persisted data that can
reliably be derived unless justified. Keep data access close to its business domain, and do not
introduce unnecessary repository abstractions over Prisma. Because this application serves one
trucking company, tenant IDs, tenant tables, organization-scoping infrastructure, or other
multi-tenant abstractions MUST NOT be introduced unless project requirements fundamentally
change in the future.

### 8. Validation and Data Integrity

All untrusted data MUST be validated at a trusted server boundary using Zod, including forms,
Server Action inputs, Route Handler/API inputs, applicable query parameters, and external system
payloads. Client-side validation improves UX but MUST NOT replace server-side validation.
Business invariants MUST be enforced server-side.

### 9. Authentication, Authorization, and Security

Clerk is the authentication and identity provider. Authentication and authorization MUST be
treated separately. Authorization MUST be enforced server-side for protected data and
operations; user IDs, roles, resource ownership, and permissions supplied by the browser MUST
NEVER be trusted without server-side verification. The Administrator and Driver roles MUST have
their permissions enforced server-side rather than relying only on hidden UI elements. Secrets,
database credentials, privileged tokens, and server-only environment variables MUST NEVER be
exposed to Client Components. Sensitive business operations MUST execute server-side. Follow
least-privilege principles. Multi-tenant authorization or tenant-isolation logic MUST NOT be
introduced.

### 10. Component and Code Quality

Prefer simple, readable, maintainable implementations over clever abstractions. Components
SHOULD have focused responsibilities. Reuse existing components, hooks, schemas, utilities, and
patterns before creating new ones; do not duplicate existing functionality. Do not introduce
abstractions without a clear use case, and do not perform unrelated refactoring while
implementing a feature. Preserve existing behavior unless the specification explicitly changes
it. Follow established naming and folder conventions, and inspect relevant existing code before
implementing changes.

### 11. Dependency Discipline

Do not install a new npm package when Next.js, React, browser APIs, Tailwind, shadcn/ui, Prisma,
Zod, Clerk, or existing dependencies can reasonably solve the problem. Every new dependency MUST
provide meaningful value. Use pnpm exclusively for dependencies and project scripts.

### 12. User Experience States

Data-driven and interactive interfaces MUST provide applicable loading states, empty states,
validation states, error states, and success feedback. Avoid ambiguous blank interfaces and
silent failures. Error messages SHOULD be useful without exposing sensitive implementation
details.

### 13. Accessibility

Accessibility is a baseline requirement. Use semantic HTML whenever possible. Interactive
elements MUST be keyboard accessible. Forms MUST have meaningful labels. Preserve visible focus
states and appropriate focus behavior. Use ARIA only when semantic HTML is insufficient.
Maintain sufficient visual contrast. Accessibility MUST NOT be sacrificed solely to reproduce a
design screenshot.

### 14. Testing Strategy

Use a lightweight, risk-based testing strategy. Automated tests are primarily required for
important business logic, calculations, authorization rules, validation rules, and other
behavior where regression would have meaningful impact. Do not require arbitrary code coverage
percentages. Simple presentation components do not require tests unless they contain meaningful
behavior. Favor valuable tests over large quantities of low-value tests.

### 15. Quality Gates

Before implementation is considered complete, the project MUST pass linting, TypeScript type
checking, applicable automated tests, and a production build, using the project's pnpm scripts.
Known lint, type, test, or build errors caused by an implementation MUST be resolved before that
implementation is considered complete.

### 16. AI Agent and Development Discipline

Before making changes, coding agents MUST inspect relevant existing code, established project
conventions, and applicable `docs/ui/` screenshots. Agents MUST follow the specification and
implementation plan, respect this constitution, make the smallest coherent change necessary,
reuse established patterns, avoid unrelated refactoring, avoid speculative infrastructure, avoid
premature abstraction, avoid duplicate components and utilities, preserve existing working
behavior, keep implementations understandable and maintainable, and avoid designing for
hypothetical multi-company or multi-tenant requirements. Follow YAGNI: do not build architecture
for future requirements that do not currently exist. When multiple valid approaches exist,
prefer the simplest solution consistent with this constitution and the current feature
specification. Feature requirements belong in `/speckit.specify`; feature-specific
implementation decisions belong in `/speckit.plan`.

## Governance

This constitution is the authoritative source for project-wide engineering principles. All
specifications, plans, tasks, reviews, and implementations MUST comply with it. Conflicts with
the constitution MUST be identified and resolved rather than silently bypassed.

Changes to these principles MUST be deliberate and made through `/speckit.constitution`, not
implicitly during feature implementation. Amendments follow semantic versioning: MAJOR for
backward-incompatible principle removals or redefinitions, MINOR for new principles or
materially expanded guidance, PATCH for clarifications and non-semantic wording fixes. Every
amendment updates the Sync Impact Report at the top of this file and the version/date line
below.

**Version**: 1.0.0 | **Ratified**: 2026-09-04 | **Last Amended**: 2026-09-04
