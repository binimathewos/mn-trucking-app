# Implementation Plan: Driver Management

**Branch**: `005-driver-management` | **Date**: 2026-09-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-driver-management/spec.md`

## Summary

Administrators get a `/drivers` page (real data, replacing the current placeholder) showing
roster statistics and a filterable/searchable driver directory, plus the ability to add a driver
(direct Clerk account creation + linked local `Driver` profile), edit a driver's profile and
truck assignment, and deactivate/reactivate a driver. Access is enforced server-side for the page
and every mutation. The approach extends the existing `Driver`/`User` Prisma models (adding
`status`, `phone`, and making `truckNumber` optional) rather than introducing new entities,
treats Clerk as the source of truth for account identity/duplicate-email/last-sign-in, and uses a
single swappable "provision account" boundary so the dev-only direct-password creation flow can
later be replaced by an invitation flow without touching the data model or UI.

## Technical Context

**Language/Version**: TypeScript 5 (strict mode), Next.js 16.3.4 App Router, React 19.2.8

**Primary Dependencies**: `@clerk/nextjs` (server `clerkClient` backend API for user
creation/ban/unban and `getSessionAccess`/`resolveAdminOnlyAccess` for authz), Prisma 7 +
`@prisma/adapter-pg` (PostgreSQL), Zod 4 (server-side validation), shadcn/ui + Tailwind CSS 4 +
Lucide icons (UI, per `docs/ui/drivers.png` and `docs/ui/add-driver.png`)

**Storage**: PostgreSQL via Prisma (`User`, `Driver` models extended in place; no new tables)

**Testing**: Vitest — unit tests for the truck-uniqueness/status business rules and the
provisioning rollback logic (this repo's "risk-based" testing principle: cover business rules and
authorization, not presentation components)

**Target Platform**: Web (Next.js server + browser), desktop-first, responsive to tablet/mobile

**Project Type**: Single Next.js web application (no separate frontend/backend split)

**Performance Goals**: No feature-specific targets beyond normal SaaS admin-page responsiveness;
directory reads are a single roster (tens, not thousands, of drivers) so no pagination/virtualization
is required

**Constraints**: All authorization server-side and independent of UI hiding (constitution §9);
temporary password never persisted or logged (FR-032); no orphaned Clerk account or local profile
on partial failure (FR-017); account-creation method must be swappable without a data-model or
UI redesign (FR-033); UI must closely match `docs/ui/drivers.png` / `docs/ui/add-driver.png`
(constitution §4) with the one intentional addition of a required temporary-password field (see
research.md #1)

**Scale/Scope**: One trucking company's roster (dozens of drivers, not an open-ended multi-tenant
scale); 1 route, ~5 Server Actions, 2 dialogs, 1 directory table with 3 summary cards

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design — see "Post-Design
Re-check" below.*

| Principle | Assessment |
|---|---|
| 1. Technology Foundation | Uses only the mandated stack; no new dependency needed (Clerk backend API already ships inside `@clerk/nextjs`). PASS |
| 2. Next.js Architecture | Directory/statistics render in a Server Component; only the dialogs, table filters, and row-actions menu are Client Components; all mutations are Server Actions. PASS |
| 3. Feature-Oriented Architecture | New code lives under `src/features/drivers/` (actions/components/data/lib/types), mirroring the existing `src/features/timesheets/` structure. PASS |
| 4. UI Design System | Reference screenshots inspected (see below); layout/spacing/typography reproduced; shadcn/ui + Lucide only. One documented, spec-mandated deviation (temporary-password field, not in the mockup) — see research.md #1. PASS with documented deviation |
| 5. Responsive Design | Directory table and dialogs reuse the existing shell's responsive patterns (already responsive per FR-027's sibling features). PASS |
| 6. TypeScript Standards | Strict mode; no `any`; Zod schemas define the validation/domain boundary types. PASS |
| 7. Data and Persistence | Extends existing models instead of duplicating; "last activity" is deliberately NOT persisted locally — derived from Clerk's `lastSignInAt` at read time (avoids storing data that would drift, per §7). No tenant abstractions introduced. PASS |
| 8. Validation and Data Integrity | All mutation inputs validated with Zod server-side (Server Actions only, no client-trusted state); truck-uniqueness and role-elevation-prevention are enforced server-side. PASS |
| 9. Authentication, Authorization, and Security | `resolveAdminOnlyAccess` re-checked in the route layout (existing) and independently inside every Server Action (existing `assertAdminAccess` pattern from timesheets, reused). Temporary password never touches the database. PASS |
| 10. Component and Code Quality | Reuses `Driver.roleType` for "driver class" instead of adding a duplicate field; reuses the existing repository/actions/types split. PASS |
| 11. Dependency Discipline | No new package added. PASS |
| 12. User Experience States | Loading (`loading.tsx`/Suspense), empty, no-results, error (`error.tsx`), and success-toast states specified in FR-010/FR-011. PASS |
| 13. Accessibility | Dialog forms use labeled shadcn form fields; row-actions menu is a keyboard-accessible shadcn dropdown. PASS |
| 14. Testing Strategy | Unit tests target business rules (truck uniqueness, status transitions, provisioning rollback), not presentation components. PASS |
| 15. Quality Gates | Plan assumes `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` all pass before completion (enforced at `/speckit-implement` / `/speckit-tasks` time, not this command). N/A to plan phase |
| 16. AI Agent Discipline | This plan reuses `getSessionAccess`, `resolveAdminOnlyAccess`, the timesheets action/repository pattern, and the existing `Driver`/`User` models rather than introducing parallel infrastructure. PASS |

No violations requiring justification — Complexity Tracking is empty.

## Project Structure

### Documentation (this feature)

```text
specs/005-driver-management/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output
├── data-model.md         # Phase 1 output
├── quickstart.md         # Phase 1 output
├── contracts/             # Phase 1 output
│   └── driver-management.md
└── tasks.md              # Phase 2 output (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
prisma/
├── schema.prisma                      # Driver: +status, +phone, truckNumber → optional
└── migrations/
    └── <timestamp>_driver_management/ # ALTER TABLE + partial unique index (truck uniqueness)

src/
├── app/(admin)/(restricted)/drivers/
│   ├── page.tsx           # Server Component: fetches directory + stats, renders feature UI
│   ├── loading.tsx         # NEW: directory loading state
│   └── error.tsx            # NEW: directory error state (mirrors timesheets/error.tsx)
│
├── features/drivers/
│   ├── actions/
│   │   └── driver-actions.ts      # addDriverAction, updateDriverAction, setDriverStatusAction
│   ├── components/
│   │   ├── drivers-header.tsx      # eyebrow/title/subtitle + "Add driver" button
│   │   ├── summary-cards.tsx        # total / active today / on leave
│   │   ├── driver-directory-table.tsx
│   │   ├── driver-filters-bar.tsx    # status filter + search
│   │   ├── driver-status-badge.tsx
│   │   ├── driver-row-actions-menu.tsx  # Edit / Deactivate / Reactivate
│   │   ├── add-driver-dialog.tsx
│   │   └── edit-driver-dialog.tsx
│   ├── data/
│   │   └── driver-repository.ts    # Prisma reads/writes + Clerk lastSignInAt merge
│   ├── lib/
│   │   ├── provision-account.ts     # swappable create-Clerk-account boundary (FR-033)
│   │   └── validation.ts            # Zod schemas (add/edit/status input)
│   └── types.ts
│
└── lib/auth/                         # reused as-is: getSessionAccess, resolveAdminOnlyAccess

tests/
└── features/drivers/
    ├── validation.test.ts            # truck-uniqueness / status / Zod rule tests
    └── provision-account.test.ts     # rollback-on-partial-failure behavior (mocked Clerk client)
```

**Structure Decision**: Single Next.js application, feature-oriented under `src/features/drivers/`,
following the same actions/components/data/lib/types split already established by
`src/features/timesheets/`. The route at `src/app/(admin)/(restricted)/drivers/page.tsx` (currently
a placeholder) becomes a thin Server Component that composes the feature's components — no new
route groups or layouts are needed since `(admin)/(restricted)/layout.tsx` already enforces
administrator-only access for this path.

## Post-Design Re-check

Phase 1 design (data-model.md, contracts/, quickstart.md) did not introduce anything the table
above didn't already account for: no new entities beyond extending `Driver`/`User`, no new
dependency, no new route group, and the account-provisioning boundary stayed a single function
rather than growing into a strategy/plugin abstraction. Constitution Check still PASSES with the
one documented UI deviation (temporary-password field).

## Complexity Tracking

*No violations — table intentionally empty.*
