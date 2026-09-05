# Implementation Plan: Administrator Dashboard

**Branch**: `001-admin-dashboard` | **Date**: 2026-09-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-admin-dashboard/spec.md`

## Summary

Build the Administrator application shell (dark sidebar, top navigation, user profile
presentation) and the Administrator dashboard landing page: a personalized header, three
operational summary cards (Active Drivers, Hours This Week, In Inventory), and a Container
Inventory preview with search, a Check In entry point, row actions, and a link to the full
inventory. The dashboard route is restricted to authenticated Administrators (Clerk); Drivers
and unauthenticated visitors are redirected away before the page ever renders. All data is
realistic mock data shaped to match the future persisted models, matching
`docs/ui/dashboard.png` as the visual source of truth, and fully responsive down to mobile.

## Technical Context

**Language/Version**: TypeScript 5.x, strict mode (Next.js 16 / React 19 runtime, Node.js LTS)

**Primary Dependencies**: Next.js (App Router), React, Tailwind CSS v4, shadcn/ui, Lucide icons,
`@clerk/nextjs` (route protection and identity), Zod (present at the project's server
boundaries; not exercised by a new server mutation in this feature since it has no persisted
writes)

**Storage**: N/A for this feature — dashboard data is realistic in-memory mock data shaped to
match the future persisted models (see data-model.md); PostgreSQL/Prisma are not introduced
until a feature that actually persists Driver, Timesheet, Customer, or Container data

**Testing**: Vitest (new dev dependency) for unit tests of the feature's pure business logic —
storage-duration derivation, time-of-day greeting selection, and role-based route redirect
target resolution — per the constitution's risk-based testing strategy

**Target Platform**: Web browsers (desktop-first, responsive to tablet and mobile), served by
the Next.js application

**Project Type**: Web application — single Next.js project (App Router), not a separate
frontend/backend split

**Performance Goals**: Dashboard content (shell, header, summary cards, inventory preview)
visible without additional user action once the route resolves, consistent with SC-001 (data
readable within 5 seconds of load)

**Constraints**: No tenant/organization abstractions (single-company app); Administrator-only
route MUST be enforced server-side, not just hidden in the UI; mock data MUST be structured so a
later swap to real data sources requires no dashboard redesign

**Scale/Scope**: Single trucking company; a small number of Administrator and Driver accounts;
one feature route (`/dashboard`) plus placeholder routes for the other five sidebar sections

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|---|---|---|
| 1. Technology Foundation | Next.js App Router, React, TS strict, `src/`, pnpm, Tailwind, shadcn/ui, Lucide, Clerk, Zod | **Pass** — all used except Prisma/PostgreSQL, which this feature has no persistence need for (explicitly mock-data, per spec) |
| 2. Next.js Architecture | Server Components default; `"use client"` minimized; no server-only logic in client code | **Pass** — shell/layout/page are Server Components; only the search input, dropdown/row-action menus, and sidebar active-state need client interactivity |
| 3. Feature-Oriented Architecture | Feature code co-located; shared code only where genuinely reused | **Pass** — dashboard-specific UI/data under a `dashboard` feature; the app shell (sidebar/top nav) lives in a shared location because every future Administrator page reuses it |
| 4. UI Design System | Reproduce `docs/ui/dashboard.png`; reuse shadcn/ui; Lucide icons only | **Pass** — screenshot inspected and used as the layout/spacing/typography/status-badge source of truth |
| 5. Responsive Design | Usable at tablet/mobile, not just shrunk | **Pass** — FR-020, SC-004, and edge cases cover sidebar/table/card adaptation |
| 6. TypeScript Standards | Strict mode; no unjustified `any` | **Pass** — strict already enabled in `tsconfig.json`; feature introduces typed mock data and derivation utilities |
| 7. Data and Persistence | No tenant IDs/org-scoping; DB access server-side only | **Pass** — no persistence in this feature; no tenant concepts introduced |
| 8. Validation and Data Integrity | Untrusted input validated server-side with Zod | **N/A this feature** — no server mutation exists yet (search is client-side filtering of mock data, Check In is a UI entry point with no submission); revisit when a real write is added |
| 9. Authentication, Authorization, Security | Authn/authz separate; server-enforced role checks; no secrets in client code | **Pass** — Clerk session read server-side (middleware + layout check) determines redirect vs. render, satisfying FR-022/SC-007 |
| 10. Component and Code Quality | Reuse over duplication; no unrelated refactors | **Pass** — reuses shadcn/ui primitives; no existing dashboard code to duplicate |
| 11. Dependency Discipline | New deps only for meaningful value; pnpm only | **Pass** — `@clerk/nextjs` (required for FR-022), shadcn/ui + Lucide (constitution-mandated UI system), Vitest (constitution-mandated testing for auth/calculation logic) are each justified; no redundant packages added |
| 12. User Experience States | Loading/empty/error/validation/success states present | **Pass** — edge cases specify zero-value cards, empty inventory, no-search-results states |
| 13. Accessibility | Semantic HTML, keyboard access, labels, focus, contrast | **Pass** — FR-021/SC-006 require full keyboard operability and visible focus |
| 14. Testing Strategy | Risk-based; required for business logic/calculations/authz/validation | **Pass** — Vitest tests planned for storage-duration calculation and role-redirect logic |
| 15. Quality Gates | Lint, typecheck, tests, build must pass via pnpm scripts | **Pass** — `package.json` will gain `test`/`typecheck` scripts alongside existing `lint`/`build` |
| 16. AI Agent Discipline | Smallest coherent change; no speculative infra | **Pass** — placeholder pages are minimal stubs, not built-out features |

No violations requiring justification. Complexity Tracking table intentionally omitted.

**Post-Phase 1 re-check**: research.md, data-model.md, and contracts/ introduce no new
dependencies, persistence, or tenant concepts beyond what is listed above (Clerk, shadcn/ui,
Lucide, Vitest). The route-access and dashboard-data contracts keep authorization server-side
and derived fields uncomputed-until-read, consistent with Principles 7 and 9. Gate remains
**Pass**.

## Project Structure

### Documentation (this feature)

```text
specs/001-admin-dashboard/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── (admin)/
│   │   ├── layout.tsx            # Administrator shell: sidebar + top nav; server-side role guard
│   │   ├── dashboard/
│   │   │   └── page.tsx          # Dashboard route (Server Component)
│   │   ├── timesheets/page.tsx   # Placeholder page (out of scope feature)
│   │   ├── containers/page.tsx   # Placeholder page (out of scope feature)
│   │   ├── drivers/page.tsx      # Placeholder page (out of scope feature)
│   │   ├── reports/page.tsx      # Placeholder page (out of scope feature)
│   │   └── settings/page.tsx     # Placeholder page (out of scope feature)
│   ├── layout.tsx                # Existing root layout
│   └── page.tsx                  # Existing root page (unchanged by this feature)
├── components/
│   ├── ui/                       # shadcn/ui primitives (card, table, input, button, badge, avatar, dropdown-menu, etc.)
│   └── app-shell/                # Shared sidebar, top nav, user profile — reused by every future Administrator page
│       ├── sidebar.tsx
│       ├── top-nav.tsx
│       └── nav-items.ts
├── features/
│   └── dashboard/
│       ├── components/
│       │   ├── dashboard-header.tsx
│       │   ├── summary-cards.tsx
│       │   └── container-inventory-card.tsx
│       ├── data/
│       │   └── mock-dashboard-data.ts    # Realistic mock data matching data-model.md shapes
│       ├── lib/
│       │   ├── storage-duration.ts       # Pure function: derive days from received/checked-out dates
│       │   └── greeting.ts               # Pure function: time-of-day greeting text
│       └── types.ts                      # OperationalSummary, ContainerInventoryRecord, etc.
└── lib/
    └── auth/
        └── route-access.ts                # Pure function: role → redirect target (used by layout guard)

tests/
└── unit/
    ├── storage-duration.test.ts
    ├── greeting.test.ts
    └── route-access.test.ts
```

**Structure Decision**: Single Next.js App Router project under `src/`. The Administrator shell
lives in `src/app/(admin)/layout.tsx` plus shared components in `src/components/app-shell/`
because every future Administrator page (Timesheets, Containers, Drivers, Reports, Settings)
reuses the same sidebar/top-nav/profile chrome. Dashboard-specific UI, mock data, and derivation
logic stay feature-scoped under `src/features/dashboard/` per the constitution's
feature-oriented architecture. Pure logic (date math, greeting, redirect targeting) is
extracted into small functions so it is unit-testable without rendering React, keeping the test
suite lightweight per the risk-based testing strategy.
